import {
  CheckSquare,
  Layers,
  Leaf,
  Satellite,
  Sliders,
} from 'lucide-react';
import type {
  CropId,
  CropInfo,
  FarmAnalysis,
  FarmerConstraints,
  FarmerPriorities,
  GibsLayerId,
} from '../types/agro';

interface ControlSidebarProps {
  cropsCatalog: Record<CropId, CropInfo>;
  currentCrop: CropId;
  onCropChange: (crop: CropId) => void;
  priorities: FarmerPriorities;
  onPrioritiesChange: (next: FarmerPriorities) => void;
  constraints: FarmerConstraints;
  onConstraintsChange: (next: FarmerConstraints) => void;
  gibsLayer: GibsLayerId;
  onGibsLayerChange: (layer: GibsLayerId) => void;
  analysis: FarmAnalysis | null;
}

const GIBS_OPTIONS: { id: GibsLayerId; label: string; scale: string }[] = [
  { id: 'none', label: 'Apenas imagem base', scale: 'Esri' },
  { id: 'modis_ndvi', label: 'MODIS NDVI (8 dias)', scale: '250 m' },
  { id: 'smap_l4', label: 'SMAP L4 Zona Radicular', scale: '9 km' },
  { id: 'gpm_imerg', label: 'GPM IMERG Precipitação', scale: '10 km' },
];

export function ControlSidebar({
  cropsCatalog,
  currentCrop,
  onCropChange,
  priorities,
  onPrioritiesChange,
  constraints,
  onConstraintsChange,
  gibsLayer,
  onGibsLayerChange,
  analysis,
}: ControlSidebarProps) {
  const updatePriority = (key: keyof FarmerPriorities, value: number) => {
    onPrioritiesChange({ ...priorities, [key]: value });
  };

  const wWater = Math.max(5, priorities.lessWater);
  const wIncome = Math.max(5, priorities.moreIncome);
  const wSoil = Math.max(5, priorities.improveSoil + priorities.reduceErosion * 0.6);
  const wTotal = wWater + wIncome + wSoil;

  return (
    <aside className="control-sidebar" aria-label="Configurações do talhão">
      {/* 1. Crop Selection */}
      <div className="sidebar-section">
        <div className="section-title">
          <Leaf size={14} />
          <span>Cultura atual (editável)</span>
        </div>
        <select
          aria-label="Cultura atual"
          className="sidebar-select"
          value={currentCrop}
          onChange={(e) => onCropChange(e.target.value as CropId)}
        >
          {(Object.keys(cropsCatalog) as CropId[]).map((id) => (
            <option key={id} value={id}>
              {cropsCatalog[id].name} (Kc {cropsCatalog[id].kc})
            </option>
          ))}
        </select>
      </div>

      {/* 2. Constraints */}
      <div className="sidebar-section">
        <div className="section-title">
          <CheckSquare size={14} />
          <span>Restrições da propriedade</span>
        </div>
        <div className="constraints-list">
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasIrrigation}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasIrrigation: e.target.checked })
              }
            />
            <span>Possui irrigação suplementar</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasNoTillPlanter}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasNoTillPlanter: e.target.checked })
              }
            />
            <span>Maquinário de plantio direto</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasLivestock}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasLivestock: e.target.checked })
              }
            />
            <span>Integração com gado / leite</span>
          </label>
        </div>
      </div>

      {/* 3. Farmer Priorities with explicit weights */}
      <div className="sidebar-section">
        <div className="section-title">
          <Sliders size={14} />
          <span>Prioridades e pesos do score</span>
        </div>
        <div className="weights-summary">
          Pesos: Água {Math.round((wWater / wTotal) * 100)}% • Renda{' '}
          {Math.round((wIncome / wTotal) * 100)}% • Solo {Math.round((wSoil / wTotal) * 100)}%
        </div>
        <div className="priority-sliders">
          <label className="slider-row">
            <div className="slider-header">
              <span>Economizar água</span>
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
              <span>Renda / rendimento</span>
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
              <span>Cobertura e solo</span>
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
              <span>Conter erosão</span>
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

      {/* 4. Live NASA GIBS Map Layer */}
      <div className="sidebar-section">
        <div className="section-title">
          <Layers size={14} />
          <span>Camada NASA GIBS (ao vivo)</span>
        </div>
        <div className="layer-buttons">
          {GIBS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`layer-btn ${gibsLayer === opt.id ? 'active' : ''}`}
              onClick={() => onGibsLayerChange(opt.id)}
            >
              <div className="layer-btn-text">
                <span>{opt.label}</span>
                <small>{opt.scale}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Field Indicators: Measured vs Derived */}
      {analysis && (
        <div className="sidebar-section">
          <div className="section-title">
            <Satellite size={14} />
            <span>Indicadores do talhão</span>
            <span
              className={`prov-badge ${
                analysis.indicators.powerSource === 'live-daily' ? 'medido' : 'derivado'
              }`}
            >
              {analysis.indicators.powerSource === 'live-daily'
                ? 'POWER medido'
                : 'Offline (estimado)'}
            </span>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-card measured">
              <span className="tel-label">POWER T média / Chuva</span>
              <strong className="tel-val">
                {analysis.indicators.annualAvgTempC}°C • {analysis.indicators.annualMeanPrecipMm}mm
              </strong>
              <small>Medido ({analysis.indicators.powerPeriod})</small>
            </div>

            <div className="telemetry-card measured">
              <span className="tel-label">Geada / Chuva P95</span>
              <strong className="tel-val">
                {analysis.indicators.frostDaysPerYear}d • {analysis.indicators.extremeRainDaysPerYear}d/ano
              </strong>
              <small>Medido (Tmin ≤ 2°C / P95)</small>
            </div>

            <div className="telemetry-card estimated">
              <span className="tel-label">ET₀ / Déficit sazonal</span>
              <strong className="tel-val">
                {analysis.indicators.meanEt0MmDay} mm/d • {analysis.indicators.seasonalWaterDeficitMm} mm
              </strong>
              <small>Derivado (Hargreaves)</small>
            </div>

            <div className="telemetry-card estimated">
              <span className="tel-label">Índice de erosão</span>
              <strong className="tel-val">
                {analysis.indicators.estimatedErosionIndex}/100 ({analysis.indicators.erosionLevel})
              </strong>
              <small>Derivado (solo + chuva)</small>
            </div>
          </div>

          <div className="soil-box">
            <strong>Solo ({analysis.soil.municipality})</strong>
            <p>
              {analysis.soil.soilClass} ({analysis.soil.texture}) • AWC {analysis.soil.availableWaterCapacityMm} mm •{' '}
              <em>{analysis.soil.dataSourceLabel}</em>
            </p>
          </div>

          <div className="cmr-box">
            <span className="cmr-title">Catálogo NASA CMR no polígono:</span>
            {analysis.indicators.cmrGranules.map((g) => (
              <div key={g.shortName} className="cmr-row">
                <span>{g.dataset}</span>
                <span className="cmr-val">
                  {g.status === 'ok'
                    ? `${g.granuleCount} cenas (${g.latestDate ?? 's/d'})`
                    : 'indisponível'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
