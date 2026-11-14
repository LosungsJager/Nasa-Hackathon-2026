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

async function fetchSoilProfile(lat: number, lng: number): Promise<LocalSoilProfile> {
  const localProfile = resolveLocalSoil(lat, lng);
  if (localProfile.countryCode !== 'GLOBAL') {
    return localProfile;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5500);
  try {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lng.toFixed(
      4
    )}&lat=${lat.toFixed(
      4
    )}&property=clay&property=sand&property=soc&depth=0-5cm&depth=15-30cm&value=mean`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`SoilGrids HTTP ${res.status}`);

    const json = (await res.json()) as {
      properties?: {
        layers?: {
          name: string;
          depths?: { values?: { mean?: number | null } }[];
        }[];
      };
    };

    const layers = json.properties?.layers ?? [];
    const getLayerMean = (name: string): number | null => {
      const layer = layers.find((l) => l.name === name);
      if (!layer?.depths?.length) return null;
      const vals = layer.depths
        .map((d) => d.values?.mean)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const clayRaw = getLayerMean('clay');
    const sandRaw = getLayerMean('sand');
    const socRaw = getLayerMean('soc');
    if (clayRaw === null || sandRaw === null) {
      throw new Error('Empty SoilGrids pixel');
    }

    const clayPct = Math.round(clamp(clayRaw / 10, 2, 85));
    const sandPct = Math.round(clamp(sandRaw / 10, 2, 95));
    const organicMatterPct =
      socRaw !== null
        ? Number(clamp((socRaw / 10) * 0.1724, 0.5, 10).toFixed(1))
        : localProfile.organicMatterPct;

    const awcMm = Math.round(
      clamp(55 + clayPct * 1.1 + organicMatterPct * 7 - sandPct * 0.35, 45, 175)
    );
    const textureLabel =
      clayPct >= 40
        ? `Argilosa (${clayPct}% argila)`
        : sandPct >= 65
          ? `Arenosa (${sandPct}% areia, ${clayPct}% argila)`
          : `Franco-argilo-arenosa (${clayPct}% argila)`;

    return {
      ...localProfile,
      confidenceLevel: 'Média',
      dataSourceLabel: 'ISRIC SoilGrids 250m (API ao vivo)',
      soilClass:
        clayPct >= 40
          ? 'Latossolo / Argissolo (SoilGrids)'
          : sandPct >= 65
            ? 'Neossolo / Solo Arenoso (SoilGrids)'
            : 'Cambissolo / Franco (SoilGrids)',
      texture: textureLabel,
      organicMatterPct,
      waterRetentionCapacity: awcMm >= 120 ? 'Alta' : awcMm >= 85 ? 'Média' : 'Baixa',
      availableWaterCapacityMm: awcMm,
      erosionSusceptibility: sandPct >= 60 ? 'Alta' : clayPct >= 45 ? 'Moderada' : 'Baixa',
      notes: 'Propriedades físicas extraídas via SoilGrids v2.0 (0–30 cm). Recomenda-se análise local.',
    };
  } catch {
    clearTimeout(timeoutId);
    return {
      ...localProfile,
      dataSourceLabel: 'Estimativa global por latitude (SoilGrids sem cobertura)',
    };
  }
}

async function fetchPolygonSlope(
  bbox: [number, number, number, number],
  centLat: number,
  centLng: number
): Promise<{ meanElevationM?: number; slopePct?: number }> {
  const [w, s, e, n] = bbox;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);
  try {
    const lats = [centLat, s, s, n, n].map((v) => v.toFixed(4)).join(',');
    const lngs = [centLng, w, e, w, e].map((v) => v.toFixed(4)).join(',');
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error('Elevation HTTP error');

    const json = (await res.json()) as { elevation?: number[] };
    const elevs = (json.elevation ?? []).filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (elevs.length < 2) return {};

    const minE = Math.min(...elevs);
    const maxE = Math.max(...elevs);
    const meanElevationM = Math.round(elevs.reduce((a, b) => a + b, 0) / elevs.length);
    const diagKm = Math.max(
      0.3,
      turf.distance(turf.point([w, s]), turf.point([e, n]), { units: 'kilometers' })
    );
    const slopePct = Number(clamp(((maxE - minE) / (diagKm * 1000)) * 100, 0.2, 35).toFixed(1));
    return { meanElevationM, slopePct };
  } catch {
    clearTimeout(timeoutId);
    return {};
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

  const [powerRes, soil, demRes, smapL4Cmr, smapL3Cmr, ecoCmr, srtmCmr] = await Promise.all([
    fetchNasaPowerDaily(centLat, centLng),
    fetchSoilProfile(centLat, centLng),
    fetchPolygonSlope(bbox, centLat, centLng),
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

  // Real growing-season water deficit computed directly from POWER daily records
  const bySeasonYear = new Map<number, { et0: number; rain: number; count: number }>();
  for (const d of days) {
    const inSeason = centLat < 0 ? d.month >= 10 || d.month <= 3 : d.month >= 4 && d.month <= 9;
    if (!inSeason) continue;
    const cur = bySeasonYear.get(d.year) ?? { et0: 0, rain: 0, count: 0 };
    if (cur.count < 120) {
      cur.et0 += d.et0Mm;
      cur.rain += d.precipMm;
      cur.count += 1;
      bySeasonYear.set(d.year, cur);
    }
  }
  const validSeasons = Array.from(bySeasonYear.values()).filter((s) => s.count >= 60);
  const seasonalWaterDeficitMm =
    validSeasons.length > 0
      ? Math.max(
          0,
          Math.round(
            validSeasons.reduce((acc, s) => acc + (s.et0 - s.rain), 0) / validSeasons.length
          )
        )
      : Math.max(0, Math.round(meanEt0MmDay * 120 - annualMeanPrecipMm * 0.42));

  const soilErosionBase =
    soil.erosionSusceptibility === 'Alta' ? 30 : soil.erosionSusceptibility === 'Moderada' ? 18 : 10;
  const slopeFactor = demRes.slopePct !== undefined ? clamp(demRes.slopePct * 2.1, 1, 28) : 8;
  const estimatedErosionIndex = Math.round(
    clamp(soilErosionBase + slopeFactor + extremeRainDaysPerYear * 2.0 + annualMeanPrecipMm / 95, 10, 95)
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
    meanElevationM: demRes.meanElevationM,
    slopePct: demRes.slopePct,
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
