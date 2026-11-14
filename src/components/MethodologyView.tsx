import { BookOpen, Database, Globe, Info, Scale } from 'lucide-react';
import type { FarmAnalysis } from '../types/agro';

interface MethodologyViewProps {
  analysis: FarmAnalysis | null;
}

const DATASETS_TABLE = [
  {
    name: 'NASA POWER (Agrometeorologia)',
    nativeScale: '~50 km (0,5°)',
    scope: 'Contexto Regional',
    role: 'Série histórica diária (chuva, temperatura, ET₀) para simular 20 safras e risco de geada.',
    confidence: 'Alta (clima regional)',
  },
  {
    name: 'NASA SMAP L4 (Umidade do Solo)',
    nativeScale: '9 km',
    scope: 'Contexto Regional',
    role: 'Umidade na zona radicular e anomalia hídrica da safra atual vs. climatologia.',
    confidence: 'Média (para minifúndios)',
  },
  {
    name: 'NASA GPM IMERG (Precipitação)',
    nativeScale: '10 km (0,1°)',
    scope: 'Contexto Regional',
    role: 'Chuva acumulada recente (90 dias) e detecção de eventos extremos (P95).',
    confidence: 'Alta',
  },
  {
    name: 'MODIS / NASA HLS (NDVI)',
    nativeScale: '30 m (HLS) / 250 m (MODIS)',
    scope: 'Dentro da Fazenda',
    role: 'Única camada de vigor vegetativo intra-talhão e detecção de meses com solo exposto.',
    confidence: 'Alta',
  },
  {
    name: 'SRTM / NASADEM (Relevo)',
    nativeScale: '30 m',
    scope: 'Dentro da Fazenda',
    role: 'Declividade combinada com GPM e NDVI para estimar risco de erosão laminar (USLE).',
    confidence: 'Alta',
  },
  {
    name: 'ECOSTRESS (Temp. Superfície)',
    nativeScale: '~70 m',
    scope: 'Evidência Opcional',
    role: 'Identifica ilhas de calor e estresse térmico no dossel em dias de passagem limpa.',
    confidence: 'Média (passagens irregulares)',
  },
  {
    name: 'Solos & Culturas Locais',
    nativeScale: '250 m / Municipal',
    scope: 'Adaptador Local / Global',
    role: 'Embrapa/MapBiomas (BR), USDA SSURGO/CDL (EUA) ou SoilGrids/WorldCover (Global).',
    confidence: 'Variável por região',
  },
];

const GLOSSARY = [
  {
    term: 'ET₀ / ETc (Evapotranspiração)',
    meaning:
      'Quantidade de água que sai do solo e das plantas para a atmosfera. Culturas com Kc menor consomem menos água.',
  },
  {
    term: 'NDVI (Índice de Vegetação)',
    meaning:
      'Mede o "verde" e o vigor das plantas por satélite (0 a 1). Valores abaixo de 0,35 indicam solo descoberto.',
  },
  {
    term: 'P10 / P50 / P90 (Backtest)',
    meaning:
      'P50 é o resultado mediano em 20 safras; P10 mostra o pior cenário (ano de seca severa ou enchente) — é a medida do risco real.',
  },
  {
    term: 'Risco de Quebra (< 60%)',
    meaning:
      'Percentual de anos nos últimos 20 anos em que a simulação ficou abaixo de 60% do potencial produtivo da cultura.',
  },
];

export function MethodologyView({ analysis }: MethodologyViewProps) {
  return (
    <div className="methodology-view">
      <div className="meth-hero dash-card">
        <div className="meth-hero-title">
          <Scale size={20} className="accent-leaf" />
          <div>
            <h2>Transparência Científica & Honestidade Multi-Escala</h2>
            <p>
              O Field Shift não "super-resolve" dados grosseiros artificialmente: cada camada da NASA é rotulada na sua escala nativa e combinada ao balanço hídrico FAO-56 / FAO-33.
            </p>
          </div>
        </div>
        {analysis && (
          <div className="meth-active-adapter">
            <Globe size={15} />
            <span>
              Adaptador ativo: <strong>{analysis.soil.dataSourceLabel}</strong> (Confiança:{' '}
              {analysis.soil.confidenceLevel})
            </span>
          </div>
        )}
      </div>

      {/* Datasets Table */}
      <div className="dash-card">
        <div className="section-title">
          <Database size={15} />
          <span>Fontes NASA & Adaptadores Locais</span>
        </div>
        <div className="meth-table-wrap">
          <table className="meth-table">
            <thead>
              <tr>
                <th>Camada / Fonte</th>
                <th>Escala Nativa</th>
                <th>Abrangência</th>
                <th>Papel no Motor</th>
                <th>Confiança</th>
              </tr>
            </thead>
            <tbody>
              {DATASETS_TABLE.map((row) => (
                <tr key={row.name}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td className="mono-cell">{row.nativeScale}</td>
                  <td>
                    <span
                      className={`scope-badge ${
                        row.scope === 'Dentro da Fazenda' ? 'farm' : 'regional'
                      }`}
                    >
                      {row.scope}
                    </span>
                  </td>
                  <td>{row.role}</td>
                  <td>{row.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equation + Glossary */}
      <div className="dash-two-col">
        <div className="dash-card">
          <div className="section-title">
            <Info size={15} />
            <span>Como Calculamos o Risco (FAO-56 + FAO-33)</span>
          </div>
          <p className="meth-prose">
            Para cada um dos 3 cenários de rotação, simulamos 20 safras (2006–2025) usando a chuva sazonal, a evapotranspiração de referência (<code>ET₀</code> da NASA POWER) e o coeficiente da cultura (<code>Kc</code>):
          </p>
          <div className="formula-box">
            <code>ETc = Kc × ET₀</code>
            <code>Produtividade Relativa = 1 − Ky × (1 − ETa / ETc)</code>
          </div>
          <p className="meth-prose">
            Em anos de chuva extrema (como 2024 no RS), culturas sem cobertura sofrem penalidade adicional por erosão e encharcamento. O resultado gera a distribuição <strong>P10 / P50 / P90</strong> e a <strong>probabilidade de quebra</strong>.
          </p>
        </div>

        <div className="dash-card">
          <div className="section-title">
            <BookOpen size={15} />
            <span>Glossário Rápido para o Produtor</span>
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
