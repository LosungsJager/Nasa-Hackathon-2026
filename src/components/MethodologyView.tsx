import { BookOpen, Database, Globe, Info, Scale } from 'lucide-react';
import type { FarmAnalysis } from '../types/agro';

interface MethodologyViewProps {
  analysis: FarmAnalysis | null;
}

const DATASETS_TABLE = [
  {
    name: 'NASA POWER (Daily AG)',
    nativeScale: '~50 km (0,5°)',
    status: 'Medido (API ao vivo)',
    role: 'Série diária 2005–2024 (T2M, T2M_MIN, T2M_MAX, PRECTOTCORR, RH2M, WS2M, radiação) para balanço hídrico, geada, calor e chuva P95.',
  },
  {
    name: 'NASA GIBS WMTS',
    nativeScale: '250 m (MODIS) / 9 km (SMAP) / 10 km (GPM)',
    status: 'Medido (Tiles ao vivo)',
    role: 'Camadas espaciais (VIIRS, MODIS NDVI, SMAP L4, GPM IMERG) sobrepostas ao mapa sem reamostragem artificial.',
  },
  {
    name: 'NASA CMR (SMAP, ECOSTRESS, SRTM, GEDI L4A)',
    nativeScale: '9 km / 70 m / 30 m / 25 m (LiDAR)',
    status: 'Metadados ao vivo',
    role: 'Consulta de grânulos disponíveis no polígono via CMR Search API, incluindo biomassa/estrutura GEDI L4A.',
  },
  {
    name: 'Copernicus Sentinel-2 L2A (STAC)',
    nativeScale: '10–20 m',
    status: 'Metadados ao vivo',
    role: 'Contagem de cenas multiespectrais (red-edge/NIR/SWIR) e cobertura de nuvens recente no talhão.',
  },
  {
    name: 'ECMWF ERA5 (Reanálise 2024)',
    nativeScale: '~31 km (0,25°)',
    status: 'Medido/Reanálise (API ao vivo)',
    role: 'Validação cruzada de temperatura média, precipitação e ET₀ diária contra a série do NASA POWER.',
  },
  {
    name: 'ISRIC SoilGrids v2 + DEM 90m',
    nativeScale: '250 m (solo) / 90 m (relevo)',
    status: 'API ao vivo / Curadoria local',
    role: 'Argila, areia, SOC e AWC via SoilGrids fora das 6 regiões curadas; altitude e declividade do polígono para erosão.',
  },
  {
    name: 'Culturas & Manejo (FAO-56 / FAO-33)',
    nativeScale: 'Parâmetros editáveis',
    status: 'Premissa (editável)',
    role: 'Kc (FAO-56), Ky (FAO-33), fixação de N (Embrapa) e preços de referência (CONAB/EMATER).',
  },
];

const GLOSSARY = [
  {
    term: 'ET₀ / ETc (Evapotranspiração)',
    meaning: 'Água consumida pela cultura. Calculada por Hargreaves a partir de T2M, Tmin e radiação solar do POWER.',
  },
  {
    term: 'P10 / P50 / P90 (Backtest 2005–2024)',
    meaning: 'P50 é a mediana em 20 safras; P10 mostra o pior cenário (seca ou chuva extrema).',
  },
  {
    term: 'Índices comparativos (0–100)',
    meaning: 'Índices normalizados para comparar as 4 rotações entre si conforme os pesos dos sliders (Água, Renda, Solo).',
  },
];

export function MethodologyView({ analysis }: MethodologyViewProps) {
  return (
    <div className="methodology-view">
      <div className="meth-hero dash-card">
        <div className="meth-hero-title">
          <Scale size={18} className="accent-leaf" />
          <div>
            <h2>Escalas Nativas, Limitações e Modelo FAO-56</h2>
            <p>
              Separação explícita entre dado medido (NASA POWER/GIBS/CMR), dado derivado (balanço hídrico) e premissas da literatura.
            </p>
          </div>
        </div>
        {analysis && (
          <div className="meth-active-adapter">
            <Globe size={15} />
            <span>
              Adaptador de solo ativo: <strong>{analysis.soil.dataSourceLabel}</strong> (Confiança:{' '}
              {analysis.soil.confidenceLevel})
            </span>
          </div>
        )}
      </div>

      <div className="dash-card">
        <div className="section-title">
          <Database size={15} />
          <span>Fontes de dados e estado atual da integração</span>
        </div>
        <div className="meth-table-wrap">
          <table className="meth-table">
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Escala nativa</th>
                <th>Estado</th>
                <th>Uso no sistema</th>
              </tr>
            </thead>
            <tbody>
              {DATASETS_TABLE.map((row) => (
                <tr key={row.name}>
                  <td><strong>{row.name}</strong></td>
                  <td className="mono-cell">{row.nativeScale}</td>
                  <td>{row.status}</td>
                  <td>{row.role}</td>
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
            <span>Equações (FAO-56 e FAO-33) e Limitações</span>
          </div>
          <p className="meth-prose">
            Referências:{' '}
            <a
              href="https://www.fao.org/3/x0490e/x0490e00.htm"
              target="_blank"
              rel="noreferrer"
            >
              FAO Irrigation and Drainage Paper 56
            </a>{' '}
            e{' '}
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
            <code>Produtividade Relativa = 1 − Ky × (1 − ETa / ETc)</code>
          </div>
          <p className="meth-prose">
            <strong>Limitações declaradas:</strong> (1) Validação estatística contra quebra histórica municipal (IBGE-PAM / EMATER-RS) ainda não executada; (2) GRACE (armazenamento regional de água, ~300 km) previsto como próximo passo; (3) Leituras locais de pluviômetro e análise de solo (0–20 cm) devem ser levadas ao agrônomo para calibração.
          </p>
        </div>

        <div className="dash-card">
          <div className="section-title">
            <BookOpen size={15} />
            <span>Glossário</span>
          </div>
          <div className="glossary-list">
            {GLOSSARY.map((item) => (
              <div key={item.term} className="glossary-item">
                <strong>{item.term}</strong>
                <p>{item.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
