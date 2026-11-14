import type {
  BacktestYearPoint,
  ClimateStressScenario,
  CropId,
  CropInfo,
  DailyClimateDay,
  FarmAnalysis,
  FarmerConstraints,
  FarmerPriorities,
  RotationScenario,
  SensitivityResult,
} from '../types/agro';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeOverall(
  waterIndex: number,
  yieldIndex: number,
  soilIndex: number,
  priorities: FarmerPriorities
): number {
  const wWater = Math.max(5, priorities.lessWater);
  const wIncome = Math.max(5, priorities.moreIncome);
  const wSoil = Math.max(5, priorities.improveSoil + priorities.reduceErosion * 0.6);
  const total = wWater + wIncome + wSoil;
  return Math.round(
    (waterIndex * wWater + yieldIndex * wIncome + soilIndex * wSoil) / total
  );
}

function simulateDailyBucketBacktest(
  dailyClimate: DailyClimateDay[],
  lat: number,
  awcMm: number,
  kc: number,
  ky: number,
  cycleDays: number,
  excessRainTolerance: number,
  stress: ClimateStressScenario,
  hasIrrigation: boolean
) {
  const rainMult = 1 + stress.rainDeltaPct / 100;
  const etMult = 1 + stress.tempDeltaC * 0.045;

  // Group daily records by year and filter main growing season months
  const byYear = new Map<number, DailyClimateDay[]>();
  for (const d of dailyClimate) {
    // Southern hemisphere main summer-autumn window (Oct-Mar) vs Northern (Apr-Sep)
    const inSeason = lat < 0 ? d.month >= 10 || d.month <= 3 : d.month >= 4 && d.month <= 9;
    if (!inSeason) continue;
    const arr = byYear.get(d.year) ?? [];
    arr.push(d);
    byYear.set(d.year, arr);
  }

  const series: BacktestYearPoint[] = [];
  let totalEtcMm = 0;

  for (const [year, yearDays] of Array.from(byYear.entries()).sort((a, b) => a[0] - b[0])) {
    const slice = yearDays.slice(0, Math.min(yearDays.length, cycleDays));
    if (slice.length < 30) continue;

    let soilWater = awcMm * 0.65;
    let sumEtc = 0;
    let sumEta = 0;
    let sumRain = 0;
    let heavyRainDays = 0;

    for (const day of slice) {
      const rain = day.precipMm * rainMult;
      const etc = day.et0Mm * etMult * kc;
      sumRain += rain;
      sumEtc += etc;
      if (rain >= 40) heavyRainDays++;

      soilWater = Math.min(awcMm, soilWater + rain * 0.88);
      if (hasIrrigation && soilWater < awcMm * 0.35) {
        soilWater = awcMm * 0.6; // Supplemental irrigation prevents severe wilt
      }

      // FAO-56 stress coefficient Ks when soil moisture drops below 45% of AWC
      const readilyAvailable = awcMm * 0.45;
      const ks = soilWater >= readilyAvailable ? 1.0 : clamp(soilWater / readilyAvailable, 0.25, 1.0);
      const eta = Math.min(soilWater, etc * ks);
      soilWater = Math.max(0, soilWater - eta);
      sumEta += eta;
    }

    totalEtcMm += sumEtc;
    const etaRatio = clamp(sumEta / Math.max(1, sumEtc), 0.3, 1.0);
    let relYield = 1 - ky * (1 - etaRatio);

    let status: BacktestYearPoint['status'] = 'normal';
    if (sumEta / Math.max(1, sumEtc) < 0.78) {
      status = 'seca';
    } else if (heavyRainDays >= 4 || sumRain > 1100) {
      status = 'excesso';
      const penalty = Math.max(0, 0.14 - excessRainTolerance * 0.1);
      relYield -= penalty;
    }

    series.push({
      year,
      relYieldPct: Math.round(clamp(relYield * 100, 25, 100)),
      seasonRainMm: Math.round(sumRain),
      seasonEtcMm: Math.round(sumEtc),
      status,
    });
  }

  const sorted = series.map((s) => s.relYieldPct).sort((a, b) => a - b);
  const p10YieldPct = sorted[Math.floor(sorted.length * 0.1)] ?? 60;
  const p50YieldPct = sorted[Math.floor(sorted.length * 0.5)] ?? 80;
  const p90YieldPct = sorted[Math.floor(sorted.length * 0.9)] ?? 95;
  const failures = series.filter((s) => s.relYieldPct < 60).length;
  const failureRiskPct = series.length > 0 ? Math.round((failures / series.length) * 100) : 0;
  const meanSeasonEtcMm = series.length > 0 ? totalEtcMm / series.length : 450;

  return {
    p10YieldPct,
    p50YieldPct,
    p90YieldPct,
    failureRiskPct,
    meanSeasonEtcMm,
    yearlySeries: series,
  };
}

