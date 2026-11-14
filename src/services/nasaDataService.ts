import * as turf from '@turf/turf';
import type {
  CmrGranuleSummary,
  DailyClimateDay,
  FarmAnalysis,
  FieldIndicators,
  LocalSoilProfile,
} from '../types/agro';
import { resolveLocalSoil } from '../data/localAgroData';

interface PowerDailyResponse {
  properties?: {
    parameter?: {
      T2M?: Record<string, number>;
      T2M_MIN?: Record<string, number>;
      T2M_MAX?: Record<string, number>;
      RH2M?: Record<string, number>;
      WS2M?: Record<string, number>;
      PRECTOTCORR?: Record<string, number>;
      ALLSKY_SFC_SW_DWN?: Record<string, number>;
    };
  };
}

interface CmrSearchResponse {
  feed?: {
    entry?: { time_start?: string }[];
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function estimateDailyEt0(t2m: number, tMin: number, tMax: number, solarMjM2Day: number): number {
  const rad = solarMjM2Day > 0 && solarMjM2Day < 45 ? solarMjM2Day : 16.5;
  const dT = Math.max(2, tMax - tMin);
  const et0 = 0.0023 * (t2m + 17.8) * Math.sqrt(dT) * (rad * 0.408) * 0.48;
  return Number(clamp(et0, 0.8, 9.5).toFixed(2));
}

async function fetchNasaPowerDaily(
  lat: number,
  lng: number
): Promise<{ source: 'live-daily' | 'offline-fallback'; days: DailyClimateDay[] }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9500);

