import type { CropId, LocalSoilProfile, RegionPreset } from '../types/agro';

export interface CropInfo {
  id: CropId;
  name: string;
  cycleDays: number;
  waterDemandMm: number;
  kc: number;        // FAO-56 mid-season crop coefficient
  ky: number;        // FAO-33 yield response factor
  nitrogenFixing: boolean;
  heatTolerance: 'Baixa' | 'Média' | 'Alta';
  residueCover: 'Baixa' | 'Média' | 'Alta';
  pestBreakRole: string;
  defaultSecondCrop: string;
  sourceRef: string;
}

export const CROPS_CATALOG: Record<CropId, CropInfo> = {
  soja: {
    id: 'soja',
    name: 'Soja',
    cycleDays: 120,
    waterDemandMm: 550,
    kc: 1.15,
    ky: 0.85,
    nitrogenFixing: true,
    heatTolerance: 'Média',
    residueCover: 'Baixa',
    pestBreakRole: 'Fixa N atmosférico; exige rotação com gramíneas para quebrar nematoides',
    defaultSecondCrop: 'Milho 2ª Safra',
    sourceRef: 'FAO-56 / Embrapa Soja',
  },
  milho: {
    id: 'milho',
    name: 'Milho',
    cycleDays: 135,
    waterDemandMm: 620,
    kc: 1.2,
    ky: 1.25,
    nitrogenFixing: false,
    heatTolerance: 'Média',
    residueCover: 'Alta',
    pestBreakRole: 'Alta produção de palhada (C/N alto); reduz plantas daninhas',
    defaultSecondCrop: 'Pousio / Soja',
    sourceRef: 'FAO-56 / FAO-33',
  },
  algodao: {
    id: 'algodao',
    name: 'Algodão',
    cycleDays: 170,
    waterDemandMm: 700,
    kc: 1.18,
    ky: 0.85,
    nitrogenFixing: false,
    heatTolerance: 'Alta',
    residueCover: 'Baixa',
    pestBreakRole: 'Ciclo longo; beneficia-se de milheto/braquiária na entressafra',
    defaultSecondCrop: 'Milheto / Pousio',
    sourceRef: 'FAO-56 / CONAB',
  },
  trigo: {
    id: 'trigo',
    name: 'Trigo',
    cycleDays: 115,
    waterDemandMm: 420,
    kc: 1.15,
    ky: 1.05,
    nitrogenFixing: false,
    heatTolerance: 'Baixa',
    residueCover: 'Média',
    pestBreakRole: 'Cultura de inverno; sensível a geada na floração e excesso de chuva na colheita',
    defaultSecondCrop: 'Soja',
    sourceRef: 'FAO-56 / ZARC-RS',
  },
  feijao: {
    id: 'feijao',
    name: 'Feijão',
    cycleDays: 90,
    waterDemandMm: 360,
    kc: 1.05,
    ky: 1.15,
    nitrogenFixing: true,
    heatTolerance: 'Média',
    residueCover: 'Baixa',
    pestBreakRole: 'Ciclo curto, ótima janela pós-safra com leguminosa',
    defaultSecondCrop: 'Milho / Sorgo',
    sourceRef: 'FAO-56 / Embrapa Arroz e Feijão',
  },
};

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'lajeado-rs',
    name: 'Lajeado, RS (Vale do Taquari)',
    subtitle: 'Caso principal: seca 2022 + enchente 2024 • Relevo ondulado',
    center: [-29.4669, -51.9614],
    zoom: 13,
    defaultCrop: 'soja',
    polygonCoords: [
      [-29.457, -51.976],
      [-29.457, -51.948],
      [-29.476, -51.948],
      [-29.476, -51.976],
    ],
  },
  {
    id: 'sorriso-mt',
    name: 'Sorriso, MT (Cerrado)',
    subtitle: 'Grãos em Latossolo — déficit hídrico na safrinha',
    center: [-12.5425, -55.7211],
    zoom: 13,
    defaultCrop: 'soja',
    polygonCoords: [
      [-12.531, -55.736],
      [-12.531, -55.706],
      [-12.552, -55.706],
      [-12.552, -55.736],
    ],
  },
  {
    id: 'londrina-pr',
    name: 'Londrina, PR (Sul)',
    subtitle: 'Latossolo Eutroférrico — risco de erosão e geada',
    center: [-23.3103, -51.1628],
    zoom: 13,
    defaultCrop: 'soja',
    polygonCoords: [
      [-23.301, -51.178],
      [-23.301, -51.15],
      [-23.32, -51.15],
      [-23.32, -51.178],
    ],
  },
  {
    id: 'petrolina-pe',
    name: 'Petrolina, PE (Semiárido)',
    subtitle: 'Alta evapotranspiração — estresse térmico severo',
    center: [-9.3891, -40.5027],
    zoom: 13,
    defaultCrop: 'feijao',
    polygonCoords: [
      [-9.379, -40.517],
      [-9.379, -40.489],
      [-9.398, -40.489],
      [-9.398, -40.517],
    ],
  },
  {
    id: 'iowa-us',
    name: 'Ames, Iowa (EUA • USDA SSURGO/CDL)',
    subtitle: 'Portabilidade global: adaptador USDA + NASA POWER',
    center: [42.0308, -93.6319],
    zoom: 13,
    defaultCrop: 'milho',
    polygonCoords: [
      [42.041, -93.646],
      [42.041, -93.618],
      [42.022, -93.618],
      [42.022, -93.646],
    ],
  },
  {
    id: 'nakuru-ke',
    name: 'Nakuru, Quênia (África Oriental)',
    subtitle: 'Portabilidade global: camadas globais NASA + SoilGrids',
    center: [-0.3031, 36.08],
    zoom: 13,
    defaultCrop: 'milho',
    polygonCoords: [
      [-0.293, 36.066],
      [-0.293, 36.094],
      [-0.312, 36.094],
      [-0.312, 36.066],
    ],
  },
];

