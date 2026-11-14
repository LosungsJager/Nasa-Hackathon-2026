export type ActiveLayer = 'moisture' | 'ndvi' | 'erosion' | 'temperature';

export type CropId = 'soja' | 'milho' | 'algodao' | 'trigo' | 'feijao';

export interface FarmerPriorities {
  lessWater: number;     // 0 - 100
  moreIncome: number;    // 0 - 100
  improveSoil: number;   // 0 - 100
  reduceErosion: number; // 0 - 100
}

export interface LocalSoilProfile {
  municipality: string;
  regionLabel: string;
  soilClass: string;
  texture: string;
  organicMatterPct: number;
  waterRetentionCapacity: 'Baixa' | 'Média' | 'Alta';
  erosionSusceptibility: 'Baixa' | 'Moderada' | 'Alta';
  historicalYieldTonHa: Record<CropId, number>;
  notes: string;
}

export interface NasaMetrics {
  sourceMode: 'live-power' | 'hybrid-cache';
  power: {
    avgTempC: number;        // T2M (°C)
    annualPrecipMm: number;  // PRECTOTCORR (mm/yr)
    evapotranspirationMmDay: number; // EVPTRNS (mm/day)
    waterDeficitMmSeason: number;
  };
  smap: {
    soilMoisturePct: number; // % volumetric (0-50%)
    rootZoneStatus: 'Seco' | 'Adequado' | 'Úmido';
  };
  ecostress: {
    surfaceTempC: number;    // LST (°C)
    heatStressDays: number;
  };
  gpm: {
    accumulatedRain90dMm: number;
    rainAnomalyPct: number;
  };
  modis: {
    meanNdvi: number;        // 0.0 - 1.0
    bareSoilMonths: string;
  };
  erosion: {
    riskIndex: number;       // 0 - 100
    riskLevel: 'Baixo' | 'Moderado' | 'Alto';
  };
}

export interface GridCell500m {
  id: string;
  geometry: GeoJSON.Polygon;
  center: [number, number]; // [lng, lat]
  moisturePct: number;      // SMAP harmonized 500m
  ndvi: number;             // MODIS 500m
  erosionRisk: number;      // 0 - 100
  surfaceTempC: number;     // ECOSTRESS harmonized 500m
}

export interface FarmAnalysis {
  polygonGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
  areaHa: number;
  centroid: [number, number]; // [lat, lng]
  gridCells: GridCell500m[];
  nasa: NasaMetrics;
  soil: LocalSoilProfile;
  analyzedAt: string;
}

export interface ScenarioScores {
  waterUse: number;       // 0 - 100 (higher = better water efficiency)
  yieldPotential: number; // 0 - 100
  soilBenefit: number;    // 0 - 100
  overall: number;        // Weighted by farmer priorities
}

export interface RotationScenario {
  id: 'baseline' | 'cover-legume' | 'drought-tolerant';
  title: string;
  subtitle: string;
  sequence: string[];
  badge: string;
  recommended: boolean;
  scores: ScenarioScores;
  summary: string;
  nasaEvidence: string[];
  benefits: string[];
  agronomistNotes: string;
}

export interface RegionPreset {
  id: string;
  name: string;
  subtitle: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  defaultCrop: CropId;
  polygonCoords: [number, number][]; // [lat, lng][]
}
