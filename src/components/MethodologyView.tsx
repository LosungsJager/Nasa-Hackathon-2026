import { BookOpen, Database, ExternalLink, Globe, Info, Scale } from 'lucide-react';
import { tr, type Lang } from '../i18n';
import type { FarmAnalysis } from '../types/agro';

interface MethodologyViewProps {
  lang: Lang;
  analysis: FarmAnalysis | null;
}

const DATASETS_TABLE = [
  {
    name: 'NASA POWER (Daily AG)',
    nativeScale: '~50 km (0,5°)',
    statusPt: 'Medido (API ao vivo)',
    statusEn: 'Measured (Live API)',
    rolePt: 'Série diária 2005–2024 (T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, WS2M, radiação) para balanço hídrico, geada, calor e chuva P95.',
    roleEn: '2005–2024 daily series (T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, WS2M, solar) for water balance, frost, heat, and P95 rain.',
  },
  {
    name: 'NASA GIBS WMTS',
    nativeScale: '250 m (MODIS) / 9 km (SMAP) / 10 km (GPM)',
    statusPt: 'Medido (Tiles ao vivo)',
    statusEn: 'Measured (Live Tiles)',
    rolePt: 'Camadas espaciais (VIIRS, MODIS NDVI, SMAP L4, GPM IMERG) sobrepostas ao mapa sem reamostragem artificial.',
    roleEn: 'Spatial layers (VIIRS, MODIS NDVI, SMAP L4, GPM IMERG) overlaid on the map without artificial resampling.',
  },
  {
    name: 'NASA CMR (SMAP, ECOSTRESS, SRTM, GEDI L4A)',
    nativeScale: '9 km / 70 m / 30 m / 25 m (LiDAR)',
    statusPt: 'Metadados ao vivo',
    statusEn: 'Live Metadata',
    rolePt: 'Consulta de grânulos disponíveis no polígono via CMR Search API, incluindo biomassa/estrutura GEDI L4A.',
    roleEn: 'Available granules query over the field polygon via CMR Search API, including GEDI L4A biomass/structure.',
  },
  {
    name: 'Copernicus Sentinel-2 L2A (STAC)',
    nativeScale: '10–20 m',
    statusPt: 'Metadados ao vivo',
    statusEn: 'Live Metadata',
    rolePt: 'Contagem de cenas multiespectrais (red-edge/NIR/SWIR) e cobertura de nuvens recente no talhão.',
    roleEn: 'Multispectral scene count (red-edge/NIR/SWIR) and recent cloud cover over the field.',
  },
  {
    name: 'ECMWF ERA5 (Reanálise 2024)',
    nativeScale: '~31 km (0,25°)',
    statusPt: 'Medido/Reanálise (API ao vivo)',
    statusEn: 'Reanalysis (Live API)',
    rolePt: 'Validação cruzada de temperatura média, precipitação e ET₀ diária contra a série do NASA POWER.',
    roleEn: 'Cross-validation of 2024 mean temperature, rainfall, and daily ET₀ against NASA POWER.',
  },
  {
    name: 'ISRIC SoilGrids v2 + DEM 90m',
    nativeScale: '250 m (solo) / 90 m (relevo)',
    statusPt: 'API ao vivo / Curadoria local',
    statusEn: 'Live API / Local Curation',
    rolePt: 'Argila, areia, SOC e AWC via SoilGrids fora das 6 regiões curadas; altitude e declividade do polígono para erosão.',
    roleEn: 'Clay, sand, SOC, and AWC via SoilGrids outside curated regions; polygon elevation and slope for erosion.',
  },
  {
    name: 'Culturas & Manejo (FAO-56 / FAO-33)',
    nativeScale: 'Parâmetros editáveis',
    statusPt: 'Premissa (editável)',
    statusEn: 'Assumption (editable)',
    rolePt: 'Kc (FAO-56), Ky (FAO-33), fixação de N (Embrapa) e preços de referência (CONAB/EMATER).',
    roleEn: 'Kc (FAO-56), Ky (FAO-33), N fixation, and reference prices.',
  },
];

const GLOSSARY = [
  {
    termPt: 'ET₀ / ETc (Evapotranspiração)',
    termEn: 'ET₀ / ETc (Evapotranspiration)',
    meaningPt: 'Água consumida pela cultura. Calculada por Hargreaves a partir de T2M, Tmin e radiação solar do POWER.',
    meaningEn: 'Crop water demand. Calculated via Hargreaves from NASA POWER T2M, Tmin, and solar radiation.',
  },
  {
    termPt: 'P10 / P50 / P90 (Backtest 2005–2024)',
    termEn: 'P10 / P50 / P90 (2005–2024 Backtest)',
    meaningPt: 'P50 é a mediana em 20 safras; P10 mostra o pior cenário (seca ou chuva extrema).',
    meaningEn: 'P50 is the 20-season median yield; P10 shows the worst-case dry/extreme year.',
  },
  {
    termPt: 'Índices comparativos (0–100)',
    termEn: 'Comparative Scores (0–100)',
    meaningPt: 'Índices normalizados para comparar as 4 rotações entre si conforme as prioridades escolhidas.',
    meaningEn: 'Normalized indices to compare the 4 rotation options according to your chosen priorities.',
  },
];

