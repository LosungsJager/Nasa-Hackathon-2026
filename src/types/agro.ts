export type ActiveLayer = 'moisture' | 'ndvi' | 'erosion' | 'temperature';

export type AppViewMode = 'map' | 'crops' | 'methodology';

export type CropId = 'soja' | 'milho' | 'algodao' | 'trigo' | 'feijao';

export interface FarmerPriorities {
  lessWater: number;     // 0 - 100
  moreIncome: number;    // 0 - 100
  improveSoil: number;   // 0 - 100
  reduceErosion: number; // 0 - 100
}

export interface ClimateStressScenario {
  rainDeltaPct: number; // -30 to +20
  tempDeltaC: number;   // 0 to +3.0
}

export interface LocalSoilProfile {
  municipality: string;
  regionLabel: string;
  countryCode: 'BR' | 'US' | 'KE' | 'GLOBAL';
  confidenceLevel: 'Alta' | 'Média';
  dataSourceLabel: string;
  soilClass: string;
  texture: string;
  organicMatterPct: number;
  waterRetentionCapacity: 'Baixa' | 'Média' | 'Alta';
  availableWaterCapacityMm: number; // SoilGrids AWC
  erosionSusceptibility: 'Baixa' | 'Moderada' | 'Alta';
  historicalYieldTonHa: Record<CropId, number>;
  notes: string;
}

export interface NasaMetrics {
  sourceMode: 'live-power' | 'hybrid-cache';
  power: {
    avgTempC: number;               // T2M (°C) ~50km
    annualPrecipMm: number;         // PRECTOTCORR (mm/yr) ~50km
    evapotranspirationMmDay: number;// EVPTRNS (mm/day) ~50km
    waterDeficitMmSeason: number;
    frostRiskDays: number;          // Tmin <= 2°C days/yr
    extremeRainDays: number;        // P95 heavy rain days/yr
  };
  smap: {
    soilMoisturePct: number;        // 9km root zone
    moistureAnomalyPct: number;     // vs climatology
    rootZoneStatus: 'Seco' | 'Adequado' | 'Úmido';
  };
  ecostress: {
    surfaceTempC: number;           // ~70m (optional evidence)
    heatStressDays: number;
  };
  gpm: {
    accumulatedRain90dMm: number;   // 10km
    rainAnomalyPct: number;
  };
  modis: {
    meanNdvi: number;               // 30m HLS / 250m MODIS
    bareSoilMonths: string;
    monthlyNdvi: number[];          // 12 months (Jan..Dec)
  };
  erosion: {
    riskIndex: number;              // 0 - 100 (NASADEM + GPM + NDVI)
    riskLevel: 'Baixo' | 'Moderado' | 'Alto';
  };
}

export interface GridCell500m {
  id: string;
  geometry: GeoJSON.Polygon;
  center: [number, number]; // [lng, lat]
  moisturePct: number;
  ndvi: number;
  erosionRisk: number;
  surfaceTempC: number;
}

export interface FarmAnalysis {
  polygonGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
  areaHa: number;
  centroid: [number, number]; // [lat, lng]
  gridCells: GridCell500m[];
  nasa: NasaMetrics;
  soil: LocalSoilProfile;
  detectedCropHistory: string;
  analyzedAt: string;
}

export interface BacktestYearPoint {
  year: number;
  relYieldPct: number; // 0 - 110% of potential
  status: 'seca' | 'excesso' | 'normal';
}

export interface ScenarioScores {
  waterUse: number;       // 0 - 100
  yieldPotential: number; // 0 - 100
  soilBenefit: number;    // 0 - 100
  overall: number;        // Weighted
}

export interface RotationScenario {
  id: 'baseline' | 'cover-legume' | 'drought-tolerant';
  title: string;
  subtitle: string;
  sequence: string[];
  badge: string;
  recommended: boolean;
  scores: ScenarioScores;
  backtest: {
    p10YieldPct: number;
    p50YieldPct: number;
    p90YieldPct: number;
    failureRiskPct: number; // % of years < 60% yield
    yearlySeries: BacktestYearPoint[];
  };
  impact: {
    waterSavedM3Ha: number;
    nitrogenFixedKgHa: string; // Always expressed as range per v2 proposal
    estMarginBrlHa: number;
  };
  summary: string;
  nasaEvidence: string[];
  benefits: string[];
  dataGaps: string[];
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
