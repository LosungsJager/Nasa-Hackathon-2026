import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, FileDown, LayoutGrid, Map as MapIcon, MapPin, Sprout } from 'lucide-react';
import { DEFAULT_CROPS_CATALOG, REGION_PRESETS } from './data/localAgroData';
import { analyzeFarmPolygon } from './services/nasaDataService';
import { evaluateRotationScenarios, runSensitivityAnalysis } from './engine/rotationEngine';
import { generateAgronomistPdf } from './utils/pdfReport';
import { ControlSidebar } from './components/ControlSidebar';
import { FarmMap } from './components/FarmMap';
import { RotationDrawer } from './components/RotationDrawer';
import { CropDashboard } from './components/CropDashboard';
import { MethodologyView } from './components/MethodologyView';
import type {
  AppViewMode,
  ClimateStressScenario,
  CropId,
  CropInfo,
  FarmAnalysis,
  FarmerConstraints,
  FarmerPriorities,
  GibsLayerId,
  NasaBasemapId,
} from './types/agro';

export function App() {
  const [viewMode, setViewMode] = useState<AppViewMode>('map');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(REGION_PRESETS[0].id);
  const [mapCenter, setMapCenter] = useState<[number, number]>(REGION_PRESETS[0].center);
  const [mapZoom, setMapZoom] = useState<number>(REGION_PRESETS[0].zoom);

  const [cropsCatalog, setCropsCatalog] = useState<Record<CropId, CropInfo>>(DEFAULT_CROPS_CATALOG);
  const [currentCrop, setCurrentCrop] = useState<CropId>(REGION_PRESETS[0].defaultCrop);
  const [cropHistoryNote, setCropHistoryNote] = useState<string>(
    'Soja (verão) + milho/pousio nos últimos 4 anos'
  );

  const [priorities, setPriorities] = useState<FarmerPriorities>({
    lessWater: 75,
    moreIncome: 65,
    improveSoil: 80,
    reduceErosion: 60,
  });
  const [constraints, setConstraints] = useState<FarmerConstraints>({
    hasIrrigation: false,
    hasNoTillPlanter: true,
    hasLivestock: false,
  });
  const [climateStress, setClimateStress] = useState<ClimateStressScenario>({
    rainDeltaPct: 0,
    tempDeltaC: 0,
  });

  const [nasaBasemap, setNasaBasemap] = useState<NasaBasemapId>('hybrid_hd');
  const [gibsLayer, setGibsLayer] = useState<GibsLayerId>('none');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const [analysis, setAnalysis] = useState<FarmAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const runAnalysis = useCallback(async (coords: [number, number][]) => {
    setIsLoading(true);
    try {
      const result = await analyzeFarmPolygon(coords);
      setAnalysis(result);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runAnalysis(REGION_PRESETS[0].polygonCoords);
  }, [runAnalysis]);

  const handlePresetChange = (presetId: string) => {
    const preset = REGION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setMapCenter(preset.center);
    setMapZoom(preset.zoom);
    setCurrentCrop(preset.defaultCrop);
    setCropHistoryNote(`${DEFAULT_CROPS_CATALOG[preset.defaultCrop].name} nos últimos ciclos`);
    setIsDrawing(false);
    runAnalysis(preset.polygonCoords);
  };

  const handlePolygonComplete = useCallback(
    (coords: [number, number][]) => {
      setIsDrawing(false);
      runAnalysis(coords);
    },
    [runAnalysis]
  );

  const handleUpdateCropParam = (
    id: CropId,
    field: 'kc' | 'ky' | 'cycleDays',
    value: number
  ) => {
    setCropsCatalog((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const scenarios = useMemo(() => {
    if (!analysis) return [];
    return evaluateRotationScenarios(
      analysis,
      currentCrop,
      cropsCatalog,
      priorities,
      constraints,
      climateStress
    );
  }, [analysis, currentCrop, cropsCatalog, priorities, constraints, climateStress]);

  const sensitivity = useMemo(() => {
    if (!analysis) return null;
    return runSensitivityAnalysis(
      analysis,
      currentCrop,
      cropsCatalog,
      priorities,
      constraints,
      climateStress
    );
  }, [analysis, currentCrop, cropsCatalog, priorities, constraints, climateStress]);

  const handleDownloadPdf = () => {
    if (!analysis || scenarios.length === 0) return;
    generateAgronomistPdf(analysis, currentCrop, cropsCatalog, priorities, scenarios);
  };

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="top-bar">
        <div className="brand-group">
          <div className="brand-logo">
            <Sprout size={19} />
          </div>
          <div>
            <h1>Field Shift</h1>
          </div>
        </div>

        <nav className="view-switcher" aria-label="Navegação principal">
          <button
            type="button"
            id="tab-map"
            className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            <MapIcon size={15} />
            <span>Mapa &amp; Talhão</span>
          </button>
          <button
            type="button"
            id="tab-crops"
            className={`view-tab ${viewMode === 'crops' ? 'active' : ''}`}
            onClick={() => setViewMode('crops')}
          >
            <LayoutGrid size={15} />
            <span>Dashboard de Culturas</span>
          </button>
          <button
            type="button"
            id="tab-methodology"
            className={`view-tab ${viewMode === 'methodology' ? 'active' : ''}`}
            onClick={() => setViewMode('methodology')}
          >
            <BookOpen size={15} />
            <span>Dados &amp; Metodologia</span>
          </button>
        </nav>

        <div className="top-actions">
          <div className="preset-picker">
            <MapPin size={15} />
            <label htmlFor="region-preset-select" className="sr-only">
              Região
            </label>
            <select
              id="region-preset-select"
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              {REGION_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            id="btn-download-pdf"
            className="pdf-btn"
            disabled={!analysis || isLoading}
            onClick={handleDownloadPdf}
          >
            <FileDown size={15} />
            <span>Gerar relatório para o agrônomo</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="workspace-body">
        <ControlSidebar
          cropsCatalog={cropsCatalog}
          currentCrop={currentCrop}
          onCropChange={setCurrentCrop}
          priorities={priorities}
          onPrioritiesChange={setPriorities}
          constraints={constraints}
          onConstraintsChange={setConstraints}
          basemap={nasaBasemap}
          onBasemapChange={(b) => {
            setNasaBasemap(b);
            setViewMode('map');
          }}
          gibsLayer={gibsLayer}
          onGibsLayerChange={(layer) => {
            setGibsLayer(layer);
            setViewMode('map');
          }}
          analysis={analysis}
        />

        <main className="map-stage">
          {viewMode === 'map' && (
            <div className="workbench-split">
              <div className="workbench-center">
                <FarmMap
                  center={mapCenter}
                  zoom={mapZoom}
                  analysis={analysis}
                  basemap={nasaBasemap}
                  gibsLayer={gibsLayer}
                  isDrawing={isDrawing}
                  onStartDrawing={() => setIsDrawing(true)}
                  onCancelDrawing={() => setIsDrawing(false)}
                  onPolygonComplete={handlePolygonComplete}
                  onClearPolygon={() => setAnalysis(null)}
                  backtestSeries={scenarios[0]?.backtest.yearlySeries ?? []}
                  onOpenCropDashboard={() => setViewMode('crops')}
                />

                {analysis && (
                  <div className="indicators-strip" aria-label="Indicadores do talhão">
                    <div className="ind-cell measured">
                      <span className="ind-tag medido">MEDIDO • POWER</span>
                      <strong>
                        {analysis.indicators.annualAvgTempC}°C • {analysis.indicators.annualMeanPrecipMm} mm/ano • UR {analysis.indicators.meanRh2mPct}%
                      </strong>
                    </div>
                    <div className="ind-cell measured">
                      <span className="ind-tag medido">MEDIDO • EXTREMOS</span>
                      <strong>
                        Geada: {analysis.indicators.frostDaysPerYear}d • Calor ≥32°C: {analysis.indicators.heatStressDaysPerYear}d • P95: {analysis.indicators.extremeRainDaysPerYear}d
                      </strong>
                    </div>
                    <div className="ind-cell estimated">
                      <span className="ind-tag derivado">DERIVADO • ET₀</span>
                      <strong>
                        {analysis.indicators.meanEt0MmDay} mm/d • Déficit {analysis.indicators.seasonalWaterDeficitMm} mm
                      </strong>
                    </div>
                    <div className="ind-cell estimated">
                      <span className="ind-tag derivado">DERIVADO • EROSÃO / DEM</span>
                      <strong>
                        {analysis.indicators.estimatedErosionIndex}/100 ({analysis.indicators.erosionLevel})
                        {analysis.indicators.slopePct !== undefined
                          ? ` • Decliv. ${analysis.indicators.slopePct}% (${analysis.indicators.meanElevationM} m)`
                          : ''}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              <RotationDrawer
                scenarios={scenarios}
                areaHa={analysis?.areaHa ?? null}
                isLoading={isLoading}
                onOpenDetails={() => setViewMode('crops')}
              />
            </div>
          )}

          {viewMode === 'crops' && (
            <div className="stage-scroll">
              <CropDashboard
                analysis={analysis}
                cropsCatalog={cropsCatalog}
                onUpdateCropParam={handleUpdateCropParam}
                currentCrop={currentCrop}
                onCropChange={setCurrentCrop}
                cropHistoryNote={cropHistoryNote}
                onCropHistoryChange={setCropHistoryNote}
                climateStress={climateStress}
                onClimateStressChange={setClimateStress}
                scenarios={scenarios}
                sensitivity={sensitivity}
                isLoading={isLoading}
              />
            </div>
          )}

          {viewMode === 'methodology' && (
            <div className="stage-scroll">
              <MethodologyView analysis={analysis} />
            </div>
          )}
        </main>
      </div>

      {/* Footer Attribution */}
      <footer className="app-footer">
        <span>
          Equipe <strong>Lösungsjäger</strong> • NASA Space Apps Challenge 2026 (Lajeado, RS) • 14/11/2026
        </span>
        <span>
          Ferramenta de apoio à decisão — não substitui análise laboratorial de solo nem recomendação agronômica.
        </span>
      </footer>
    </div>
  );
}

export default App;