export function MethodologyView({ lang, analysis }: MethodologyViewProps) {
  return (
    <div className="methodology-view">
      <div className="meth-hero dash-card">
        <div className="meth-hero-title">
          <Scale size={18} className="accent-leaf" />
          <div>
            <h2>{tr(lang, 'Escalas Nativas, Limitações e Modelo FAO-56', 'Native Scales, Limitations & FAO-56 Model')}</h2>
            <p>
              {tr(
                lang,
                'Separação explícita entre dado medido (NASA POWER/GIBS/CMR), dado derivado (balanço hídrico) e premissas da literatura.',
                'Clear separation between measured satellite/climate data (NASA POWER/GIBS/CMR), derived water balance, and literature assumptions.'
              )}
            </p>
          </div>
        </div>
        {analysis && (
          <div className="meth-active-adapter">
            <Globe size={15} />
            <span>
              {tr(lang, 'Adaptador de solo ativo', 'Active soil adapter')}: <strong>{analysis.soil.dataSourceLabel}</strong> ({tr(lang, 'Confiança', 'Confidence')}:{' '}
              {analysis.soil.confidenceLevel})
            </span>
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <a
            href="https://power.larc.nasa.gov/data-access-viewer/"
            target="_blank"
            rel="noopener noreferrer"
            className="panel-link-btn"
            style={{ display: 'inline-flex', textDecoration: 'none' }}
          >
            <span>{tr(lang, 'Abrir NASA POWER Data Access Viewer oficial', 'Open official NASA POWER Data Access Viewer')}</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="dash-card">
        <div className="section-title">
          <Database size={15} />
          <span>{tr(lang, 'Fontes de dados e estado atual da integração', 'Data sources & live integration status')}</span>
        </div>
        <div className="meth-table-wrap">
          <table className="meth-table">
            <thead>
              <tr>
                <th>{tr(lang, 'Fonte', 'Source')}</th>
                <th>{tr(lang, 'Escala nativa', 'Native scale')}</th>
                <th>{tr(lang, 'Estado', 'Status')}</th>
                <th>{tr(lang, 'Uso no sistema', 'Role in Farmboost')}</th>
              </tr>
            </thead>
            <tbody>
              {DATASETS_TABLE.map((row) => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td className="mono-cell">{row.nativeScale}</td>
                  <td>{lang === 'en' ? row.statusEn : row.statusPt}</td>
                  <td>{lang === 'en' ? row.roleEn : row.rolePt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-two-col">
        <div className="dash-card">
          <div className="section-title">
            <Info size={15} />
            <span>{tr(lang, 'Equações (FAO-56 e FAO-33) e Limitações', 'Equations (FAO-56 & FAO-33) & Limitations')}</span>
          </div>
          <p className="meth-prose">
            {tr(lang, 'Referências', 'References')}:{' '}
            <a
              href="https://www.fao.org/3/x0490e/x0490e00.htm"
              target="_blank"
              rel="noreferrer"
            >
              FAO Irrigation and Drainage Paper 56
            </a>{' '}
            {tr(lang, 'e', 'and')}{' '}
            <a
              href="https://www.fao.org/3/i2800e/i2800e00.htm"
              target="_blank"
              rel="noreferrer"
            >
              FAO-33 (Yield Response to Water)
            </a>
            .
          </p>
          <div className="formula-box">
            <code>ETc = Kc × ET₀</code>
            <code>{tr(lang, 'Produtividade Relativa', 'Relative Yield')} = 1 − Ky × (1 − ETa / ETc)</code>
          </div>
          <p className="meth-prose">
            <strong>{tr(lang, 'Limitações declaradas:', 'Declared limitations:')}</strong>{' '}
            {tr(
              lang,
              '(1) Validação estatística contra quebra histórica municipal (IBGE-PAM / EMATER-RS) ainda não executada; (2) GRACE (armazenamento regional de água, ~300 km) previsto como próximo passo; (3) Leituras locais de pluviômetro e análise de solo (0–20 cm) devem ser levadas ao agrônomo para calibração.',
              '(1) Statistical validation against municipal historical yield records (IBGE-PAM / USDA) is not yet included; (2) GRACE (~300 km regional water storage) is planned as next step; (3) Local rain-gauge and 0–20 cm lab soil tests should be used by an agronomist for calibration.'
            )}
          </p>
        </div>

        <div className="dash-card">
          <div className="section-title">
            <BookOpen size={15} />
            <span>{tr(lang, 'Glossário', 'Glossary')}</span>
          </div>
          <div className="glossary-list">
            {GLOSSARY.map((item) => (
              <div key={item.termPt} className="glossary-item">
                <strong>{lang === 'en' ? item.termEn : item.termPt}</strong>
                <p>{lang === 'en' ? item.meaningEn : item.meaningPt}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
