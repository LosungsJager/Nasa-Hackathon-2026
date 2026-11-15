import { CheckSquare, ChevronDown, Globe, Layers, Leaf, Sliders } from 'lucide-react';
import { getCropDisplayName, tr, translateLevel, type Lang } from '../i18n';
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
  lang: Lang;
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

const NASA_BASEMAP_OPTIONS: { id: NasaBasemapId; pt: string; en: string; scalePt: string; scaleEn: string }[] = [
  { id: 'hybrid_hd', pt: 'Satélite + Ruas', en: 'Satellite + Streets', scalePt: 'Detalhado', scaleEn: 'Detailed' },
  { id: 'osm_streets', pt: 'Mapa de Ruas', en: 'Street Map', scalePt: 'Estradas', scaleEn: 'Roads' },
  { id: 'viirs_truecolor', pt: 'NASA VIIRS', en: 'NASA VIIRS', scalePt: 'Regional', scaleEn: 'Regional' },
  { id: 'modis_truecolor', pt: 'NASA MODIS', en: 'NASA MODIS', scalePt: 'Regional', scaleEn: 'Regional' },
  { id: 'bluemarble', pt: 'NASA Blue Marble', en: 'NASA Blue Marble', scalePt: 'Global', scaleEn: 'Global' },
];

const GIBS_OPTIONS: { id: GibsLayerId; pt: string; en: string; scalePt: string; scaleEn: string }[] = [
  { id: 'none', pt: 'Desligada', en: 'Off', scalePt: 'Mapa limpo', scaleEn: 'Clean map' },
  { id: 'modis_ndvi', pt: 'Vegetação (NDVI)', en: 'Vegetation (NDVI)', scalePt: 'NASA 250m', scaleEn: 'NASA 250m' },
  { id: 'smap_l4', pt: 'Umidade do solo', en: 'Soil Moisture', scalePt: 'NASA 9km', scaleEn: 'NASA 9km' },
  { id: 'gpm_imerg', pt: 'Chuva recente', en: 'Recent Rain', scalePt: 'NASA 10km', scaleEn: 'NASA 10km' },
];

export function ControlSidebar({
  lang,
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
    <aside className="control-sidebar" aria-label={tr(lang, 'Configuração da lavoura', 'Farm setup')}>
      <div className="sidebar-section">
        <div className="section-title">
          <Leaf size={13} />
          <span>{tr(lang, '1. O que você planta hoje?', '1. What do you grow today?')}</span>
        </div>
        <select
          aria-label={tr(lang, 'Cultura atual', 'Current crop')}
          className="sidebar-select"
          value={currentCrop}
          onChange={(e) => onCropChange(e.target.value as CropId)}
        >
          {(Object.keys(cropsCatalog) as CropId[]).map((id) => (
            <option key={id} value={id}>
              {getCropDisplayName(id, cropsCatalog[id].name, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <CheckSquare size={13} />
          <span>{tr(lang, '2. O que tem na propriedade?', '2. Farm equipment & setup')}</span>
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
            <span>{tr(lang, 'Tenho irrigação', 'I have irrigation')}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasNoTillPlanter}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasNoTillPlanter: e.target.checked })
              }
            />
            <span>{tr(lang, 'Faço plantio direto', 'I use no-till planting')}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={constraints.hasLivestock}
              onChange={(e) =>
                onConstraintsChange({ ...constraints, hasLivestock: e.target.checked })
              }
            />
            <span>{tr(lang, 'Tenho gado / pastagem', 'I have livestock / pasture')}</span>
          </label>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <Sliders size={13} />
          <span>{tr(lang, '3. Qual seu foco agora?', '3. Main goal right now')}</span>
        </div>
        <div className="layer-buttons-list" style={{ marginBottom: 6 }}>
          {[
            {
              label: tr(lang, 'Equilibrado (recomendado)', 'Balanced (recommended)'),
              vals: { lessWater: 75, moreIncome: 65, improveSoil: 80, reduceErosion: 60 },
            },
            {
              label: tr(lang, 'Evitar falta de água / seca', 'Save water / drought safety'),
              vals: { lessWater: 95, moreIncome: 50, improveSoil: 70, reduceErosion: 50 },
            },
            {
              label: tr(lang, 'Focar em mais colheita', 'Maximize harvest & income'),
              vals: { lessWater: 45, moreIncome: 95, improveSoil: 55, reduceErosion: 40 },
            },
            {
              label: tr(lang, 'Recuperar solo e conter erosão', 'Rebuild soil & stop erosion'),
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
            <span>{tr(lang, 'Ajuste fino (%)', 'Fine-tune (%)')}</span>
            <ChevronDown size={13} />
          </summary>
          <div className="details-body" style={{ paddingTop: 8 }}>
            <div className="priority-sliders">
              <label className="slider-row">
                <div className="slider-header">
                  <span>{tr(lang, 'Economizar água', 'Save water')}</span>
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
                  <span>{tr(lang, 'Mais colheita', 'More harvest')}</span>
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
                  <span>{tr(lang, 'Proteger o solo', 'Soil health')}</span>
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
                  <span>{tr(lang, 'Conter erosão', 'Stop erosion')}</span>
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
              {tr(lang, 'Retenção de água', 'Water retention')}: {translateLevel(analysis.soil.waterRetentionCapacity, lang)} ({analysis.soil.availableWaterCapacityMm} mm)
            </p>
          </div>
        </div>
      )}

      <div className="sidebar-section">
        <details className="sidebar-details">
          <summary className="details-summary">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Layers size={13} />
              {tr(lang, 'Visão do mapa e satélites', 'Map & satellite layers')}
            </span>
            <ChevronDown size={14} />
          </summary>

          <div className="details-body">
            <div className="section-title" style={{ marginTop: 8 }}>
              <Globe size={12} />
              <span>{tr(lang, 'Tipo de mapa', 'Map style')}</span>
            </div>
            <div className="layer-buttons-list">
              {NASA_BASEMAP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`layer-row-btn ${basemap === opt.id ? 'active' : ''}`}
                  onClick={() => onBasemapChange(opt.id)}
                >
                  <span>{lang === 'en' ? opt.en : opt.pt}</span>
                  <small>{lang === 'en' ? opt.scaleEn : opt.scalePt}</small>
                </button>
              ))}
            </div>

            <div className="section-title" style={{ marginTop: 10 }}>
              <Layers size={12} />
              <span>{tr(lang, 'Camada de satélite (NASA)', 'NASA satellite overlay')}</span>
            </div>
            <div className="layer-buttons-list">
              {GIBS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`layer-row-btn ${gibsLayer === opt.id ? 'active' : ''}`}
                  onClick={() => onGibsLayerChange(opt.id)}
                >
                  <span>{lang === 'en' ? opt.en : opt.pt}</span>
                  <small>{lang === 'en' ? opt.scaleEn : opt.scalePt}</small>
                </button>
              ))}
            </div>

            {analysis && (
              <div className="cmr-box" style={{ marginTop: 10 }}>
                <span className="cmr-title">
                  {tr(lang, 'Fontes consultadas no talhão:', 'Live sources queried:')}
                </span>
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
