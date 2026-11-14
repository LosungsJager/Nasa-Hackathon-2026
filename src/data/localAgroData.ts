import type { CropId, LocalSoilProfile, RegionPreset } from '../types/agro';

export interface CropInfo {
  id: CropId;
  name: string;
  cycleDays: number;
  waterDemandMm: number;
  nitrogenFixing: boolean;
  heatTolerance: 'Baixa' | 'Média' | 'Alta';
  residueCover: 'Baixa' | 'Média' | 'Alta';
  defaultSecondCrop: string;
}

export const CROPS_CATALOG: Record<CropId, CropInfo> = {
  soja: {
    id: 'soja',
    name: 'Soja',
    cycleDays: 120,
    waterDemandMm: 550,
    nitrogenFixing: true,
    heatTolerance: 'Média',
    residueCover: 'Baixa',
    defaultSecondCrop: 'Milho 2ª Safra',
  },
  milho: {
    id: 'milho',
    name: 'Milho',
    cycleDays: 135,
    waterDemandMm: 620,
    nitrogenFixing: false,
    heatTolerance: 'Média',
    residueCover: 'Alta',
    defaultSecondCrop: 'Pousio / Soja',
  },
  algodao: {
    id: 'algodao',
    name: 'Algodão',
    cycleDays: 170,
    waterDemandMm: 700,
    nitrogenFixing: false,
    heatTolerance: 'Alta',
    residueCover: 'Baixa',
    defaultSecondCrop: 'Milheto / Pousio',
  },
  trigo: {
    id: 'trigo',
    name: 'Trigo',
    cycleDays: 115,
    waterDemandMm: 420,
    nitrogenFixing: false,
    heatTolerance: 'Baixa',
    residueCover: 'Média',
    defaultSecondCrop: 'Soja',
  },
  feijao: {
    id: 'feijao',
    name: 'Feijão',
    cycleDays: 90,
    waterDemandMm: 360,
    nitrogenFixing: true,
    heatTolerance: 'Média',
    residueCover: 'Baixa',
    defaultSecondCrop: 'Milho / Sorgo',
  },
};

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'lajeado-rs',
    name: 'Lajeado, RS (Vale do Taquari)',
    subtitle: 'Relevo ondulado e estiagens de verão — foco em cobertura e erosão',
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
      [-23.301, -51.150],
      [-23.320, -51.150],
      [-23.320, -51.178],
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
    id: 'campinas-sp',
    name: 'Campinas, SP (Sudeste)',
    subtitle: 'Transição climática — diversificação de entressafra',
    center: [-22.8808, -47.0616],
    zoom: 13,
    defaultCrop: 'milho',
    polygonCoords: [
      [-22.871, -47.076],
      [-22.871, -47.048],
      [-22.890, -47.048],
      [-22.890, -47.076],
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
      soilClass: 'Argissolo Vermelho / Neossolo Litólico',
      texture: 'Franco-argilosa (34% argila)',
      organicMatterPct: 2.8,
      waterRetentionCapacity: 'Média',
      erosionSusceptibility: 'Alta',
      historicalYieldTonHa: {
        soja: 3.4,
        milho: 7.5,
        algodao: 2.4,
        trigo: 3.1,
        feijao: 2.1,
      },
      notes:
        'Relevo ondulado com chuvas intensas no outono/primavera e risco de estiagem no verão. Cobertura permanente (plantio direto + leguminosas) é essencial contra erosão.',
    },
  },
  {
    lat: -12.54,
    lng: -55.72,
    profile: {
      municipality: 'Sorriso - MT',
      regionLabel: 'Médio-Norte Mato-grossense (Cerrado)',
      soilClass: 'Latossolo Vermelho-Amarelo Distrófico',
      texture: 'Argilo-arenosa (38% argila)',
      organicMatterPct: 2.4,
      waterRetentionCapacity: 'Média',
      erosionSusceptibility: 'Moderada',
      historicalYieldTonHa: {
        soja: 3.7,
        milho: 6.4,
        algodao: 4.3,
        trigo: 2.1,
        feijao: 2.2,
      },
      notes:
        'Solo profundo e bem drenado, porém com rápida perda de umidade superficial após maio. Cobertura morta é crítica.',
    },
  },
  {
    lat: -23.31,
    lng: -51.16,
    profile: {
      municipality: 'Londrina - PR',
      regionLabel: 'Norte Central Paranaense',
      soilClass: 'Latossolo Vermelho Eutroférrico',
      texture: 'Muito argilosa (68% argila)',
      organicMatterPct: 3.1,
      waterRetentionCapacity: 'Alta',
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
      soilClass: 'Argissolo Amarelo / Neossolo Quartzarênico',
      texture: 'Arenosa-franca (14% argila)',
      organicMatterPct: 1.1,
      waterRetentionCapacity: 'Baixa',
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
    lat: -22.88,
    lng: -47.06,
    profile: {
      municipality: 'Campinas - SP',
      regionLabel: 'Depressão Periférica Paulista',
      soilClass: 'Latossolo Vermelho Distroférrico',
      texture: 'Argilosa (52% argila)',
      organicMatterPct: 2.7,
      waterRetentionCapacity: 'Alta',
      erosionSusceptibility: 'Moderada',
      historicalYieldTonHa: {
        soja: 3.5,
        milho: 7.4,
        algodao: 3.4,
        trigo: 2.8,
        feijao: 2.3,
      },
      notes:
        'Boa estrutura física; entressafra seca exige culturas de cobertura ou cereais de inverno de menor demanda hídrica.',
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

  // If within ~1.5 deg (~165 km), return the matched municipal profile
  if (minDist < 1.5) {
    return closest.profile;
  }

  // Otherwise synthesize a realistic local soil estimate based on latitude zone
  const absLat = Math.abs(lat);
  const isAridBelt = absLat >= 8 && absLat <= 20 && lng > -46 && lng < -34;
  return {
    municipality: `Talhão Local (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`,
    regionLabel: absLat < 23.5 ? 'Zona Tropical Agrícola' : 'Zona Subtropical / Temperada',
    soilClass: isAridBelt
      ? 'Neossolo / Argissolo de Baixa Retenção'
      : 'Latossolo / Cambissolo Agrícola',
    texture: isAridBelt ? 'Franco-arenosa (18% argila)' : 'Franco-argilosa (42% argila)',
    organicMatterPct: isAridBelt ? 1.4 : 2.6,
    waterRetentionCapacity: isAridBelt ? 'Baixa' : 'Média',
    erosionSusceptibility: 'Moderada',
    historicalYieldTonHa: {
      soja: 3.4,
      milho: 6.2,
      algodao: 3.6,
      trigo: 2.6,
      feijao: 2.1,
    },
    notes:
      'Perfil estimado a partir de base regional de solos. Recomenda-se coleta de amostra (0–20 cm) com o agrônomo para calibração local.',
  };
}
