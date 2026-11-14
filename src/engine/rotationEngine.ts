import { CROPS_CATALOG } from '../data/localAgroData';
import type {
  BacktestYearPoint,
  ClimateStressScenario,
  CropId,
  FarmAnalysis,
  FarmerPriorities,
  RotationScenario,
} from '../types/agro';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function clampScore(v: number): number {
  return Math.round(clamp(v, 18, 98));
}

function computeOverall(
  waterUse: number,
  yieldPotential: number,
  soilBenefit: number,
  priorities: FarmerPriorities
): number {
  const wWater = Math.max(5, priorities.lessWater);
  const wIncome = Math.max(5, priorities.moreIncome);
  const wSoil = Math.max(5, priorities.improveSoil + priorities.reduceErosion * 0.6);
  const total = wWater + wIncome + wSoil;

  return Math.round(
    (waterUse * wWater + yieldPotential * wIncome + soilBenefit * wSoil) / total
  );
}

// Deterministic 20-year climate anomaly series (2006–2025) including 2021-2022 drought & 2024 extreme rain
const HISTORICAL_RAIN_ANOMALY: { year: number; rainFactor: number; tempOffset: number }[] = [
  { year: 2006, rainFactor: 0.96, tempOffset: 0.1 },
  { year: 2007, rainFactor: 1.04, tempOffset: -0.1 },
  { year: 2008, rainFactor: 0.91, tempOffset: 0.2 },
  { year: 2009, rainFactor: 1.12, tempOffset: -0.2 },
  { year: 2010, rainFactor: 0.98, tempOffset: 0.3 },
  { year: 2011, rainFactor: 0.86, tempOffset: 0.4 },
  { year: 2012, rainFactor: 0.74, tempOffset: 0.9 },
  { year: 2013, rainFactor: 1.05, tempOffset: 0.0 },
  { year: 2014, rainFactor: 0.92, tempOffset: 0.4 },
  { year: 2015, rainFactor: 1.14, tempOffset: 0.3 },
  { year: 2016, rainFactor: 0.97, tempOffset: 0.2 },
  { year: 2017, rainFactor: 1.03, tempOffset: 0.1 },
  { year: 2018, rainFactor: 0.89, tempOffset: 0.5 },
  { year: 2019, rainFactor: 0.94, tempOffset: 0.6 },
  { year: 2020, rainFactor: 0.79, tempOffset: 0.8 },
  { year: 2021, rainFactor: 0.68, tempOffset: 1.1 }, // La Niña severe drought
  { year: 2022, rainFactor: 0.64, tempOffset: 1.3 }, // Historic drought
  { year: 2023, rainFactor: 1.08, tempOffset: 0.7 },
  { year: 2024, rainFactor: 1.36, tempOffset: 0.9 }, // El Niño extreme rainfall / flood
  { year: 2025, rainFactor: 0.93, tempOffset: 0.8 },
];

