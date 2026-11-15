import { getCropDisplayName, tr, type Lang } from '../i18n';
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

  // Estimate mean annual rainfall to initialize pre-season soil moisture realistically
  const totalYears = Math.max(1, new Set(dailyClimate.map((d) => d.year)).size);
  const meanAnnualRainMm =
    dailyClimate.reduce((s, d) => s + d.precipMm * rainMult, 0) / totalYears;
  const initMoistureFraction = clamp(meanAnnualRainMm / 1000, 0.02, 0.7);

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

    let soilWater = awcMm * initMoistureFraction;
    let sumEtc = 0;
    let sumEta = 0;
    let sumRain = 0;
    let heavyRainDays = 0;
    let extremeHeatDays = 0;

    for (const day of slice) {
      const rain = day.precipMm * rainMult;
      const etc = day.et0Mm * etMult * kc;
      sumRain += rain;
      sumEtc += etc;
      if (rain >= 40) heavyRainDays++;
      if (day.t2mMax + stress.tempDeltaC >= 39) extremeHeatDays++;

      soilWater = Math.min(awcMm, soilWater + rain * 0.88);
      if (hasIrrigation && soilWater < awcMm * 0.35) {
        soilWater = awcMm * 0.6; // Supplemental irrigation prevents severe wilt
      }

      // FAO-56 stress coefficient Ks when soil moisture drops below 45% of AWC
      const readilyAvailable = awcMm * 0.45;
      const ks = soilWater >= readilyAvailable ? 1.0 : clamp(soilWater / readilyAvailable, 0.05, 1.0);
      const eta = Math.min(soilWater, etc * ks);
      soilWater = Math.max(0, soilWater - eta);
      sumEta += eta;
    }

    totalEtcMm += sumEtc;
    const etaRatio = clamp(sumEta / Math.max(1, sumEtc), 0.0, 1.0);
    // FAO-33 yield response, dropping to 0 under extreme desert/crop-failure deficit
    let relYield = clamp(1 - ky * (1 - etaRatio), 0.0, 1.0);
    if (etaRatio < 0.35) {
      relYield *= etaRatio / 0.35;
    }
    // Extreme heat (>39C) pollination/thermal stress penalty
    if (extremeHeatDays > 10) {
      relYield -= Math.min(0.35, (extremeHeatDays - 10) * 0.008);
    }

    let status: BacktestYearPoint['status'] = 'normal';
    if (etaRatio < 0.78) {
      status = 'seca';
    } else if (heavyRainDays >= 4 || sumRain > 1100) {
      status = 'excesso';
      const penalty = Math.max(0, 0.14 - excessRainTolerance * 0.1);
      relYield -= penalty;
    }

    series.push({
      year,
      relYieldPct: Math.round(clamp(relYield * 100, 0, 100)),
      seasonRainMm: Math.round(sumRain),
      seasonEtcMm: Math.round(sumEtc),
      status,
    });
  }

  const sorted = series.map((s) => s.relYieldPct).sort((a, b) => a - b);
  const p10YieldPct = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const p50YieldPct = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p90YieldPct = sorted[Math.floor(sorted.length * 0.9)] ?? 0;
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
  climateStress: ClimateStressScenario = { rainDeltaPct: 0, tempDeltaC: 0 },
  lang: Lang = 'en',
  priceDeltaPct: number = 0
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

  // Comparative 0-100 indices derived from simulated ETc, P50, failure risk, and soil+DEM properties
  const baseWaterIdx = Math.round(clamp(100 - baseBt.meanSeasonEtcMm / 8.5, 20, 95));
  const covWaterIdx = Math.round(clamp(100 - coverBt.meanSeasonEtcMm / 8.5, 20, 95));
  const drWaterIdx = Math.round(clamp(100 - droughtBt.meanSeasonEtcMm / 8.5, 20, 95));
  const forWaterIdx = Math.round(clamp(100 - forageBt.meanSeasonEtcMm / 8.5, 20, 95));

  const baseYieldIdx = Math.round(clamp(baseBt.p50YieldPct - baseBt.failureRiskPct * 0.45, 0, 98));
  const covYieldIdx = Math.round(clamp(coverBt.p50YieldPct - coverBt.failureRiskPct * 0.3, 0, 98));
  const drYieldIdx = Math.round(clamp(droughtBt.p50YieldPct - droughtBt.failureRiskPct * 0.25, 0, 98));
  const forYieldIdx = Math.round(
    clamp(
      forageBt.p50YieldPct - forageBt.failureRiskPct * 0.25 + (constraints.hasLivestock ? 10 : -8),
      0,
      98
    )
  );

  // Soil health index driven by polygon OM%, AWC, and real rain+slope erosion index
  const siteSoilBase = clamp(
    35 + soil.organicMatterPct * 6.5 + (soil.availableWaterCapacityMm - 70) * 0.14 - indicators.estimatedErosionIndex * 0.32,
    20,
    78
  );
  const residueBonus = crop.residueCover === 'Alta' ? 10 : crop.residueCover === 'Média' ? 4 : -4;
  const baseSoilIdx = Math.round(
    clamp(siteSoilBase + (crop.nitrogenFixing ? 6 : 0) + residueBonus, 20, 95)
  );
  const covSoilIdx = Math.round(
    clamp(
      siteSoilBase + 22 + (constraints.hasNoTillPlanter ? 8 : 0) + (indicators.estimatedErosionIndex > 45 ? 6 : 0),
      25,
      96
    )
  );
  const drSoilIdx = Math.round(
    clamp(siteSoilBase + 12 + (indicators.seasonalWaterDeficitMm > 140 ? 6 : 0), 20, 95)
  );
  const forSoilIdx = Math.round(
    clamp(siteSoilBase + 20 + (constraints.hasLivestock ? 7 : 0), 25, 96)
  );

  const DEFAULT_YIELD_TON_HA: Record<CropId, number> = {
    soja: 3.4,
    milho: 7.5,
    algodao: 4.1,
    trigo: 3.1,
    feijao: 2.1,
    azevem: 6.5,
    aveia: 4.5,
    canola: 1.9,
    mandioca: 20.0,
    tifton85: 14.0,
  };
  const refTon = soil.historicalYieldTonHa[currentCrop] ?? DEFAULT_YIELD_TON_HA[currentCrop] ?? 3.4;
  const simPriceBrlTon = Math.round(crop.refPriceBrlTon * (1 + priceDeltaPct / 100));
  const projectFinance = (
    p50YieldPct: number,
    extraCostBrlHa: number,
    nSavingBrlHa: number,
    extraRevBrlHa: number
  ) => {
    const projectedYieldTonHa = Number((refTon * (p50YieldPct / 100)).toFixed(2));
    const revScale = p50YieldPct > 0 ? p50YieldPct / 100 : 0;
    const estRevenueBrlHa = Math.round(
      projectedYieldTonHa * simPriceBrlTon + extraRevBrlHa * revScale * (1 + priceDeltaPct / 100)
    );
    const estCostBrlHa = Math.max(0, Math.round(crop.estCostBrlHa + extraCostBrlHa - nSavingBrlHa));
    const estMarginBrlHa = estRevenueBrlHa - estCostBrlHa;
    const totalAreaMarginBrl = Math.round(estMarginBrlHa * analysis.areaHa);
    return {
      projectedYieldTonHa,
      projectedPriceBrlTon: simPriceBrlTon,
      estRevenueBrlHa,
      estCostBrlHa,
      estMarginBrlHa,
      totalAreaMarginBrl,
    };
  };

  // Calculated water saved (1 mm ETc = 10 m³/ha)
  const covWaterSaved = Math.max(0, Math.round((baseBt.meanSeasonEtcMm - coverBt.meanSeasonEtcMm) * 10));
  const drWaterSaved = Math.max(0, Math.round((baseBt.meanSeasonEtcMm - droughtBt.meanSeasonEtcMm) * 10));
  const forWaterSaved = Math.max(0, Math.round((baseBt.meanSeasonEtcMm - forageBt.meanSeasonEtcMm) * 10));

  const cropDisplay = getCropDisplayName(currentCrop, crop.name, lang);
  const secondCropDisplay = tr(lang, crop.defaultSecondCrop, 'Corn / Fallow');
  const coverCropName =
    lat < -22
      ? tr(lang, 'Aveia Preta + Ervilhaca', 'Black Oat + Vetch')
      : tr(lang, 'Braquiária + Crotalária', 'Brachiaria + Sunn Hemp');
  const droughtCropName =
    currentCrop === 'trigo'
      ? tr(lang, 'Aveia Branca / Canola', 'White Oat / Canola')
      : tr(lang, 'Sorgo Granífero / Milheto', 'Grain Sorghum / Pearl Millet');
  const forageCropName = tr(
    lang,
    'Azevém + Aveia / Trevo (Pastejo)',
    'Ryegrass + Oat / Clover (Grazing)'
  );

  const raw: Omit<RotationScenario, 'recommended'>[] = [
    {
      id: 'baseline',
      title: tr(lang, '1. Rotação Atual (Baseline)', '1. Current Rotation (Baseline)'),
      subtitle: `${cropDisplay} → ${secondCropDisplay}`,
      sequence: [cropDisplay, secondCropDisplay, cropDisplay],
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
        ...projectFinance(baseBt.p50YieldPct, 0, 0, 650),
      },
      supportingData: [
        {
          text: tr(
            lang,
            `POWER (${indicators.powerPeriod}): chuva média ${indicators.annualMeanPrecipMm} mm/ano, T média ${indicators.annualAvgTempC} °C`,
            `POWER (${indicators.powerPeriod}): mean rain ${indicators.annualMeanPrecipMm} mm/yr, mean T ${indicators.annualAvgTempC} °C`
          ),
          provenance: powerTag,
        },
        {
          text: tr(
            lang,
            `Balanço FAO-56: ETc média ${Math.round(baseBt.meanSeasonEtcMm)} mm/safra; P10 = ${baseBt.p10YieldPct}%`,
            `FAO-56 balance: mean ETc ${Math.round(baseBt.meanSeasonEtcMm)} mm/season; P10 = ${baseBt.p10YieldPct}%`
          ),
          provenance: 'derivado',
        },
        {
          text: tr(
            lang,
            `Parâmetros: Kc ${crop.kc}, Ky ${crop.ky} (${crop.sourceRef})`,
            `Parameters: Kc ${crop.kc}, Ky ${crop.ky} (${crop.sourceRef})`
          ),
          provenance: 'premissa',
        },
      ],
      benefits: [
        tr(
          lang,
          'Sem alteração de maquinário ou canal de venda atual',
          'No changes needed to current machinery or sales channel'
        ),
        tr(
          lang,
          `Referência base: ${baseBt.failureRiskPct}% de anos abaixo de 60% do potencial`,
          `Baseline reference: ${baseBt.failureRiskPct}% of years below 60% yield potential`
        ),
      ],
      dataGaps: [
        tr(
          lang,
          'Sem análise química/física de solo (0–20 cm) da parcela',
          'No lab soil chemical/physical analysis (0–20 cm) for this plot'
        ),
        tr(
          lang,
          'Custo real de insumos e frete não informado',
          'Actual input and freight costs not provided'
        ),
      ],
      agronomistNotes: tr(
        lang,
        `Checar compactação e nematoides em ${soil.soilClass}. Sem cobertura na entressafra, ${indicators.extremeRainDaysPerYear} dias/ano de chuva extrema elevam a erosão.`,
        `Check compaction and nematodes in ${soil.soilClass}. Without off-season cover, ${indicators.extremeRainDaysPerYear} extreme rain days/yr increase erosion.`
      ),
    },
    {
      id: 'cover-legume',
      title: tr(lang, '2. Cobertura + Leguminosas', '2. Cover Crop + Legumes'),
      subtitle: `${cropDisplay} → ${coverCropName}`,
      sequence: [cropDisplay, coverCropName, cropDisplay],
      scores: {
        waterIndex: covWaterIdx,
        yieldIndex: covYieldIdx,
        soilIndex: covSoilIdx,
        overall: computeOverall(covWaterIdx, covYieldIdx, covSoilIdx, priorities),
      },
      backtest: coverBt,
      impact: {
        waterSavedM3Ha: covWaterSaved,
        nitrogenFixedKgHa: tr(lang, '60–110 kg/ha (faixa Embrapa)', '60–110 kg/ha (Embrapa range)'),
        ...projectFinance(coverBt.p50YieldPct, 320, 520, 720),
      },
      supportingData: [
        {
          text: tr(
            lang,
            `POWER: ${indicators.extremeRainDaysPerYear} dias/ano acima do P95 de chuva`,
            `POWER: ${indicators.extremeRainDaysPerYear} days/yr above P95 extreme rainfall`
          ),
          provenance: powerTag,
        },
        {
          text: tr(
            lang,
            `Balanço FAO-56: ETc ${Math.round(coverBt.meanSeasonEtcMm)} mm/safra (−${covWaterSaved} m³/ha); quebra ${coverBt.failureRiskPct}%`,
            `FAO-56 balance: ETc ${Math.round(coverBt.meanSeasonEtcMm)} mm/season (−${covWaterSaved} m³/ha); failure ${coverBt.failureRiskPct}%`
          ),
          provenance: 'derivado',
        },
        {
          text: tr(
            lang,
            `Solo local (${soil.dataSourceLabel}): MO ${soil.organicMatterPct}%, AWC ${soil.availableWaterCapacityMm} mm`,
            `Local soil (${soil.dataSourceLabel}): OM ${soil.organicMatterPct}%, AWC ${soil.availableWaterCapacityMm} mm`
          ),
          provenance: 'premissa',
        },
      ],
      benefits: [
        tr(
          lang,
          'Fixação biológica de N (60–110 kg/ha) reduz adubação mineral na safra seguinte',
          'Biological N fixation (60–110 kg/ha) reduces synthetic fertilizer in the next season'
        ),
        tr(
          lang,
          'Palhada reduz escorrimento superficial e perda de solo por erosão',
          'Residue mulch reduces surface runoff and soil erosion'
        ),
      ],
      dataGaps: [
        tr(
          lang,
          'Disponibilidade de sementes e janela de plantio ZARC no município',
          'Local seed availability and regional planting window'
        ),
        constraints.hasNoTillPlanter
          ? tr(
              lang,
              'Ajuste de dessecação antes da safra principal',
              'Termination timing adjustment before main crop planting'
            )
          : tr(
              lang,
              'Propriedade sem plantadeira direta informada (requer adaptação)',
              'No no-till planter reported (requires equipment adaptation)'
            ),
      ],
      agronomistNotes: tr(
        lang,
        `Validar época de manejo/dessecação de ${coverCropName} para evitar competição hídrica na implantação de ${cropDisplay}.`,
        `Validate termination timing of ${coverCropName} to avoid water competition when establishing ${cropDisplay}.`
      ),
    },
    {
      id: 'drought-tolerant',
      title: tr(lang, '3. Cultura Tolerante à Seca', '3. Drought-Tolerant Crop'),
      subtitle: `${cropDisplay} → ${droughtCropName}`,
      sequence: [cropDisplay, droughtCropName, cropDisplay],
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
        ...projectFinance(droughtBt.p50YieldPct, 180, 120, 780),
      },
      supportingData: [
        {
          text: tr(
            lang,
            `POWER: déficit hídrico sazonal médio de ${indicators.seasonalWaterDeficitMm} mm; geadas ${indicators.frostDaysPerYear} d/ano`,
            `POWER: mean seasonal water deficit ${indicators.seasonalWaterDeficitMm} mm; frost ${indicators.frostDaysPerYear} d/yr`
          ),
          provenance: powerTag,
        },
        {
          text: tr(
            lang,
            `Balanço FAO-56: ETc ${Math.round(droughtBt.meanSeasonEtcMm)} mm/safra (−${drWaterSaved} m³/ha); P10 = ${droughtBt.p10YieldPct}%`,
            `FAO-56 balance: ETc ${Math.round(droughtBt.meanSeasonEtcMm)} mm/season (−${drWaterSaved} m³/ha); P10 = ${droughtBt.p10YieldPct}%`
          ),
          provenance: 'derivado',
        },
        {
          text: tr(
            lang,
            'Redução de Kc (×0,78) e Ky (×0,72) baseada em FAO-56/33',
            'Kc (×0.78) and Ky (×0.72) reduction based on FAO-56/33'
          ),
          provenance: 'premissa',
        },
      ],
      benefits: [
        tr(
          lang,
          `Economia calculada de ${drWaterSaved} m³/ha pela menor demanda evapotranspirativa`,
          `Calculated savings of ${drWaterSaved} m³/ha from lower evapotranspiration demand`
        ),
        tr(
          lang,
          `Reduz risco de quebra (< 60%) de ${baseBt.failureRiskPct}% para ${droughtBt.failureRiskPct}%`,
          `Reduces crop failure risk (< 60%) from ${baseBt.failureRiskPct}% to ${droughtBt.failureRiskPct}%`
        ),
      ],
      dataGaps: [
        tr(
          lang,
          'Cotação regional atualizada (CONAB/cooperativa) para sorgo/milheto',
          'Updated local market price for sorghum/millet'
        ),
        tr(
          lang,
          'Disponibilidade de plataforma/colhedora adaptada',
          'Availability of adapted harvester header'
        ),
      ],
      agronomistNotes: tr(
        lang,
        `Confirmar comprador local para ${droughtCropName} em ${soil.municipality} e checar risco de geada (${indicators.frostDaysPerYear} dias ≤ 2 °C).`,
        `Confirm local buyer for ${droughtCropName} in ${soil.municipality} and check frost risk (${indicators.frostDaysPerYear} days ≤ 2 °C).`
      ),
    },
    {
      id: 'forage-livestock',
      title: tr(lang, '4. Forrageira / Integração Pecuária', '4. Forage / Crop-Livestock'),
      subtitle: `${cropDisplay} → ${forageCropName}`,
      sequence: [cropDisplay, forageCropName, cropDisplay],
      scores: {
        waterIndex: forWaterIdx,
        yieldIndex: forYieldIdx,
        soilIndex: forSoilIdx,
        overall: computeOverall(forWaterIdx, forYieldIdx, forSoilIdx, priorities),
      },
      backtest: forageBt,
      impact: {
        waterSavedM3Ha: forWaterSaved,
        nitrogenFixedKgHa: tr(lang, '40–80 kg/ha (com trevo)', '40–80 kg/ha (with clover)'),
        ...projectFinance(
          forageBt.p50YieldPct,
          280,
          240,
          constraints.hasLivestock ? 1150 : 620
        ),
      },
      supportingData: [
        {
          text: tr(
            lang,
            `POWER: ${indicators.frostDaysPerYear} dias/ano ≤ 2 °C (adequado para forrageiras de inverno)`,
            `POWER: ${indicators.frostDaysPerYear} days/yr ≤ 2 °C (suitable for cool-season forage)`
          ),
          provenance: powerTag,
        },
        {
          text: tr(
            lang,
            `Balanço FAO-56: P50 = ${forageBt.p50YieldPct}%, quebra = ${forageBt.failureRiskPct}%`,
            `FAO-56 balance: P50 = ${forageBt.p50YieldPct}%, failure = ${forageBt.failureRiskPct}%`
          ),
          provenance: 'derivado',
        },
        {
          text: tr(
            lang,
            'Referência EMATER-RS / UFRGS para integração lavoura-pecuária no Vale do Taquari',
            'EMATER-RS / UFRGS reference for integrated crop-livestock systems'
          ),
          provenance: 'premissa',
        },
      ],
      benefits: [
        tr(
          lang,
          'Renda extra com pastejo/silagem de leite ou corte no inverno',
          'Extra income from off-season dairy/beef grazing or silage'
        ),
        tr(
          lang,
          'Cobertura densa protege o solo contra chuvas intensas de outono/primavera',
          'Dense canopy protects topsoil from heavy autumn/spring rainfall'
        ),
      ],
      dataGaps: [
        constraints.hasLivestock
          ? tr(
              lang,
              'Lotação animal (UA/ha) para evitar compactação superficial',
              'Stocking rate (AU/ha) to prevent surface soil compaction'
            )
          : tr(
              lang,
              'Propriedade sem rebanho informado (exige arrendamento de pasto ou venda de feno)',
              'No livestock reported (requires pasture lease or hay sale)'
            ),
      ],
      agronomistNotes: tr(
        lang,
        `Ajustar altura de entrada e saída dos animais para manter massa residual mínima na implantação de ${cropDisplay}.`,
        `Manage grazing entry/exit height to preserve minimum residue cover before planting ${cropDisplay}.`
      ),
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
  climateStress: ClimateStressScenario,
  lang: Lang = 'en'
): SensitivityResult {
  const baseWinner =
    evaluateRotationScenarios(
      analysis,
      currentCrop,
      cropsCatalog,
      priorities,
      constraints,
      climateStress,
      lang
    ).find((s) => s.recommended)?.title ?? '';

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
      evaluateRotationScenarios(
        analysis,
        currentCrop,
        modCatalog,
        priorities,
        constraints,
        climateStress,
        lang
      ).find((s) => s.recommended)?.title ?? ''
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