  try {
    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M&community=AG&longitude=${lng.toFixed(
      4
    )}&latitude=${lat.toFixed(4)}&start=20050101&end=20241231&format=JSON`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);

    const json: PowerDailyResponse = await res.json();
    const p = json.properties?.parameter;
    if (!p?.T2M || !p?.PRECTOTCORR) throw new Error('Missing POWER daily parameters');

    const days: DailyClimateDay[] = [];
    for (const date of Object.keys(p.T2M)) {
      const t2m = p.T2M[date];
      const tMin = p.T2M_MIN?.[date] ?? t2m - 4;
      const tMax = p.T2M_MAX?.[date] ?? t2m + 5;
      const rh2m = p.RH2M?.[date] ?? 70;
      const ws2m = p.WS2M?.[date] ?? 2.2;
      const precip = p.PRECTOTCORR[date];
      const solar = p.ALLSKY_SFC_SW_DWN?.[date] ?? 16.5;

      if (t2m < -80 || precip < 0) continue;

      const safeMin = tMin > -80 ? tMin : t2m - 4;
      const safeMax = tMax > -80 ? tMax : t2m + 5;
      const year = Number(date.slice(0, 4));
      const month = Number(date.slice(4, 6));

      days.push({
        date,
        year,
        month,
        t2m,
        t2mMin: safeMin,
        t2mMax: safeMax,
        rh2m: rh2m > 0 && rh2m <= 100 ? rh2m : 70,
        ws2m: ws2m >= 0 && ws2m < 40 ? ws2m : 2.2,
        precipMm: precip,
        et0Mm: estimateDailyEt0(t2m, safeMin, safeMax, solar),
      });
    }

    if (days.length < 365) throw new Error('Insufficient POWER daily records');
    return { source: 'live-daily', days };
  } catch {
    clearTimeout(timeoutId);
    const absLat = Math.abs(lat);
    const baseTemp = clamp(28 - absLat * 0.32, 11, 28);
    const baseRainPerDay = absLat < 15 ? 4.8 : absLat > 35 ? 2.4 : 4.2;
    const days: DailyClimateDay[] = [];

    for (let y = 2005; y <= 2024; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= 28; d++) {
          const seasonal = Math.sin(((m - 1) / 12) * Math.PI * 2) * (lat < 0 ? 4.5 : -4.5);
          const t2m = Number((baseTemp + seasonal).toFixed(1));
          const tMin = Number((t2m - 5.5).toFixed(1));
          const tMax = Number((t2m + 6.0).toFixed(1));
          const precipMm = d % 4 === 0 ? Number((baseRainPerDay * 3.8).toFixed(1)) : 0;
          days.push({
            date: `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`,
            year: y,
            month: m,
            t2m,
            t2mMin: tMin,
            t2mMax: tMax,
            rh2m: 72,
            ws2m: 2.1,
            precipMm,
            et0Mm: estimateDailyEt0(t2m, tMin, tMax, 16),
          });
        }
      }
    }
    return { source: 'offline-fallback', days };
  }
}

async function queryCmrGranule(
  dataset: string,
  shortName: string,
  bbox: [number, number, number, number]
): Promise<CmrGranuleSummary> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);
  try {
    const [w, s, e, n] = bbox;
    const url = `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${shortName}&bounding_box=${w.toFixed(
      3
    )},${s.toFixed(3)},${e.toFixed(3)},${n.toFixed(3)}&page_size=5&sort_key=-start_date`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('CMR error');
    const totalHits = Number(res.headers.get('CMR-Hits') ?? '0');
    const data: CmrSearchResponse = await res.json();
    const latest = data.feed?.entry?.[0]?.time_start?.slice(0, 10) ?? null;
    return {
      dataset,
      shortName,
      granuleCount: totalHits || (data.feed?.entry?.length ?? 0),
      latestDate: latest,
      status: 'ok',
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      dataset,
      shortName,
      granuleCount: 0,
      latestDate: null,
      status: 'offline',
    };
  }
}

export async function analyzeFarmPolygon(
  latLngCoords: [number, number][]
): Promise<FarmAnalysis> {
  const ring = latLngCoords.map(([lat, lng]) => [lng, lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }

  const polygonGeoJson = turf.polygon([ring]);
  const areaM2 = turf.area(polygonGeoJson);
  const areaHa = Math.max(1, Math.round(areaM2 / 10000));
  const centroidFeat = turf.centroid(polygonGeoJson);
  const [centLng, centLat] = centroidFeat.geometry.coordinates;
  const bbox = turf.bbox(polygonGeoJson) as [number, number, number, number];

  const [powerRes, soil, smapL4Cmr, smapL3Cmr, ecoCmr, srtmCmr] = await Promise.all([
    fetchNasaPowerDaily(centLat, centLng),
    Promise.resolve<LocalSoilProfile>(resolveLocalSoil(centLat, centLng)),
    queryCmrGranule('SMAP L4 Zona Radicular', 'SPL4SMGP', bbox),
    queryCmrGranule('SMAP L3 Superficial 9km', 'SPL3SMP_E', bbox),
    queryCmrGranule('ECOSTRESS LST 70m', 'ECO_L2T_LSTE', bbox),
    queryCmrGranule('SRTM Elevação 30m', 'SRTMGL1', bbox),
  ]);

  const days = powerRes.days;
  const yearsCount = Math.max(1, new Set(days.map((d) => d.year)).size);

  const totalTemp = days.reduce((s, d) => s + d.t2m, 0);
  const totalRh = days.reduce((s, d) => s + d.rh2m, 0);
  const totalPrecip = days.reduce((s, d) => s + d.precipMm, 0);
  const totalEt0 = days.reduce((s, d) => s + d.et0Mm, 0);

  const annualAvgTempC = Number((totalTemp / days.length).toFixed(1));
  const meanRh2mPct = Math.round(totalRh / days.length);
  const annualMeanPrecipMm = Math.round(totalPrecip / yearsCount);
  const meanEt0MmDay = Number((totalEt0 / days.length).toFixed(2));

  const frostDaysPerYear = Number(
    (days.filter((d) => d.t2mMin <= 2.0).length / yearsCount).toFixed(1)
  );
  const heatStressDaysPerYear = Number(
    (days.filter((d) => d.t2mMax >= 32.0).length / yearsCount).toFixed(1)
  );

  const rainyDays = days.filter((d) => d.precipMm > 1).map((d) => d.precipMm).sort((a, b) => a - b);
  const p95Threshold = rainyDays.length > 0 ? rainyDays[Math.floor(rainyDays.length * 0.95)] : 35;
  const extremeRainDaysPerYear = Number(
    (days.filter((d) => d.precipMm >= p95Threshold).length / yearsCount).toFixed(1)
  );

  const seasonEt0 = meanEt0MmDay * 120;
  const seasonPrecip = annualMeanPrecipMm * 0.42;
  const seasonalWaterDeficitMm = Math.max(0, Math.round(seasonEt0 - seasonPrecip));

  const soilErosionBase =
    soil.erosionSusceptibility === 'Alta' ? 35 : soil.erosionSusceptibility === 'Moderada' ? 20 : 10;
  const estimatedErosionIndex = Math.round(
    clamp(soilErosionBase + extremeRainDaysPerYear * 2.2 + annualMeanPrecipMm / 85, 10, 92)
  );

  const indicators: FieldIndicators = {
    powerSource: powerRes.source,
    powerPeriod: '2005–2024 (série diária)',
    annualAvgTempC,
    annualMeanPrecipMm,
    meanRh2mPct,
    meanEt0MmDay,
    frostDaysPerYear,
    heatStressDaysPerYear,
    extremeRainDaysPerYear,
    seasonalWaterDeficitMm,
    estimatedErosionIndex,
    erosionLevel:
      estimatedErosionIndex >= 60 ? 'Alto' : estimatedErosionIndex >= 35 ? 'Moderado' : 'Baixo',
    cmrGranules: [smapL4Cmr, smapL3Cmr, ecoCmr, srtmCmr],
  };

  return {
    polygonGeoJson,
    areaHa,
    centroid: [centLat, centLng],
    dailyClimate: days,
    indicators,
    soil,
    analyzedAt: new Date().toLocaleString('pt-BR'),
  };
}