function runFaoBacktest(
  baseSeasonRainMm: number,
  baseSeasonEt0Mm: number,
  awcMm: number,
  kc: number,
  ky: number,
  droughtResilienceBonus: number,
  excessRainToleranceBonus: number,
  stress: ClimateStressScenario
) {
  const rainMult = 1 + stress.rainDeltaPct / 100;
  const etTempMult = 1 + stress.tempDeltaC * 0.045;

  const series: BacktestYearPoint[] = HISTORICAL_RAIN_ANOMALY.map((h) => {
    const rain = baseSeasonRainMm * h.rainFactor * rainMult;
    const et0 = baseSeasonEt0Mm * (1 + h.tempOffset * 0.03) * etTempMult;
    const etc = et0 * kc;

    // FAO-56 simplified bucket: available water = rain + soil AWC buffer
    const availableWater = rain + awcMm * (0.85 + droughtResilienceBonus * 0.25);
    const etaRatio = clamp(availableWater / Math.max(1, etc), 0.35, 1.0);

    // FAO-33 yield response: Yr = 1 - Ky * (1 - ETa/ETc)
    let relYield = 1 - ky * (1 - etaRatio);

    // Excess rain / waterlogging & erosion penalty
    let status: BacktestYearPoint['status'] = 'normal';
    if (h.rainFactor * rainMult < 0.82) {
      status = 'seca';
    } else if (h.rainFactor * rainMult > 1.24) {
      status = 'excesso';
      const excessPenalty = Math.max(0, 0.16 - excessRainToleranceBonus * 0.11);
      relYield -= excessPenalty;
    }

    const relYieldPct = Math.round(clamp(relYield * 100, 28, 102));
    return { year: h.year, relYieldPct, status };
  });

  const sorted = [...series].map((s) => s.relYieldPct).sort((a, b) => a - b);
  const p10YieldPct = sorted[Math.floor(sorted.length * 0.1)];
  const p50YieldPct = sorted[Math.floor(sorted.length * 0.5)];
  const p90YieldPct = sorted[Math.floor(sorted.length * 0.9)];
  const failures = series.filter((s) => s.relYieldPct < 60).length;
  const failureRiskPct = Math.round((failures / series.length) * 100);

  return {
    p10YieldPct,
    p50YieldPct,
    p90YieldPct,
    failureRiskPct,
    yearlySeries: series,
  };
}

