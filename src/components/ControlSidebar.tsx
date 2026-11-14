import { CheckSquare, ChevronDown, Globe, Layers, Leaf, Sliders } from 'lucide-react';
import type {
  CropId,
  CropInfo,
  FarmAnalysis,
  FarmerConstraints,
  FarmerPriorities,
  GibsLayerId,
  NasaBasemapId,
} from '../types/agro';

interface ControlSidebarProps {
  cropsCatalog: Record<CropId, CropInfo>;
  currentCrop: CropId;
  onCropChange: (crop: CropId) => void;
  priorities: FarmerPriorities;
  onPrioritiesChange: (next: FarmerPriorities) => void;
  constraints: FarmerConstraints;
  onConstraintsChange: (next: FarmerConstraints) => void;
  basemap: NasaBasemapId;
  onBasemapChange: (basemap: NasaBasemapId) => void;
  gibsLayer: GibsLayerId;
  onGibsLayerChange: (layer: GibsLayerId) => void;
  analysis: FarmAnalysis | null;
}

const NASA_BASEMAP_OPTIONS: { id: NasaBasemapId; label: string; scale: string }[] = [
  { id: 'hybrid_hd', label: 'Satélite + Ruas', scale: 'Detalhado' },
  { id: 'osm_streets', label: 'Mapa de Ruas', scale: 'Estradas' },
  { id: 'viirs_truecolor', label: 'NASA VIIRS', scale: 'Regional' },
  { id: 'modis_truecolor', label: 'NASA MODIS', scale: 'Regional' },
  { id: 'bluemarble', label: 'NASA Blue Marble', scale: 'Global' },
];

const GIBS_OPTIONS: { id: GibsLayerId; label: string; scale: string }[] = [
  { id: 'none', label: 'Desligada', scale: 'Mapa limpo' },
  { id: 'modis_ndvi', label: 'Vegetação (NDVI)', scale: 'NASA 250m' },
  { id: 'smap_l4', label: 'Umidade do solo', scale: 'NASA 9km' },
  { id: 'gpm_imerg', label: 'Chuva recente', scale: 'NASA 10km' },
];

