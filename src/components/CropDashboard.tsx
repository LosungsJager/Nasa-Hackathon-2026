import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  Droplets,
  HelpCircle,
  Leaf,
  Repeat,
  ShieldCheck,
  Snowflake,
  Sprout,
  Sun,
  Thermometer,
  TrendingUp,
} from 'lucide-react';
import { CROPS_CATALOG } from '../data/localAgroData';
import type {
  ClimateStressScenario,
  CropId,
  FarmAnalysis,
  RotationScenario,
} from '../types/agro';

interface CropDashboardProps {
  analysis: FarmAnalysis | null;
  currentCrop: CropId;
  onCropChange: (crop: CropId) => void;
  climateStress: ClimateStressScenario;
  onClimateStressChange: (next: ClimateStressScenario) => void;
  scenarios: RotationScenario[];
  isLoading: boolean;
}

type CardTab = 'why' | 'evidence' | 'gaps';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getScenarioIcon(id: RotationScenario['id']) {
  if (id === 'baseline') return <Repeat size={18} />;
  if (id === 'cover-legume') return <Sprout size={18} />;
  return <Sun size={18} />;
}

export function CropDashboard({
  analysis,
  currentCrop,
  onCropChange,
  climateStress,
  onClimateStressChange,
  scenarios,
  isLoading,
}: CropDashboardProps) {
  const [cardTabs, setCardTabs] = useState<Record<string, CardTab>>({});

  if (isLoading) {
    return (
      <div className="dashboard-state-box">
        <div className="spinner-dot" />
        <p>
          Simulando 20 safras (FAO-56/33) com dados da NASA POWER, SMAP, GPM e perfil local de solo...
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="dashboard-state-box">
        <p>
          Nenhum talhão selecionado. Volte para a aba <strong>Mapa & Talhão</strong> e desenhe os limites da sua fazenda.
        </p>
      </div>
    );
  }

  const getTab = (id: string): CardTab => cardTabs[id] ?? 'why';
  const setTab = (id: string, tab: CardTab) =>
    setCardTabs((prev) => ({ ...prev, [id]: tab }));

  const cropInfo = CROPS_CATALOG[currentCrop];

  return (
    <div className="crop-dashboard">
      {/* 1. Header Strip: Detected Crop & Confirmation */}
      <section className="dash-card detected-crop-bar">
        <div className="detected-left">
          <div className="detected-badge">
            <CheckCircle2 size={15} />
            <span>{analysis.detectedCropHistory}</span>
          </div>
          <div className="detected-sub">
            <strong>{analysis.soil.municipality}</strong> • {analysis.areaHa} ha • Solo:{' '}
            {analysis.soil.soilClass} (AWC: {analysis.soil.availableWaterCapacityMm} mm) •{' '}
            <span className={`conf-pill ${analysis.soil.confidenceLevel.toLowerCase()}`}>
              Confiança {analysis.soil.confidenceLevel}
            </span>
          </div>
        </div>

        <div className="detected-right">
          <span className="confirm-label">Cultura principal atual:</span>
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
      </section>

      {/* 2. Vulnerability Calendar + Climate Stress Simulator */}
      <section className="dash-two-col">
        {/* Left: Seasonal NDVI & Bare Field */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3>Calendário de Cobertura & Vulnerabilidade (NDVI 12 meses)</h3>
              <p className="dash-sub">
                Meses com barra âmbar (NDVI &lt; 0,35) indicam solo exposto e maior risco de erosão
              </p>
            </div>
            <div className="risk-chips">
              <span className="risk-chip frost" title="Dias com Tmin ≤ 2°C (NASA POWER)">
                <Snowflake size={12} /> Geada: {analysis.nasa.power.frostRiskDays} d/ano
              </span>
              <span className="risk-chip rain" title="Dias com chuva extrema P95 (GPM/POWER)">
                <CloudRain size={12} /> Chuva extrema: {analysis.nasa.power.extremeRainDays} d/ano
              </span>
            </div>
          </div>

          <div className="ndvi-chart">
            {analysis.nasa.modis.monthlyNdvi.map((val, idx) => {
              const isBare = val < 0.35;
              return (
                <div key={MONTHS[idx]} className="ndvi-col">
                  <div className="ndvi-bar-track" title={`${MONTHS[idx]}: NDVI ${val}`}>
                    <div
                      className={`ndvi-bar-fill ${isBare ? 'bare' : 'vegetated'}`}
                      style={{ height: `${Math.round(val * 100)}%` }}
                    />
                  </div>
                  <span className="ndvi-month">{MONTHS[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Climate Stress What-If Sliders */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3>Simulador de Clima ("E se a safra piorar?")</h3>
              <p className="dash-sub">
                Aplica choques de chuva e temperatura sobre as 20 safras do modelo FAO-56 ({cropInfo.name}: Kc {cropInfo.kc}, Ky {cropInfo.ky})
              </p>
            </div>
            {(climateStress.rainDeltaPct !== 0 || climateStress.tempDeltaC !== 0) && (
              <button
                type="button"
                className="reset-stress-btn"
                onClick={() => onClimateStressChange({ rainDeltaPct: 0, tempDeltaC: 0 })}
              >
                Resetar
              </button>
            )}
          </div>

          <div className="stress-sliders">
            <label className="slider-row">
              <div className="slider-header">
                <span>
                  <CloudRain size={13} /> Variação de Chuva na Safra
                </span>
                <span className="slider-val">
                  {climateStress.rainDeltaPct > 0 ? '+' : ''}
                  {climateStress.rainDeltaPct}%
                </span>
              </div>
              <input
                type="range"
                min={-30}
                max={20}
                step={5}
                value={climateStress.rainDeltaPct}
                onChange={(e) =>
                  onClimateStressChange({
                    ...climateStress,
                    rainDeltaPct: Number(e.target.value),
                  })
                }
              />
            </label>

            <label className="slider-row">
              <div className="slider-header">
                <span>
                  <Thermometer size={13} /> Aquecimento Adicional (ET₀)
                </span>
                <span className="slider-val">+{climateStress.tempDeltaC.toFixed(1)} °C</span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={0.5}
                value={climateStress.tempDeltaC}
                onChange={(e) =>
                  onClimateStressChange({
                    ...climateStress,
                    tempDeltaC: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="stress-note">
            <Leaf size={13} />
            <span>
              Fonte agronômica: <strong>{cropInfo.sourceRef}</strong> • {cropInfo.pestBreakRole}.
            </span>
          </div>
        </div>
      </section>

      {/* 3. The 3 Rotation Scenarios (Side-by-Side Detailed Cards) */}
      <section className="dash-scenarios-section">
        <div className="section-heading-row">
          <h2>Comparativo de Estratégias de Rotação (Backtest 20 Safras: 2006–2025)</h2>
          <span className="heading-hint">
            P10 = pior caso (seca/excesso) • P50 = mediana • Quebra = rendimento &lt; 60%
          </span>
        </div>

        <div className="dash-scenarios-grid">
          {scenarios.map((sc) => {
            const activeTab = getTab(sc.id);
            return (
              <article
                key={sc.id}
                className={`dash-scenario-card ${sc.recommended ? 'recommended' : ''}`}
              >
                <header className="scenario-header">
                  <div className="scenario-icon-title">
                    <div className={`scenario-icon ${sc.id}`}>
                      {getScenarioIcon(sc.id)}
                    </div>
                    <div>
                      <div className="scenario-badge-row">
                        <span className="scenario-tag">{sc.badge}</span>
                        {sc.recommended && (
                          <span className="recommended-tag">
                            <ShieldCheck size={12} /> Recomendada
                          </span>
                        )}
                      </div>
                      <h3>{sc.title}</h3>
                      <p className="scenario-subtitle">{sc.subtitle}</p>
                    </div>
                  </div>
                  <div className="overall-score">
                    <span className="score-num">{sc.scores.overall}</span>
                    <span className="score-label">Score</span>
                  </div>
                </header>

                {/* P10 / P50 / P90 Risk Distribution */}
                <div className="backtest-box">
                  <div className="backtest-top">
                    <span>Distribuição de Rendimento (20 anos)</span>
                    <span
                      className={`failure-badge ${
                        sc.backtest.failureRiskPct >= 25
                          ? 'high'
                          : sc.backtest.failureRiskPct >= 10
                            ? 'med'
                            : 'low'
                      }`}
                    >
                      Risco de quebra: {sc.backtest.failureRiskPct}%
                    </span>
                  </div>

                  <div className="p-range-bar">
                    <div className="p-track">
                      <div
                        className="p-band"
                        style={{
                          left: `${sc.backtest.p10YieldPct}%`,
                          width: `${Math.max(4, sc.backtest.p90YieldPct - sc.backtest.p10YieldPct)}%`,
                        }}
                      />
                      <div
                        className="p-median-dot"
                        style={{ left: `${sc.backtest.p50YieldPct}%` }}
                        title={`Mediana P50: ${sc.backtest.p50YieldPct}%`}
                      />
                    </div>
                    <div className="p-labels">
                      <span>P10: {sc.backtest.p10YieldPct}%</span>
                      <strong>P50: {sc.backtest.p50YieldPct}%</strong>
                      <span>P90: {sc.backtest.p90YieldPct}%</span>
                    </div>
                  </div>
                </div>

                {/* Quantified Impact KPIs */}
                <div className="impact-kpis">
                  <div className="impact-kpi">
                    <span className="kpi-label">
                      <Droplets size={11} /> Água poupada
                    </span>
                    <strong>{sc.impact.waterSavedM3Ha} m³/ha</strong>
                  </div>
                  <div className="impact-kpi">
                    <span className="kpi-label">
                      <Sprout size={11} /> N fixado (faixa)
                    </span>
                    <strong>{sc.impact.nitrogenFixedKgHa}</strong>
                  </div>
                  <div className="impact-kpi">
                    <span className="kpi-label">
                      <TrendingUp size={11} /> Margem est.*
                    </span>
                    <strong>R$ {sc.impact.estMarginBrlHa}/ha</strong>
                  </div>
                </div>

                {/* Clean Card Sub-tabs */}
                <div className="card-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'why'}
                    className={`card-tab-btn ${activeTab === 'why' ? 'active' : ''}`}
                    onClick={() => setTab(sc.id, 'why')}
                  >
                    Por quê?
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'evidence'}
                    className={`card-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                    onClick={() => setTab(sc.id, 'evidence')}
                  >
                    Evidência NASA
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'gaps'}
                    className={`card-tab-btn ${activeTab === 'gaps' ? 'active' : ''}`}
                    onClick={() => setTab(sc.id, 'gaps')}
                  >
                    Lacunas & Agrônomo
                  </button>
                </div>

                <div className="card-tab-panel">
                  {activeTab === 'why' && (
                    <>
                      <p className="scenario-summary">{sc.summary}</p>
                      <ul className="benefit-list">
                        {sc.benefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  {activeTab === 'evidence' && (
                    <ul className="evidence-list">
                      {sc.nasaEvidence.map((ev) => (
                        <li key={ev}>{ev}</li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'gaps' && (
                    <div className="gaps-panel">
                      <div className="gap-block">
                        <strong>
                          <HelpCircle size={12} /> O que não sabemos (lacunas):
                        </strong>
                        <ul>
                          {sc.dataGaps.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="gap-block warn">
                        <strong>
                          <AlertTriangle size={12} /> Pergunte ao agrônomo / EMATER:
                        </strong>
                        <p>{sc.agronomistNotes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="margin-disclaimer">
          *Margem bruta estimada é apenas ilustrativa (produtividade relativa × referência regional CONAB/EMATER). Esta ferramenta apoia a decisão e não substitui assistência técnica agronômica.
        </p>
      </section>
    </div>
  );
}