const MUNICIPAL_SOIL_DB: {
  lat: number;
  lng: number;
  profile: LocalSoilProfile;
}[] = [
  {
    lat: -29.47,
    lng: -51.96,
    profile: {
      municipality: 'Lajeado - RS',
      regionLabel: 'Vale do Taquari (Rio Grande do Sul)',
      countryCode: 'BR',
      confidenceLevel: 'Alta',
      dataSourceLabel: 'Embrapa/UFRGS + MapBiomas + ZARC-RS',
      soilClass: 'Argissolo Vermelho / Neossolo Litólico',
      texture: 'Franco-argilosa (34% argila)',
      organicMatterPct: 2.8,
      waterRetentionCapacity: 'Média',
      availableWaterCapacityMm: 95,
      erosionSusceptibility: 'Alta',
      historicalYieldTonHa: {
        soja: 3.4,
        milho: 7.5,
        algodao: 2.4,
        trigo: 3.1,
        feijao: 2.1,
      },
      notes:
        'Relevo ondulado com risco duplo: estiagens severas de verão (2021–23) e chuvas extremas (2024). Plantio direto + cobertura permanente é crítico.',
    },
  },
  {
    lat: -12.54,
    lng: -55.72,
    profile: {
      municipality: 'Sorriso - MT',
      regionLabel: 'Médio-Norte Mato-grossense (Cerrado)',
      countryCode: 'BR',
      confidenceLevel: 'Alta',
      dataSourceLabel: 'Embrapa Solos + MapBiomas + CONAB',
      soilClass: 'Latossolo Vermelho-Amarelo Distrófico',
      texture: 'Argilo-arenosa (38% argila)',
      organicMatterPct: 2.4,
      waterRetentionCapacity: 'Média',
      availableWaterCapacityMm: 105,
      erosionSusceptibility: 'Moderada',
      historicalYieldTonHa: {
        soja: 3.7,
        milho: 6.4,
        algodao: 4.3,
        trigo: 2.1,
        feijao: 2.2,
      },
      notes:
        'Solo profundo e bem drenado, porém com rápida perda de umidade superficial após maio. Cobertura morta reduz temperatura superficial.',
    },
  },
  {
    lat: -23.31,
    lng: -51.16,
    profile: {
      municipality: 'Londrina - PR',
      regionLabel: 'Norte Central Paranaense',
      countryCode: 'BR',
      confidenceLevel: 'Alta',
      dataSourceLabel: 'Embrapa/IDR-PR + MapBiomas + CONAB',
      soilClass: 'Latossolo Vermelho Eutroférrico',
      texture: 'Muito argilosa (68% argila)',
      organicMatterPct: 3.1,
      waterRetentionCapacity: 'Alta',
      availableWaterCapacityMm: 130,
      erosionSusceptibility: 'Alta',
      historicalYieldTonHa: {
        soja: 3.9,
        milho: 8.2,
        algodao: 3.5,
        trigo: 3.2,
        feijao: 2.4,
      },
      notes:
        'Alta fertilidade natural, mas relevo ondulado e chuvas concentradas elevam o risco de erosão laminar sem palhada.',
    },
  },
  {
    lat: -9.39,
    lng: -40.5,
    profile: {
      municipality: 'Petrolina - PE',
      regionLabel: 'Submédio São Francisco (Semiárido)',
      countryCode: 'BR',
      confidenceLevel: 'Alta',
      dataSourceLabel: 'Embrapa Semiárido + MapBiomas',
      soilClass: 'Argissolo Amarelo / Neossolo Quartzarênico',
      texture: 'Arenosa-franca (14% argila)',
      organicMatterPct: 1.1,
      waterRetentionCapacity: 'Baixa',
      availableWaterCapacityMm: 62,
      erosionSusceptibility: 'Alta',
      historicalYieldTonHa: {
        soja: 2.3,
        milho: 4.1,
        algodao: 2.9,
        trigo: 1.5,
        feijao: 1.8,
      },
      notes:
        'Baixa retenção hídrica e matéria orgânica reduzida. Priorizar espécies rústicas, cobertura viva e redução da temperatura do solo.',
    },
  },
  {
    lat: 42.03,
    lng: -93.63,
    profile: {
      municipality: 'Ames, Iowa (EUA)',
      regionLabel: 'US Corn Belt (Midwest)',
      countryCode: 'US',
      confidenceLevel: 'Alta',
      dataSourceLabel: 'USDA SSURGO + CropScape CDL + PRISM',
      soilClass: 'Mollisol (Clarion-Nicollet-Webster)',
      texture: 'Franco-argilo-siltosa (32% argila)',
      organicMatterPct: 4.4,
      waterRetentionCapacity: 'Alta',
      availableWaterCapacityMm: 155,
      erosionSusceptibility: 'Moderada',
      historicalYieldTonHa: {
        soja: 3.8,
        milho: 11.4,
        algodao: 2.0,
        trigo: 4.5,
        feijao: 2.3,
      },
      notes:
        'Adaptador USDA ativo: solos profundos ricos em matéria orgânica; culturas de cobertura de inverno (centeio/ervilhaca) reduzem lixiviação de nitrato.',
    },
  },
  {
    lat: -0.3,
    lng: 36.08,
    profile: {
      municipality: 'Nakuru (Quênia)',
      regionLabel: 'Rift Valley Highlands',
      countryCode: 'KE',
      confidenceLevel: 'Média',
      dataSourceLabel: 'SoilGrids 250m + ESA WorldCover + NASA Global',
      soilClass: 'Andosol / Phaeozem Vulcânico',
      texture: 'Franco-siltosa (26% argila)',
      organicMatterPct: 2.9,
      waterRetentionCapacity: 'Média',
      availableWaterCapacityMm: 100,
      erosionSusceptibility: 'Alta',
      historicalYieldTonHa: {
        soja: 1.9,
        milho: 3.2,
        algodao: 1.5,
        trigo: 2.4,
        feijao: 1.4,
      },
      notes:
        'Modo Global-Only (confiança média): sem base municipal local. Recomenda-se consórcio milho + feijão/lab-lab para mitigar chuvas irregulares.',
    },
  },
];

