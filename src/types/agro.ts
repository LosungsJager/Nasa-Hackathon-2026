export type GibsLayerId = 'none' | 'modis_ndvi' | 'smap_l4' | 'gpm_imerg';

export type NasaBasemapId = 'viirs_truecolor' | 'modis_truecolor' | 'bluemarble';

export type AppViewMode = 'map' | 'crops' | 'methodology';

export type DataProvenance = 'medido' | 'derivado' | 'premissa';

export type CropId =
  | 'soja'
  | 'milho'
  | 'algodao'
  | 'trigo'
  | 'feijao'
  | 'azevem'
  | 'aveia'
  | 'canola'
  | 'mandioca';

export interface CropInfo {
  id: CropId;
  name: string;
  cycleDays: number;
  waterDemandMm: number;
  kc: number;
  ky: number;
  nitrogenFixing: boolean;
  heatTolerance: 'Baixa' | 'Média' | 'Alta';
  residueCover: 'Baixa' | 'Média' | 'Alta';
  pestBreakRole: string;
  defaultSecondCrop: string;
  sourceRef: string;
}

export interface FarmerPriorities {
  lessWater: number;
  moreIncome: number;
  improveSoil: number;
  reduceErosion: number;
}

export interface FarmerConstraints {
  hasIrrigation: boolean;
  hasNoTillPlanter: boolean;
  hasLivestock: boolean;
}

export interface ClimateStressScenario {
  rainDeltaPct: number;
  tempDeltaC: number;
}

export interface DailyClimateDay {
  date: string; // YYYYMMDD
  year: number;
  month: number;
  t2m: number;
  t2mMin: number;
  t2mMax: number;
  rh2m: number;
  ws2m: number;
  precipMm: number;
  et0Mm: number;
}

export interface CmrGranuleSummary {
  dataset: string;
  shortName: string;
  granuleCount: number;
  latestDate: string | null;
  status: 'ok' | 'offline';
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
  availableWaterCapacityMm: number;
  erosionSusceptibility: 'Baixa' | 'Moderada' | 'Alta';
  historicalYieldTonHa: Partial<Record<CropId, number>>;
  notes: string;
}

export interface FieldIndicators {
  powerSource: 'live-daily' | 'offline-fallback';
  powerPeriod: string;
  annualAvgTempC: number;        // Medido (NASA POWER T2M)
  annualMeanPrecipMm: number;    // Medido (NASA POWER PRECTOTCORR)
  meanRh2mPct: number;           // Medido (NASA POWER RH2M)
  meanEt0MmDay: number;          // Derivado (Hargreaves/POWER)
  frostDaysPerYear: number;      // Medido (POWER T2M_MIN <= 2°C)
  heatStressDaysPerYear: number; // Medido (POWER T2M_MAX >= 32°C)
  extremeRainDaysPerYear: number;// Medido (POWER PRECTOTCORR >= P95)
  seasonalWaterDeficitMm: number;// Derivado (balanço hídrico)
  estimatedErosionIndex: number; // Derivado (chuva POWER + declividade/solo)
  erosionLevel: 'Baixo' | 'Moderado' | 'Alto';
  cmrGranules: CmrGranuleSummary[];
}

export interface FarmAnalysis {
  polygonGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
  areaHa: number;
  centroid: [number, number]; // [lat, lng]
  dailyClimate: DailyClimateDay[];
  indicators: FieldIndicators;
  soil: LocalSoilProfile;
  analyzedAt: string;
}

export interface BacktestYearPoint {
  year: number;
  relYieldPct: number;
  seasonRainMm: number;
  seasonEtcMm: number;
  status: 'seca' | 'excesso' | 'normal';
}

export interface ScenarioScores {
  waterIndex: number;   // Índice comparativo 0-100
  yieldIndex: number;   // Índice comparativo 0-100
  soilIndex: number;    // Índice comparativo 0-100
  overall: number;      // Soma ponderada pelos pesos
}

export interface SensitivityResult {
  kcMinus20Winner: string;
  kcPlus20Winner: string;
  kyMinus20Winner: string;
  kyPlus20Winner: string;
  isStable: boolean;
}

export interface RotationScenario {
  id: 'baseline' | 'cover-legume' | 'drought-tolerant' | 'forage-livestock';
  title: string;
  subtitle: string;
  sequence: string[];
  recommended: boolean;
  scores: ScenarioScores;
  backtest: {
    p10YieldPct: number;
    p50YieldPct: number;
    p90YieldPct: number;
    failureRiskPct: number;
    yearlySeries: BacktestYearPoint[];
  };
  impact: {
    waterSavedM3Ha: number;       // Calculado da diferença de ETc/ETa
    nitrogenFixedKgHa: string;    // Faixa Embrapa
    estMarginBrlHa: number;       // Estimativa ilustrativa
  };
  supportingData: { text: string; provenance: DataProvenance }[];
  benefits: string[];
  dataGaps: string[];
  agronomistNotes: string;
}

export interface RegionPreset {
  id: string;
  name: string;
  subtitle: string;
  center: [number, number];
  zoom: number;
  defaultCrop: CropId;
  polygonCoords: [number, number][];
}