export function evaluateRotationScenarios(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  cropsCatalog: Record<CropId, CropInfo>,
  priorities: FarmerPriorities,
  constraints: FarmerConstraints,
  climateStress: ClimateStressScenario = { rainDeltaPct: 0, tempDeltaC: 0 }
): RotationScenario[] {
  const crop = cropsCatalog[currentCrop];
  const { indicators, soil, dailyClimate } = analysis;
  const lat = analysis.centroid[0];

  const baseBt = simulateDailyBucketBacktest(
    dailyClimate,
    lat,
    soil.availableWaterCapacityMm,
    crop.kc,
    crop.ky,
    crop.cycleDays,
    0.0,
    climateStress,
    constraints.hasIrrigation
  );

  const coverBt = simulateDailyBucketBacktest(
    dailyClimate,
    lat,
    soil.availableWaterCapacityMm + 20, // Cover residue improves infiltration
    crop.kc * 0.93,
    crop.ky * 0.92,
    crop.cycleDays,
    0.85,
    climateStress,
    constraints.hasIrrigation
  );

  const droughtBt = simulateDailyBucketBacktest(
    dailyClimate,
    lat,
    soil.availableWaterCapacityMm + 10,
    crop.kc * 0.78, // Lower-Kc drought-tolerant second crop
    crop.ky * 0.72,
    crop.cycleDays,
    0.45,
    climateStress,
    constraints.hasIrrigation
  );

  const forageBt = simulateDailyBucketBacktest(
    dailyClimate,
    lat,
    soil.availableWaterCapacityMm + 16,
    0.92, // Winter forage (Azevém/Aveia)
    0.8,
    120,
    0.8,
    climateStress,
    constraints.hasIrrigation
  );

  const powerTag = indicators.powerSource === 'live-daily' ? 'medido' : 'derivado';

  // Comparative 0-100 indices derived from simulated ETc, P50, failure risk, and soil erosion
  const baseWaterIdx = Math.round(clamp(100 - baseBt.meanSeasonEtcMm / 8.5, 20, 95));
  const covWaterIdx = Math.round(clamp(100 - coverBt.meanSeasonEtcMm / 8.5, 20, 95));
  const drWaterIdx = Math.round(clamp(100 - droughtBt.meanSeasonEtcMm / 8.5, 20, 95));
  const forWaterIdx = Math.round(clamp(100 - forageBt.meanSeasonEtcMm / 8.5, 20, 95));

  const baseYieldIdx = Math.round(clamp(baseBt.p50YieldPct - baseBt.failureRiskPct * 0.45, 20, 98));
  const covYieldIdx = Math.round(clamp(coverBt.p50YieldPct - coverBt.failureRiskPct * 0.3, 20, 98));
  const drYieldIdx = Math.round(clamp(droughtBt.p50YieldPct - droughtBt.failureRiskPct * 0.25, 20, 98));
  const forYieldIdx = Math.round(
    clamp(
      forageBt.p50YieldPct - forageBt.failureRiskPct * 0.25 + (constraints.hasLivestock ? 10 : -8),
      20,
      98
    )
  );

  const erosionPenalty = indicators.estimatedErosionIndex > 55 ? 12 : 4;
  const baseSoilIdx = Math.round(clamp(48 + (crop.nitrogenFixing ? 10 : -6) - erosionPenalty, 20, 95));
  const covSoilIdx = Math.round(clamp(82 + (constraints.hasNoTillPlanter ? 6 : 0), 20, 96));
  const drSoilIdx = Math.round(clamp(66 + (indicators.estimatedErosionIndex > 50 ? 6 : 0), 20, 95));
  const forSoilIdx = Math.round(clamp(80 + (constraints.hasLivestock ? 5 : 0), 20, 96));

  const refTon = soil.historicalYieldTonHa[currentCrop] ?? 3.2;
  const baseMargin = Math.round(refTon * 1100);

  // Calculated water saved (1 mm ETc = 10 m³/ha)
  const covWaterSaved = Math.max(0, Math.round((baseBt.meanSeasonEtcMm - coverBt.meanSeasonEtcMm) * 10));
  const drWaterSaved = Math.max(0, Math.round((baseBt.meanSeasonEtcMm - droughtBt.meanSeasonEtcMm) * 10));
  const forWaterSaved = Math.max(0, Math.round((baseBt.meanSeasonEtcMm - forageBt.meanSeasonEtcMm) * 10));

  const coverCropName =
    lat < -22 ? 'Aveia Preta + Ervilhaca' : 'Braquiária + Crotalária';
  const droughtCropName =
    currentCrop === 'trigo' ? 'Aveia Branca / Canola' : 'Sorgo Granífero / Milheto';
  const forageCropName = 'Azevém + Aveia / Trevo (Pastejo)';

  const raw: Omit<RotationScenario, 'recommended'>[] = [
    {
      id: 'baseline',
      title: '1. Rotação Atual (Baseline)',
      subtitle: `${crop.name} → ${crop.defaultSecondCrop}`,
      sequence: [crop.name, crop.defaultSecondCrop, crop.name],
      scores: {
        waterIndex: baseWaterIdx,
        yieldIndex: baseYieldIdx,
        soilIndex: baseSoilIdx,
        overall: computeOverall(baseWaterIdx, baseYieldIdx, baseSoilIdx, priorities),
      },
      backtest: baseBt,
      impact: {
        waterSavedM3Ha: 0,
        nitrogenFixedKgHa: crop.nitrogenFixing ? '30–50 kg/ha' : '0 kg/ha',
        estMarginBrlHa: Math.round(baseMargin * (baseBt.p50YieldPct / 100)),
      },
      supportingData: [
        {
          text: `POWER (${indicators.powerPeriod}): chuva média ${indicators.annualMeanPrecipMm} mm/ano, T média ${indicators.annualAvgTempC} °C`,
          provenance: powerTag,
        },
        {
          text: `Balanço FAO-56: ETc média ${Math.round(baseBt.meanSeasonEtcMm)} mm/safra; P10 = ${baseBt.p10YieldPct}%`,
          provenance: 'derivado',
        },
        {
          text: `Parâmetros: Kc ${crop.kc}, Ky ${crop.ky} (${crop.sourceRef})`,
          provenance: 'premissa',
        },
      ],
      benefits: [
        'Sem alteração de maquinário ou canal de venda atual',
        `Referência base: ${baseBt.failureRiskPct}% de anos abaixo de 60% do potencial`,
      ],
      dataGaps: [
        'Sem análise química/física de solo (0–20 cm) da parcela',
        'Custo real de insumos e frete não informado',
      ],
      agronomistNotes: `Checar compactação e nematoides em ${soil.soilClass}. Sem cobertura na entressafra, ${indicators.extremeRainDaysPerYear} dias/ano de chuva extrema elevam a erosão.`,
    },
    {
      id: 'cover-legume',
      title: '2. Cobertura + Leguminosas',
      subtitle: `${crop.name} → ${coverCropName}`,
      sequence: [crop.name, coverCropName, crop.name],
      scores: {
        waterIndex: covWaterIdx,
        yieldIndex: covYieldIdx,
        soilIndex: covSoilIdx,
        overall: computeOverall(covWaterIdx, covYieldIdx, covSoilIdx, priorities),
      },
      backtest: coverBt,
      impact: {
        waterSavedM3Ha: covWaterSaved,
        nitrogenFixedKgHa: '60–110 kg/ha (faixa Embrapa)',
        estMarginBrlHa: Math.round(baseMargin * (coverBt.p50YieldPct / 100) + 280),
      },
      supportingData: [
        {
          text: `POWER: ${indicators.extremeRainDaysPerYear} dias/ano acima do P95 de chuva`,
          provenance: powerTag,
        },
        {
          text: `Balanço FAO-56: ETc ${Math.round(coverBt.meanSeasonEtcMm)} mm/safra (−${covWaterSaved} m³/ha); quebra ${coverBt.failureRiskPct}%`,
          provenance: 'derivado',
        },
        {
          text: `Solo local (${soil.dataSourceLabel}): MO ${soil.organicMatterPct}%, AWC ${soil.availableWaterCapacityMm} mm`,
          provenance: 'premissa',
        },
      ],
      benefits: [
        'Fixação biológica de N (60–110 kg/ha) reduz adubação mineral na safra seguinte',
        'Palhada reduz escorrimento superficial e perda de solo por erosão',
      ],
      dataGaps: [
        'Disponibilidade de sementes e janela de plantio ZARC no município',
        constraints.hasNoTillPlanter
          ? 'Ajuste de dessecação antes da safra principal'
          : 'Propriedade sem plantadeira direta informada (requer adaptação)',
      ],
      agronomistNotes: `Validar época de manejo/dessecação de ${coverCropName} para evitar competição hídrica na implantação de ${crop.name}.`,
    },
    {
      id: 'drought-tolerant',
      title: '3. Cultura Tolerante à Seca',
      subtitle: `${crop.name} → ${droughtCropName}`,
      sequence: [crop.name, droughtCropName, crop.name],
      scores: {
        waterIndex: drWaterIdx,
        yieldIndex: drYieldIdx,
        soilIndex: drSoilIdx,
        overall: computeOverall(drWaterIdx, drYieldIdx, drSoilIdx, priorities),
      },
      backtest: droughtBt,
      impact: {
        waterSavedM3Ha: drWaterSaved,
        nitrogenFixedKgHa: '15–30 kg/ha',
        estMarginBrlHa: Math.round(baseMargin * (droughtBt.p50YieldPct / 100) + 160),
      },
      supportingData: [
        {
          text: `POWER: déficit hídrico sazonal médio de ${indicators.seasonalWaterDeficitMm} mm; geadas ${indicators.frostDaysPerYear} d/ano`,
          provenance: powerTag,
        },
        {
          text: `Balanço FAO-56: ETc ${Math.round(droughtBt.meanSeasonEtcMm)} mm/safra (−${drWaterSaved} m³/ha); P10 = ${droughtBt.p10YieldPct}%`,
          provenance: 'derivado',
        },
        {
          text: `Redução de Kc (×0,78) e Ky (×0,72) baseada em FAO-56/33`,
          provenance: 'premissa',
        },
      ],
      benefits: [
        `Economia calculada de ${drWaterSaved} m³/ha pela menor demanda evapotranspirativa`,
        `Reduz risco de quebra (< 60%) de ${baseBt.failureRiskPct}% para ${droughtBt.failureRiskPct}%`,
      ],
      dataGaps: [
        'Cotação regional atualizada (CONAB/cooperativa) para sorgo/milheto',
        'Disponibilidade de plataforma/colhedora adaptada',
      ],
      agronomistNotes: `Confirmar comprador local para ${droughtCropName} em ${soil.municipality} e checar risco de geada (${indicators.frostDaysPerYear} dias ≤ 2 °C).`,
    },
    {
      id: 'forage-livestock',
      title: '4. Forrageira / Integração Pecuária',
      subtitle: `${crop.name} → ${forageCropName}`,
      sequence: [crop.name, forageCropName, crop.name],
      scores: {
        waterIndex: forWaterIdx,
        yieldIndex: forYieldIdx,
        soilIndex: forSoilIdx,
        overall: computeOverall(forWaterIdx, forYieldIdx, forSoilIdx, priorities),
      },
      backtest: forageBt,
      impact: {
        waterSavedM3Ha: forWaterSaved,
        nitrogenFixedKgHa: '40–80 kg/ha (com trevo)',
        estMarginBrlHa: Math.round(
          baseMargin * (forageBt.p50YieldPct / 100) + (constraints.hasLivestock ? 420 : 90)
        ),
      },
      supportingData: [
        {
          text: `POWER: ${indicators.frostDaysPerYear} dias/ano ≤ 2 °C (adequado para forrageiras de inverno)`,
          provenance: powerTag,
        },
        {
          text: `Balanço FAO-56: P50 = ${forageBt.p50YieldPct}%, quebra = ${forageBt.failureRiskPct}%`,
          provenance: 'derivado',
        },
        {
          text: `Referência EMATER-RS / UFRGS para integração lavoura-pecuária no Vale do Taquari`,
          provenance: 'premissa',
        },
      ],
      benefits: [
        'Renda extra com pastejo/silagem de leite ou corte no inverno',
        'Cobertura densa protege o solo contra chuvas intensas de outono/primavera',
      ],
      dataGaps: [
        constraints.hasLivestock
          ? 'Lotação animal (UA/ha) para evitar compactação superficial'
          : 'Propriedade sem rebanho informado (exige arrendamento de pasto ou venda de feno)',
      ],
      agronomistNotes: `Ajustar altura de entrada e saída dos animais para manter massa residual mínima na implantação de ${crop.name}.`,
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

export function runSensitivityAnalysis(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  cropsCatalog: Record<CropId, CropInfo>,
  priorities: FarmerPriorities,
  constraints: FarmerConstraints,
  climateStress: ClimateStressScenario
): SensitivityResult {
  const baseWinner =
    evaluateRotationScenarios(analysis, currentCrop, cropsCatalog, priorities, constraints, climateStress).find(
      (s) => s.recommended
    )?.title ?? '';

  const pickWinner = (kcMult: number, kyMult: number) => {
    const modCatalog: Record<CropId, CropInfo> = {
      ...cropsCatalog,
      [currentCrop]: {
        ...cropsCatalog[currentCrop],
        kc: Number((cropsCatalog[currentCrop].kc * kcMult).toFixed(2)),
        ky: Number((cropsCatalog[currentCrop].ky * kyMult).toFixed(2)),
      },
    };
    return (
      evaluateRotationScenarios(analysis, currentCrop, modCatalog, priorities, constraints, climateStress).find(
        (s) => s.recommended
      )?.title ?? ''
    );
  };

  const kcMinus20Winner = pickWinner(0.8, 1.0);
  const kcPlus20Winner = pickWinner(1.2, 1.0);
  const kyMinus20Winner = pickWinner(1.0, 0.8);
  const kyPlus20Winner = pickWinner(1.0, 1.2);

  const isStable =
    kcMinus20Winner === baseWinner &&
    kcPlus20Winner === baseWinner &&
    kyMinus20Winner === baseWinner &&
    kyPlus20Winner === baseWinner;

  return {
    kcMinus20Winner,
    kcPlus20Winner,
    kyMinus20Winner,
    kyPlus20Winner,
    isStable,
  };
}