export function resolveLocalSoil(lat: number, lng: number): LocalSoilProfile {
  let closest = MUNICIPAL_SOIL_DB[0];
  let minDist = Infinity;

  for (const entry of MUNICIPAL_SOIL_DB) {
    const d = Math.hypot(entry.lat - lat, entry.lng - lng);
    if (d < minDist) {
      minDist = d;
      closest = entry;
    }
  }

  if (minDist < 1.5) {
    return closest.profile;
  }

  const absLat = Math.abs(lat);
  const isAridBelt = absLat >= 8 && absLat <= 20 && lng > -46 && lng < -34;
  return {
    municipality: `Talhão Global (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
    regionLabel: absLat < 23.5 ? 'Zona Tropical Agrícola' : 'Zona Subtropical / Temperada',
    countryCode: 'GLOBAL',
    confidenceLevel: 'Média',
    dataSourceLabel: 'SoilGrids 250m + ESA WorldCover (Modo Global)',
    soilClass: isAridBelt
      ? 'Neossolo / Argissolo de Baixa Retenção'
      : 'Latossolo / Cambissolo Agrícola',
    texture: isAridBelt ? 'Franco-arenosa (18% argila)' : 'Franco-argilosa (42% argila)',
    organicMatterPct: isAridBelt ? 1.4 : 2.6,
    waterRetentionCapacity: isAridBelt ? 'Baixa' : 'Média',
    availableWaterCapacityMm: isAridBelt ? 65 : 105,
    erosionSusceptibility: 'Moderada',
    historicalYieldTonHa: {
      soja: 3.4,
      milho: 6.2,
      algodao: 3.6,
      trigo: 2.6,
      feijao: 2.1,
    },
    notes:
      'Perfil global (confiança média). Recomenda-se análise de solo (0–20 cm) com agrônomo/EMATER para calibração local.',
  };
}
