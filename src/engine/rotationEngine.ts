import { CROPS_CATALOG } from '../data/localAgroData';
import type {
  CropId,
  FarmAnalysis,
  FarmerPriorities,
  RotationScenario,
} from '../types/agro';

function clampScore(v: number): number {
  return Math.round(Math.max(18, Math.min(98, v)));
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

export function evaluateRotationScenarios(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  priorities: FarmerPriorities
): RotationScenario[] {
  const crop = CROPS_CATALOG[currentCrop];
  const { nasa, soil } = analysis;

  const isDrySoil = nasa.smap.soilMoisturePct < 20;
  const isHotSurface = nasa.ecostress.surfaceTempC >= 31;
  const isHighErosion = nasa.erosion.riskIndex >= 50;
  const isLowOM = soil.organicMatterPct < 2.5;

  // 1. Baseline (Current Rotation)
  const baseWater = clampScore(
    68 - (crop.waterDemandMm - 400) / 14 - (isDrySoil ? 18 : 4)
  );
  const baseYield = clampScore(
    74 + (soil.historicalYieldTonHa[currentCrop] - 2.5) * 4 - (isHotSurface ? 14 : 0)
  );
  const baseSoil = clampScore(
    46 + (crop.nitrogenFixing ? 10 : -6) - (isHighErosion ? 14 : 0)
  );
  const baseOverall = computeOverall(baseWater, baseYield, baseSoil, priorities);

  // 2. Cover + Legumes ("Cobertura + Leguminosas")
  const coverCropName =
    currentCrop === 'soja'
      ? 'Braquiária + Crotalária'
      : currentCrop === 'milho'
        ? 'Feijão-guandu + Aveia'
        : 'Crotalária + Milheto';

  const covWater = clampScore(
    76 + (isDrySoil ? 10 : 6) - (nasa.power.waterDeficitMmSeason > 280 ? 6 : 0)
  );
  const covYield = clampScore(
    74 + (isLowOM ? 9 : 5) + (soil.waterRetentionCapacity === 'Baixa' ? 8 : 4)
  );
  const covSoil = clampScore(
    84 + (isHighErosion ? 10 : 5) + (isLowOM ? 6 : 2)
  );
  const covOverall = computeOverall(covWater, covYield, covSoil, priorities);

  // 3. Drought-Tolerant ("Cultura Tolerante à Seca")
  const droughtCropName =
    nasa.ecostress.surfaceTempC > 33
      ? 'Sorgo Granífero / Gergelim'
      : currentCrop === 'trigo'
        ? 'Grão-de-bico / Aveia'
        : 'Sorgo Granífero / Milheto';

  const drWater = clampScore(
    84 + (isDrySoil ? 12 : 4) + (isHotSurface ? 4 : 0)
  );
  const drYield = clampScore(
    72 + (isDrySoil || isHotSurface ? 14 : 2)
  );
  const drSoil = clampScore(
    68 + (isHighErosion ? 8 : 4)
  );
  const drOverall = computeOverall(drWater, drYield, drSoil, priorities);

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
      summary: `Mantém o sistema convencional de ${crop.name} seguido de ${crop.defaultSecondCrop}. ${
        isDrySoil || isHotSurface
          ? `Os satélites indicam vulnerabilidade: umidade SMAP em ${nasa.smap.soilMoisturePct}% e temperatura ECOSTRESS de ${nasa.ecostress.surfaceTempC}°C elevam o risco na 2ª safra.`
          : 'Condições hídricas atuais suportam a sucessão, mas a exposição do solo na entressafra limita o ganho de matéria orgânica.'
      }`,
      nasaEvidence: [
        `SMAP: ${nasa.smap.soilMoisturePct}% (${nasa.smap.rootZoneStatus})`,
        `MODIS NDVI médio: ${nasa.modis.meanNdvi} (solo exposto: ${nasa.modis.bareSoilMonths})`,
        `POWER déficit sazonal: ${nasa.power.waterDeficitMmSeason} mm`,
      ],
      benefits: [
        'Infraestrutura e maquinário já adaptados na propriedade',
        'Canal de comercialização imediato na região',
      ],
      agronomistNotes: `Verificar histórico de nematoides e compactação (0–20 cm) em ${soil.soilClass}. Se o solo ficar descoberto em ${nasa.modis.bareSoilMonths}, há risco de perda de umidade.`,
    },
    {
      id: 'cover-legume',
      title: 'Cobertura + Leguminosas',
      subtitle: `${crop.name} → ${coverCropName}`,
      sequence: [crop.name, coverCropName, crop.name],
      badge: 'Saúde do Solo & Água',
      scores: {
        waterUse: covWater,
        yieldPotential: covYield,
        soilBenefit: covSoil,
        overall: covOverall,
      },
      summary: `Introduz consórcio de cobertura e leguminosa fixadora (${coverCropName}) na janela pós-colheita. A palhada reduz a temperatura superficial medida pelo ECOSTRESS em até 4–5 °C e diminui a evaporação direta.`,
      nasaEvidence: [
        `ECOSTRESS LST: ${nasa.ecostress.surfaceTempC}°C (${nasa.ecostress.heatStressDays} dias de estresse térmico)`,
        `Risco de Erosão: ${nasa.erosion.riskIndex}/100 (${nasa.erosion.riskLevel})`,
        `Matéria Orgânica local: ${soil.organicMatterPct}%`,
      ],
      benefits: [
        'Fixação biológica de nitrogênio (economia estimada de 30–45% em N mineral)',
        'Redução expressiva da erosão laminar e maior infiltração de chuva (GPM)',
        'Quebra de ciclo de pragas e melhoria estrutural do solo',
      ],
      agronomistNotes: `Confirmar com o agrônomo a época exata de dessecação da cobertura antes da safra principal e compatibilidade de herbicidas residuais em ${soil.municipality}.`,
    },
    {
      id: 'drought-tolerant',
      title: 'Cultura Tolerante à Seca',
      subtitle: `${crop.name} → ${droughtCropName}`,
      sequence: [crop.name, droughtCropName, crop.name],
      badge: 'Resiliência Climática',
      scores: {
        waterUse: drWater,
        yieldPotential: drYield,
        soilBenefit: drSoil,
        overall: drOverall,
      },
      summary: `Substitui a 2ª safra tradicional por espécie rústica de baixo consumo hídrico (${droughtCropName}), mantendo receita na entressafra mesmo com anomalia negativa de chuvas no GPM (${nasa.gpm.rainAnomalyPct}%).`,
      nasaEvidence: [
        `GPM chuva 90d: ${nasa.gpm.accumulatedRain90dMm} mm (anomalia ${nasa.gpm.rainAnomalyPct}%)`,
        `NASA POWER T2M: ${nasa.power.avgTempC}°C | ET: ${nasa.power.evapotranspirationMmDay} mm/dia`,
        `SMAP umidade: ${nasa.smap.soilMoisturePct}%`,
      ],
      benefits: [
        'Menor risco de quebra de safra em veranicos e ondas de calor',
        'Sistema radicular profundo que explora umidade residual abaixo de 30 cm',
        'Receita alternativa (grão, silagem ou pastejo) com menor custo de implantação',
      ],
      agronomistNotes: `Validar demanda de compradores/cooperativas locais para ${droughtCropName} em ${soil.municipality} e ajustar espaçamento de plantio conforme retenção hídrica (${soil.waterRetentionCapacity}).`,
    },
  ];

  // Mark highest overall score as recommended
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
