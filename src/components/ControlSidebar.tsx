import {
  CloudRain,
  Droplets,
  Layers,
  Leaf,
  Mountain,
  Satellite,
  Sliders,
  Thermometer,
} from 'lucide-react';
import { CROPS_CATALOG } from '../data/localAgroData';
import type {
  ActiveLayer,
  CropId,
  FarmAnalysis,
  FarmerPriorities,
} from '../types/agro';

interface ControlSidebarProps {
  currentCrop: CropId;
  onCropChange: (crop: CropId) => void;
  priorities: FarmerPriorities;
  onPrioritiesChange: (next: FarmerPriorities) => void;
  activeLayer: ActiveLayer;
  onLayerChange: (layer: ActiveLayer) => void;
  showGibsOverlay: boolean;
  onToggleGibsOverlay: () => void;
  analysis: FarmAnalysis | null;
}

const LAYER_OPTIONS: {
  id: ActiveLayer;
  label: string;
  source: string;
  icon: typeof Droplets;
}[] = [
  { id: 'moisture', label: 'Umidade do Solo', source: 'SMAP', icon: Droplets },
  { id: 'ndvi', label: 'Vegetação (NDVI)', source: 'MODIS', icon: Leaf },
  { id: 'erosion', label: 'Risco de Erosão', source: 'SRTM + GPM', icon: Mountain },
  { id: 'temperature', label: 'Temp. Superfície', source: 'ECOSTRESS', icon: Thermometer },
];

export function ControlSidebar({
  currentCrop,
  onCropChange,
  priorities,
  onPrioritiesChange,
  activeLayer,
  onLayerChange,
  showGibsOverlay,
  onToggleGibsOverlay,
  analysis,
}: ControlSidebarProps) {
  const updatePriority = (key: keyof FarmerPriorities, value: number) => {
    onPrioritiesChange({ ...priorities, [key]: value });
  };

  return (
    <aside className="control-sidebar" aria-label="Configurações da Fazenda e Camadas NASA">
      {/* 1. Current Crop */}
      <div className="sidebar-section">
        <div className="section-title">
          <Leaf size={15} />
          <span>Cultura Atual no Talhão</span>
        </div>
        <div className="crop-pills">
          {(Object.keys(CROPS_CATALOG) as CropId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`crop-pill ${currentCrop === id ? 'active' : ''}`}
              onClick={() => onCropChange(id)}
            >
              {CROPS_CATALOG[id].name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Farmer Priorities */}
      <div className="sidebar-section">
        <div className="section-title">
          <Sliders size={15} />
          <span>Prioridades do Agricultor</span>
        </div>
        <div className="priority-sliders">
          <label className="slider-row">
            <div className="slider-header">
              <span>Economizar Água</span>
              <span className="slider-val">{priorities.lessWater}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={priorities.lessWater}
              onChange={(e) => updatePriority('lessWater', Number(e.target.value))}
            />
          </label>

          <label className="slider-row">
            <div className="slider-header">
              <span>Mais Renda / Rendimento</span>
              <span className="slider-val">{priorities.moreIncome}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={priorities.moreIncome}
              onChange={(e) => updatePriority('moreIncome', Number(e.target.value))}
            />
          </label>

          <label className="slider-row">
            <div className="slider-header">
              <span>Melhorar Saúde do Solo</span>
              <span className="slider-val">{priorities.improveSoil}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={priorities.improveSoil}
              onChange={(e) => updatePriority('improveSoil', Number(e.target.value))}
            />
          </label>

          <label className="slider-row">
            <div className="slider-header">
              <span>Reduzir Risco de Erosão</span>
              <span className="slider-val">{priorities.reduceErosion}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={priorities.reduceErosion}
              onChange={(e) => updatePriority('reduceErosion', Number(e.target.value))}
            />
          </label>
        </div>
      </div>

      {/* 3. Map Layers */}
      <div className="sidebar-section">
        <div className="section-title">
          <Layers size={15} />
          <span>Camadas Harmonizadas (500 m)</span>
        </div>
        <div className="layer-buttons">
          {LAYER_OPTIONS.map((layer) => {
            const Icon = layer.icon;
            return (
              <button
                key={layer.id}
                type="button"
                id={`layer-btn-${layer.id}`}
                className={`layer-btn ${activeLayer === layer.id ? 'active' : ''}`}
                onClick={() => onLayerChange(layer.id)}
              >
                <Icon size={15} />
                <div className="layer-btn-text">
                  <span>{layer.label}</span>
                  <small>{layer.source}</small>
                </div>
              </button>
            );
          })}
        </div>

        <label className="gibs-toggle">
          <input
            type="checkbox"
            checked={showGibsOverlay}
            onChange={onToggleGibsOverlay}
          />
          <span>Sobrepor MODIS NDVI global (NASA GIBS)</span>
        </label>
      </div>

      {/* 4. Extracted NASA & Soil Telemetry */}
      {analysis && (
        <div className="sidebar-section telemetry-section">
          <div className="section-title">
            <Satellite size={15} />
            <span>Médias Extraídas no Polígono</span>
            <span
              className={`source-badge ${analysis.nasa.sourceMode}`}
              title={
                analysis.nasa.sourceMode === 'live-power'
                  ? 'NASA POWER API em tempo real'
                  : 'Modelo climático local'
              }
            >
              {analysis.nasa.sourceMode === 'live-power' ? 'POWER Live' : 'Híbrido'}
            </span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-card">
              <span className="tel-label">POWER Clima</span>
              <strong className="tel-val">
                {analysis.nasa.power.avgTempC}°C • {analysis.nasa.power.annualPrecipMm}mm
              </strong>
              <small>ET: {analysis.nasa.power.evapotranspirationMmDay} mm/d</small>
            </div>

            <div className="telemetry-card">
              <span className="tel-label">SMAP Umidade</span>
              <strong className="tel-val">{analysis.nasa.smap.soilMoisturePct}%</strong>
              <small>{analysis.nasa.smap.rootZoneStatus}</small>
            </div>

            <div className="telemetry-card">
              <span className="tel-label">ECOSTRESS LST</span>
              <strong className="tel-val">{analysis.nasa.ecostress.surfaceTempC}°C</strong>
              <small>{analysis.nasa.ecostress.heatStressDays} dias quentes</small>
            </div>

            <div className="telemetry-card">
              <span className="tel-label">MODIS NDVI</span>
              <strong className="tel-val">{analysis.nasa.modis.meanNdvi}</strong>
              <small>Exposto: {analysis.nasa.modis.bareSoilMonths}</small>
            </div>

            <div className="telemetry-card">
              <span className="tel-label">
                <CloudRain size={11} /> GPM 90d
              </span>
              <strong className="tel-val">{analysis.nasa.gpm.accumulatedRain90dMm} mm</strong>
              <small>Anomalia {analysis.nasa.gpm.rainAnomalyPct}%</small>
            </div>

            <div className="telemetry-card">
              <span className="tel-label">Erosão (USLE)</span>
              <strong className="tel-val">{analysis.nasa.erosion.riskIndex}/100</strong>
              <small>Nível {analysis.nasa.erosion.riskLevel}</small>
            </div>
          </div>

          <div className="soil-box">
            <strong>Solo Local ({analysis.soil.municipality}):</strong>
            <p>
              {analysis.soil.soilClass} — {analysis.soil.texture}. MO:{' '}
              {analysis.soil.organicMatterPct}%, Retenção:{' '}
              {analysis.soil.waterRetentionCapacity}.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