export function ControlSidebar({
  cropsCatalog,
  currentCrop,
  onCropChange,
  priorities,
  onPrioritiesChange,
  constraints,
  onConstraintsChange,
  basemap,
  onBasemapChange,
  gibsLayer,
  onGibsLayerChange,
  analysis,
}: ControlSidebarProps) {
  const updatePriority = (key: keyof FarmerPriorities, value: number) => {
    onPrioritiesChange({ ...priorities, [key]: value });
  };

  return (
    <aside className="control-sidebar" aria-label="Configuração da lavoura">
      <div className="sidebar-section">
        <div className="section-title">
          <Leaf size={13} />
          <span>1. O que você planta hoje?</span>
        </div>
        <select
          aria-label="Cultura atual"
          className="sidebar-select"
          value={currentCrop}
          onChange={(e) => onCropChange(e.target.value as CropId)}
        >
          {(Object.keys(cropsCatalog) as CropId[]).map((id) => (
            <option key={id} value={id}>
              {cropsCatalog[id].name}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <CheckSquare size={13} />
          <span>2. O que tem na propriedade?</span>
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
            <span>Tenho irrigação</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasNoTillPlanter}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasNoTillPlanter: e.target.checked })
              }
            />
            <span>Faço plantio direto</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasLivestock}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasLivestock: e.target.checked })
              }
            />
            <span>Tenho gado / pastagem</span>
          </label>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <Sliders size={13} />
          <span>3. Qual seu foco agora?</span>
        </div>
        <div className="layer-buttons-list" style={{ marginBottom: 6 }}>
          {[
            {
              label: 'Equilibrado (recomendado)',
              vals: { lessWater: 75, moreIncome: 65, improveSoil: 80, reduceErosion: 60 },
            },
            {
              label: 'Evitar falta de água / seca',
              vals: { lessWater: 95, moreIncome: 50, improveSoil: 70, reduceErosion: 50 },
            },
            {
              label: 'Focar em mais colheita',
              vals: { lessWater: 45, moreIncome: 95, improveSoil: 55, reduceErosion: 40 },
            },
            {
              label: 'Recuperar solo e conter erosão',
              vals: { lessWater: 60, moreIncome: 45, improveSoil: 95, reduceErosion: 95 },
            },
          ].map((preset) => {
            const isActive =
              priorities.lessWater === preset.vals.lessWater &&
              priorities.moreIncome === preset.vals.moreIncome &&
              priorities.improveSoil === preset.vals.improveSoil &&
              priorities.reduceErosion === preset.vals.reduceErosion;
            return (
              <button
                key={preset.label}
                type="button"
                className={`layer-row-btn ${isActive ? 'active' : ''}`}
                onClick={() => onPrioritiesChange(preset.vals)}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        <details className="sidebar-details">
          <summary className="details-summary">
            <span>Ajuste fino (%)</span>
            <ChevronDown size={13} />
          </summary>
          <div className="details-body" style={{ paddingTop: 8 }}>
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
                  <span>Mais colheita</span>
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
                  <span>Proteger o solo</span>
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
        </details>
      </div>

      {analysis && (
        <div className="sidebar-section">
          <div className="soil-box">
            <strong>{analysis.soil.municipality} ({analysis.areaHa} ha)</strong>
            <p>{analysis.soil.soilClass}</p>
            <p className="soil-src">
              Retenção de água: {analysis.soil.waterRetentionCapacity} ({analysis.soil.availableWaterCapacityMm} mm)
            </p>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <details className="sidebar-details">
          <summary className="details-summary">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} />
              Visão do mapa e satélites
            </span>
            <ChevronDown size={14} />
          </summary>

          <div className="details-body">
            <div className="section-title" style={{ marginTop: 8 }}>
              <Globe size={12} />
              <span>Tipo de mapa</span>
            </div>
            <div className="layer-buttons-list">
              {NASA_BASEMAP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`layer-row-btn ${basemap === opt.id ? 'active' : ''}`}
                  onClick={() => onBasemapChange(opt.id)}
                >
                  <span>{opt.label}</span>
                  <small>{opt.scale}</small>
                </button>
              ))}
            </div>

            <div className="section-title" style={{ marginTop: 10 }}>
              <Layers size={12} />
              <span>Camada de satélite (NASA)</span>
            </div>
            <div className="layer-buttons-list">
              {GIBS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`layer-row-btn ${gibsLayer === opt.id ? 'active' : ''}`}
                  onClick={() => onGibsLayerChange(opt.id)}
                >
                  <span>{opt.label}</span>
                  <small>{opt.scale}</small>
                </button>
              ))}
            </div>

            {analysis && (
              <div className="cmr-box" style={{ marginTop: 10 }}>
                <span className="cmr-title">Fontes consultadas no talhão:</span>
                {analysis.indicators.cmrGranules.map((g) => (
                  <div key={g.shortName} className="cmr-row">
                    <span>{g.dataset}</span>
                    <span className="cmr-val">
                      {g.status === 'ok'
                        ? `${g.granuleCount} (${g.latestDate ?? 's/d'})`
                        : 'offline'}
                    </span>
                  </div>
                ))}
                {analysis.indicators.sentinel2Summary && (
                  <div className="cmr-row">
                    <span>Sentinel-2 L2A (10m)</span>
                    <span className="cmr-val">
                      {analysis.indicators.sentinel2Summary.status === 'ok'
                        ? `${analysis.indicators.sentinel2Summary.sceneCount} (${analysis.indicators.sentinel2Summary.latestDate ?? 's/d'})`
                        : 'offline'}
                    </span>
                  </div>
                )}
                {analysis.indicators.era5Summary && (
                  <div className="cmr-row">
                    <span>ECMWF ERA5 (2024)</span>
                    <span className="cmr-val">
                      {analysis.indicators.era5Summary.status === 'ok'
                        ? `${analysis.indicators.era5Summary.meanTempC}°C • ${analysis.indicators.era5Summary.totalPrecipMm}mm`
                        : 'offline'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </details>
      </div>
    </aside>
  );
}
