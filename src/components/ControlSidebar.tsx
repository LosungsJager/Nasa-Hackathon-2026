import { CheckSquare, Globe, Layers, Leaf, Sliders } from 'lucide-react';
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
  { id: 'hybrid_hd', label: 'Satélite HD + Ruas', scale: 'Zoom 18' },
  { id: 'osm_streets', label: 'Mapa de Ruas (OSM)', scale: 'Zoom 19' },
  { id: 'viirs_truecolor', label: 'NASA VIIRS True Color', scale: '375 m' },
  { id: 'modis_truecolor', label: 'NASA MODIS True Color', scale: '250 m' },
  { id: 'bluemarble', label: 'NASA Blue Marble', scale: '500 m' },
];

const GIBS_OPTIONS: { id: GibsLayerId; label: string; scale: string }[] = [
  { id: 'none', label: 'Sem sobreposição', scale: 'Base nítida' },
  { id: 'modis_ndvi', label: 'MODIS NDVI (8d)', scale: '250 m' },
  { id: 'smap_l4', label: 'SMAP L4 Umidade', scale: '9 km' },
  { id: 'gpm_imerg', label: 'GPM IMERG Chuva', scale: '10 km' },
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

  const wWater = Math.max(5, priorities.lessWater);
  const wIncome = Math.max(5, priorities.moreIncome);
  const wSoil = Math.max(5, priorities.improveSoil + priorities.reduceErosion * 0.6);
  const wTotal = wWater + wIncome + wSoil;

  return (
    <aside className="control-sidebar" aria-label="Parâmetros do talhão">
      <div className="sidebar-section">
        <div className="section-title">
          <Leaf size={13} />
          <span>Cultura atual</span>
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

      <div className="sidebar-section">
        <div className="section-title">
          <CheckSquare size={13} />
          <span>Restrições</span>
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
            <span>Irrigação suplementar</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasNoTillPlanter}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasNoTillPlanter: e.target.checked })
              }
            />
            <span>Plantadeira direta</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasLivestock}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasLivestock: e.target.checked })
              }
            />
            <span>Integração gado / leite</span>
          </label>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <Sliders size={13} />
          <span>Pesos do score</span>
        </div>
        <div className="weights-summary">
          Água {Math.round((wWater / wTotal) * 100)}% • Renda{' '}
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

      <div className="sidebar-section">
        <div className="section-title">
          <Globe size={13} />
          <span>Mapa Base NASA (GIBS)</span>
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
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <Layers size={13} />
          <span>Sobreposição NASA GIBS</span>
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
      </div>

      {analysis && (
        <div className="sidebar-section">
          <div className="soil-box">
            <strong>{analysis.soil.municipality} ({analysis.areaHa} ha)</strong>
            <p>
              {analysis.soil.soilClass} • AWC {analysis.soil.availableWaterCapacityMm} mm
            </p>
            <p className="soil-src">{analysis.soil.dataSourceLabel}</p>
          </div>

          <div className="cmr-box">
            <span className="cmr-title">Catálogo NASA CMR:</span>
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
          </div>
        </div>
      )}
    </aside>
  );
}