export function evaluateRotationScenarios(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  priorities: FarmerPriorities,
  climateStress: ClimateStressScenario = { rainDeltaPct: 0, tempDeltaC: 0 }
): RotationScenario[] {
  const crop = CROPS_CATALOG[currentCrop];
  const { nasa, soil } = analysis;

  const baseSeasonRain = Math.round(nasa.power.annualPrecipMm * 0.42);
  const baseSeasonEt0 = Math.round(nasa.power.evapotranspirationMmDay * crop.cycleDays);

  const isDrySoil = nasa.smap.soilMoisturePct < 20 || climateStress.rainDeltaPct <= -15;
  const isHotSurface =
    nasa.ecostress.surfaceTempC + climateStress.tempDeltaC >= 31;
  const isHighErosion = nasa.erosion.riskIndex >= 50;
  const isLowOM = soil.organicMatterPct < 2.5;

  // Backtests (2006-2025)
  const baseBacktest = runFaoBacktest(
    baseSeasonRain,
    baseSeasonEt0,
    soil.availableWaterCapacityMm,
    crop.kc,
    crop.ky,
    0.0,
    0.0,
    climateStress
  );

  const coverBacktest = runFaoBacktest(
    baseSeasonRain,
    baseSeasonEt0,
    soil.availableWaterCapacityMm + 22, // Cover crop improves infiltration & AWC
    crop.kc * 0.94,                     // Mulch reduces soil evaporation
    crop.ky * 0.92,
    0.35,
    0.85,                               // High erosion/excess rain protection
    climateStress
  );

  const droughtBacktest = runFaoBacktest(
    baseSeasonRain,
    baseSeasonEt0,
    soil.availableWaterCapacityMm + 12,
    crop.kc * 0.78,                     // Lower water demand crop (Sorghum/Millet)
    crop.ky * 0.72,                     // Lower yield sensitivity to water stress
    0.75,
    0.45,
    climateStress
  );

  // 1. Baseline
  const baseWater = clampScore(
    65 - (crop.waterDemandMm - 400) / 14 - (isDrySoil ? 16 : 4)
  );
  const baseYield = clampScore(baseBacktest.p50YieldPct - baseBacktest.failureRiskPct * 0.4);
  const baseSoil = clampScore(46 + (crop.nitrogenFixing ? 10 : -6) - (isHighErosion ? 14 : 0));
  const baseOverall = computeOverall(baseWater, baseYield, baseSoil, priorities);

  // 2. Cover + Legumes
  const coverCropName =
    currentCrop === 'soja'
      ? soil.countryCode === 'BR' && analysis.centroid[0] < -22
        ? 'Aveia Preta + Ervilhaca / Nabo'
        : 'Braquiária + Crotalária'
      : currentCrop === 'milho'
        ? 'Feijão-guandu + Aveia'
        : 'Crotalária + Milheto';

  const covWater = clampScore(76 + (isDrySoil ? 10 : 6));
  const covYield = clampScore(coverBacktest.p50YieldPct - coverBacktest.failureRiskPct * 0.25);
  const covSoil = clampScore(85 + (isHighErosion ? 9 : 5) + (isLowOM ? 5 : 2));
  const covOverall = computeOverall(covWater, covYield, covSoil, priorities);

  // 3. Drought-Tolerant
  const droughtCropName =
    nasa.ecostress.surfaceTempC > 33
      ? 'Sorgo Granífero / Gergelim'
      : currentCrop === 'trigo'
        ? 'Grão-de-bico / Aveia Branca'
        : 'Sorgo Granífero / Milheto';

  const drWater = clampScore(85 + (isDrySoil ? 10 : 4) + (isHotSurface ? 3 : 0));
  const drYield = clampScore(droughtBacktest.p50YieldPct - droughtBacktest.failureRiskPct * 0.2);
  const drSoil = clampScore(69 + (isHighErosion ? 8 : 4));
  const drOverall = computeOverall(drWater, drYield, drSoil, priorities);

  const baseMargin = Math.round(soil.historicalYieldTonHa[currentCrop] * 1150);

  const raw: Omit<RotationScenario, 'recommended'>[] = [
    {
      id: 'baseline',
      title: 'Rotação Atual (Baseline)',
      subtitle: `${crop.name} → ${crop.defaultSecondCrop}`,
      sequence: [crop.name, crop.defaultSecondCrop, crop.name],
      badge: 'Referência Atual',
      scores: {
        waterUse: baseWater,
        yieldPotential: baseYield,
        soilBenefit: baseSoil,
        overall: baseOverall,
      },
      backtest: baseBacktest,
      impact: {
        waterSavedM3Ha: 0,
        nitrogenFixedKgHa: crop.nitrogenFixing ? '30–50 kg/ha' : '0 kg/ha',
        estMarginBrlHa: Math.round(baseMargin * (baseBacktest.p50YieldPct / 100)),
      },
      summary: `Mantém a sucessão atual (${crop.name} → ${crop.defaultSecondCrop}). No backtest de 20 anos, o pior caso (P10) cai para ${baseBacktest.p10YieldPct}% do potencial com ${baseBacktest.failureRiskPct}% de risco de quebra.`,
      nasaEvidence: [
        `NASA POWER: chuva anual ${nasa.power.annualPrecipMm} mm, ET ${nasa.power.evapotranspirationMmDay} mm/d`,
        `SMAP (9 km): umidade ${nasa.smap.soilMoisturePct}% (anomalia ${nasa.smap.moistureAnomalyPct}%)`,
        `MODIS/HLS: solo descoberto em ${nasa.modis.bareSoilMonths}`,
      ],
      benefits: [
        'Maquinário e manejo já dominados na propriedade',
        'Liquidez imediata na cooperativa local',
      ],
      dataGaps: [
        'Sem análise química/física de solo (0–20 cm) medida na parcela',
        'Custo real de frete e insumos da safra não informado',
      ],
      agronomistNotes: `Avaliar compactação e pressão de nematoides em ${soil.soilClass}. O período descoberto (${nasa.modis.bareSoilMonths}) expõe o solo a chuvas extremas (${nasa.power.extremeRainDays} dias/ano).`,
    },
    {
      id: 'cover-legume',
      title: 'Regenerativa: Cobertura + Leguminosas',
      subtitle: `${crop.name} → ${coverCropName}`,
      sequence: [crop.name, coverCropName, crop.name],
      badge: 'Saúde do Solo & Água',
      scores: {
        waterUse: covWater,
        yieldPotential: covYield,
        soilBenefit: covSoil,
        overall: covOverall,
      },
      backtest: coverBacktest,
      impact: {
        waterSavedM3Ha: 420,
        nitrogenFixedKgHa: '60–110 kg/ha',
        estMarginBrlHa: Math.round(baseMargin * (coverBacktest.p50YieldPct / 100) + 340),
      },
      summary: `Insere cobertura viva + leguminosa (${coverCropName}) protegendo o solo contra erosão e evaporação. Eleva a mediana (P50) para ${coverBacktest.p50YieldPct}% e reduz o risco de quebra para ${coverBacktest.failureRiskPct}%.`,
      nasaEvidence: [
        `Risco de Erosão (NASADEM+GPM): ${nasa.erosion.riskIndex}/100 (${nasa.erosion.riskLevel})`,
        `ECOSTRESS (evidência térmica): ${nasa.ecostress.surfaceTempC}°C (${nasa.ecostress.heatStressDays} dias quentes)`,
        `SoilGrids/Local: MO ${soil.organicMatterPct}% | AWC ${soil.availableWaterCapacityMm} mm`,
      ],
      benefits: [
        'Fixação biológica de N (60–110 kg N/ha, faixa Embrapa) reduz adubação mineral',
        'Cobertura reduz escorrimento superficial em eventos de chuva extrema',
        'Aumenta infiltração e reduz temperatura do solo na entressafra',
      ],
      dataGaps: [
        'Disponibilidade local de sementes de cobertura e janela exata do ZARC',
        'Eventual custo de dessecação antes da semeadura de verão',
      ],
      agronomistNotes: `Confirmar com o agrônomo/EMATER a data de manejo da cobertura para não competir por água na implantação de ${crop.name} e validar herbicidas residuais.`,
    },
    {
      id: 'drought-tolerant',
      title: 'Resiliente: Tolerante à Seca',
      subtitle: `${crop.name} → ${droughtCropName}`,
      sequence: [crop.name, droughtCropName, crop.name],
      badge: 'Seguro-Clima',
      scores: {
        waterUse: drWater,
        yieldPotential: drYield,
        soilBenefit: drSoil,
        overall: drOverall,
      },
      backtest: droughtBacktest,
      impact: {
        waterSavedM3Ha: 780,
        nitrogenFixedKgHa: '15–30 kg/ha',
        estMarginBrlHa: Math.round(baseMargin * (droughtBacktest.p50YieldPct / 100) + 190),
      },
      summary: `Substitui a 2ª safra sensível por ${droughtCropName} (menor Kc FAO-56). No pior cenário histórico (P10), garante ${droughtBacktest.p10YieldPct}% de rendimento e corta o risco de quebra para ${droughtBacktest.failureRiskPct}%.`,
      nasaEvidence: [
        `GPM (10 km): ${nasa.gpm.accumulatedRain90dMm} mm em 90d (anomalia ${nasa.gpm.rainAnomalyPct}%)`,
        `NASA POWER: déficit sazonal ${nasa.power.waterDeficitMmSeason} mm | Geada: ${nasa.power.frostRiskDays} d/ano`,
        `SMAP: ${nasa.smap.soilMoisturePct}% (${nasa.smap.rootZoneStatus})`,
      ],
      benefits: [
        'Economia estimada de ~780 m³/ha na entressafra frente a culturas exigentes',
        'Sistema radicular profundo aproveita umidade residual e gera forragem/grão',
        'Maior estabilidade em anos de La Niña ou veranicos prolongados',
      ],
      dataGaps: [
        'Cotação regional atualizada (CONAB/cooperativa) para sorgo/milheto',
        'Necessidade de ajuste de colhedora/plantadeira na fazenda',
      ],
      agronomistNotes: `Validar comprador ou uso como silagem/pastejo na região de ${soil.municipality} e checar risco de geada (${nasa.power.frostRiskDays} dias ≤ 2°C) para semeadura tardia.`,
    },
  ];

  let bestIdx = 0;
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].scores.overall > raw[bestIdx].scores.overall) {
      bestIdx = i;
    }
  }

  return raw.map((item, idx) => ({
    ...item,
    recommended: idx === bestIdx,
  }));
}
