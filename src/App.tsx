import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileDown, MapPin, Sprout } from 'lucide-react';
import { REGION_PRESETS } from './data/localAgroData';
import { analyzeFarmPolygon } from './services/nasaDataService';
import { evaluateRotationScenarios } from './engine/rotationEngine';
import { generateAgronomistPdf } from './utils/pdfReport';
import { ControlSidebar } from './components/ControlSidebar';
import { FarmMap } from './components/FarmMap';
import { RotationDrawer } from './components/RotationDrawer';
import type {
  ActiveLayer,
  CropId,
  FarmAnalysis,
  FarmerPriorities,
} from './types/agro';

export function App() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(REGION_PRESETS[0].id);
  const [mapCenter, setMapCenter] = useState<[number, number]>(REGION_PRESETS[0].center);
  const [mapZoom, setMapZoom] = useState<number>(REGION_PRESETS[0].zoom);

  const [currentCrop, setCurrentCrop] = useState<CropId>(REGION_PRESETS[0].defaultCrop);
  const [priorities, setPriorities] = useState<FarmerPriorities>({
    lessWater: 75,
    moreIncome: 65,
    improveSoil: 80,
    reduceErosion: 60,
  });

  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('moisture');
  const [showGibsOverlay, setShowGibsOverlay] = useState<boolean>(false);
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

  // Load initial demo farm on mount
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

  const scenarios = useMemo(() => {
    if (!analysis) return [];
    return evaluateRotationScenarios(analysis, currentCrop, priorities);
  }, [analysis, currentCrop, priorities]);

  const handleDownloadPdf = () => {
    if (!analysis || scenarios.length === 0) return;
    generateAgronomistPdf(analysis, currentCrop, priorities, scenarios);
  };

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="top-bar">
        <div className="brand-group">
          <div className="brand-logo">
            <Sprout size={20} />
          </div>
          <div>
            <h1>Field Shift</h1>
            <span className="brand-sub">
              Rotação de Cultivos • NASA Space Apps 2026
            </span>
          </div>
        </div>

        <div className="top-actions">
          <div className="preset-picker">
            <MapPin size={15} />
            <label htmlFor="region-preset-select" className="sr-only">
              Região de exemplo
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
            <FileDown size={16} />
            <span>Download PDF (Agrônomo)</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="workspace-body">
        <ControlSidebar
          currentCrop={currentCrop}
          onCropChange={setCurrentCrop}
          priorities={priorities}
          onPrioritiesChange={setPriorities}
          activeLayer={activeLayer}
          onLayerChange={setActiveLayer}
          showGibsOverlay={showGibsOverlay}
          onToggleGibsOverlay={() => setShowGibsOverlay((v) => !v)}
          analysis={analysis}
        />

        <main className="map-stage">
          <FarmMap
            center={mapCenter}
            zoom={mapZoom}
            analysis={analysis}
            activeLayer={activeLayer}
            showGibsOverlay={showGibsOverlay}
            isDrawing={isDrawing}
            onStartDrawing={() => setIsDrawing(true)}
            onCancelDrawing={() => setIsDrawing(false)}
            onPolygonComplete={handlePolygonComplete}
            onClearPolygon={() => setAnalysis(null)}
          />

          <RotationDrawer
            scenarios={scenarios}
            areaHa={analysis?.areaHa ?? null}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
