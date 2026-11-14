import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  HelpCircle,
  Repeat,
  ShieldCheck,
  Snowflake,
  Sprout,
  Sun,
  Thermometer,
  Tractor,
  TrendingUp,
} from 'lucide-react';
import { getCropDisplayName, tr, type Lang } from '../i18n';
import type {
  ClimateStressScenario,
  CropId,
  CropInfo,
  DataProvenance,
  FarmAnalysis,
  RotationScenario,
  SensitivityResult,
} from '../types/agro';

interface CropDashboardProps {
  lang: Lang;
  analysis: FarmAnalysis | null;
  cropsCatalog: Record<CropId, CropInfo>;
  onUpdateCropParam: (id: CropId, field: 'kc' | 'ky' | 'cycleDays', value: number) => void;
  currentCrop: CropId;
  onCropChange: (crop: CropId) => void;
  cropHistoryNote: string;
  onCropHistoryChange: (val: string) => void;
  climateStress: ClimateStressScenario;
  onClimateStressChange: (next: ClimateStressScenario) => void;
  scenarios: RotationScenario[];
  sensitivity: SensitivityResult | null;
  isLoading: boolean;
}

type CardTab = 'why' | 'evidence' | 'gaps';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getScenarioIcon(id: RotationScenario['id']) {
  if (id === 'baseline') return <Repeat size={17} />;
  if (id === 'cover-legume') return <Sprout size={17} />;
  if (id === 'drought-tolerant') return <Sun size={17} />;
  return <Tractor size={17} />;
}

function provLabel(p: DataProvenance, lang: Lang): string {
  if (p === 'medido') return tr(lang, 'Medido', 'Measured');
  if (p === 'derivado') return tr(lang, 'Derivado', 'Derived');
  return tr(lang, 'Premissa', 'Assumption');
}

export function CropDashboard({
  lang,
  analysis,
  cropsCatalog,
  onUpdateCropParam,
  currentCrop,
  onCropChange,
  cropHistoryNote,
  onCropHistoryChange,
  climateStress,
  onClimateStressChange,
  scenarios,
  sensitivity,
  isLoading,
}: CropDashboardProps) {
  const [cardTabs, setCardTabs] = useState<Record<string, CardTab>>({});
  const [showCropTable, setShowCropTable] = useState(false);
  const MONTHS = lang === 'en' ? MONTHS_EN : MONTHS_PT;

  const monthlyWaterBalance = useMemo(() => {
    if (!analysis) return [];
    const yearsCount = Math.max(1, new Set(analysis.dailyClimate.map((d) => d.year)).size);
    return MONTHS.map((label, idx) => {
      const m = idx + 1;
      const mDays = analysis.dailyClimate.filter((d) => d.month === m);
      const rainMm = Math.round(mDays.reduce((s, d) => s + d.precipMm, 0) / yearsCount);
      const et0Mm = Math.round(mDays.reduce((s, d) => s + d.et0Mm, 0) / yearsCount);
      return { label, rainMm, et0Mm };
    });
  }, [analysis, MONTHS]);

  if (isLoading) {
    return (
      <div className="dashboard-state-box">
        <p>
          {tr(
            lang,
            'Carregando série diária (2005–2024) e executando balanço hídrico FAO-56/33...',
            'Loading daily climate series (2005–2024) and running FAO-56/33 water balance...'
          )}
        </p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="dashboard-state-box">
        <p>
          {tr(
            lang,
            'Marque sua terra na aba Mapa do Talhão para iniciar a análise.',
            'Mark your field on the Field Map tab to start the analysis.'
          )}
        </p>
      </div>
    );
  }

  const getTab = (id: string): CardTab => cardTabs[id] ?? 'why';
  const setTab = (id: string, tab: CardTab) =>
    setCardTabs((prev) => ({ ...prev, [id]: tab }));

  const cropInfo = cropsCatalog[currentCrop];
  const maxMonthlyMm = Math.max(
    180,
    ...monthlyWaterBalance.map((m) => Math.max(m.rainMm, m.et0Mm))
  );

  return (
    <div className="crop-dashboard">
      {/* 1. Farm & Editable Crop History */}
      <section className="dash-card detected-crop-bar">
        <div className="detected-left">
          <div className="history-edit-row">
            <label htmlFor="crop-history-input" className="confirm-label">
              {tr(lang, 'Histórico informado (editável):', 'Reported history (editable):')}
            </label>
            <input
              id="crop-history-input"
              type="text"
              className="history-input"
              value={cropHistoryNote}
              onChange={(e) => onCropHistoryChange(e.target.value)}
            />
          </div>
          <div className="detected-sub">
            <strong>{analysis.soil.municipality}</strong> • {analysis.areaHa} ha •{' '}
            {tr(lang, 'Solo:', 'Soil:')} {analysis.soil.soilClass} (AWC{' '}
            {analysis.soil.availableWaterCapacityMm} mm) •{' '}
            <span className={`conf-pill ${analysis.soil.confidenceLevel.toLowerCase()}`}>
              {tr(lang, 'Confiança', 'Confidence')} {analysis.soil.confidenceLevel}
            </span>
          </div>
        </div>

        <div className="detected-right">
          <span className="confirm-label">{tr(lang, 'Cultura principal:', 'Main crop:')}</span>
          <select
            aria-label={tr(lang, 'Cultura principal', 'Main crop')}
            className="crop-select-inline"
            value={currentCrop}
            onChange={(e) => onCropChange(e.target.value as CropId)}
          >
            {(Object.keys(cropsCatalog) as CropId[]).map((id) => (
              <option key={id} value={id}>
                {getCropDisplayName(id, cropsCatalog[id].name, lang)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="reset-stress-btn"
            onClick={() => setShowCropTable((v) => !v)}
          >
            {showCropTable
              ? tr(lang, 'Ocultar parâmetros', 'Hide parameters')
              : tr(lang, 'Editar tabela Kc/Ky', 'Edit Kc/Ky table')}
          </button>
        </div>
      </section>

      {/* Optional Editable Crop Parameters Table */}
      {showCropTable && (
        <section className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3>{tr(lang, 'Parâmetros agronômicos (editáveis)', 'Agronomic parameters (editable)')}</h3>
              <p className="dash-sub">
                {tr(
                  lang,
                  'Alterar Kc, Ky ou ciclo recalcula imediatamente o balanço hídrico FAO-56/33',
                  'Changing Kc, Ky, or cycle length immediately recalculates the FAO-56/33 water balance'
                )}
              </p>
            </div>
          </div>
          <div className="meth-table-wrap">
            <table className="meth-table">
              <thead>
                <tr>
                  <th>{tr(lang, 'Cultura', 'Crop')}</th>
                  <th>{tr(lang, 'Ciclo (dias)', 'Cycle (days)')}</th>
                  <th>Kc (FAO-56)</th>
                  <th>Ky (FAO-33)</th>
                  <th>{tr(lang, 'Fonte', 'Source')}</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(cropsCatalog) as CropId[]).map((id) => {
                  const c = cropsCatalog[id];
                  return (
                    <tr key={id}>
                      <td><strong>{getCropDisplayName(id, c.name, lang)}</strong></td>
                      <td>
                        <input
                          type="number"
                          className="table-num-input"
                          value={c.cycleDays}
                          min={60}
                          max={300}
                          onChange={(e) =>
                            onUpdateCropParam(id, 'cycleDays', Number(e.target.value) || 90)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.05"
                          className="table-num-input"
                          value={c.kc}
                          min={0.4}
                          max={1.5}
                          onChange={(e) =>
                            onUpdateCropParam(id, 'kc', Number(e.target.value) || 1.0)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.05"
                          className="table-num-input"
                          value={c.ky}
                          min={0.4}
                          max={1.6}
                          onChange={(e) =>
                            onUpdateCropParam(id, 'ky', Number(e.target.value) || 1.0)
                          }
                        />
                      </td>
                      <td>{c.sourceRef}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. Real Monthly Rain vs ET0 (NASA POWER) + Climate Stress */}
      <section className="dash-two-col">
        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3>{tr(lang, 'Chuva média vs. ET₀ (mm/mês)', 'Average rain vs. ET₀ (mm/month)')}</h3>
              <p className="dash-sub">
                {analysis.indicators.powerSource === 'live-daily'
                  ? tr(lang, 'Medido: NASA POWER diário (2005–2024)', 'Measured: NASA POWER daily (2005–2024)')
                  : tr(lang, 'Estimativa offline (sem resposta do POWER)', 'Offline estimate (no POWER response)')}{' '}
                • {tr(lang, 'Azul = chuva, Âmbar = ET₀', 'Blue = rain, Amber = ET₀')}
              </p>
            </div>
            <div className="risk-chips">
              <span className="risk-chip frost">
                <Snowflake size={12} /> {tr(lang, 'Geada:', 'Frost:')}{' '}
                {analysis.indicators.frostDaysPerYear} {tr(lang, 'd/ano', 'd/yr')}
              </span>
              <span className="risk-chip rain">
                <CloudRain size={12} /> {tr(lang, 'Chuva P95:', 'P95 Rain:')}{' '}
                {analysis.indicators.extremeRainDaysPerYear} {tr(lang, 'd/ano', 'd/yr')}
              </span>
            </div>
          </div>

          <div className="ndvi-chart" aria-label={tr(lang, 'Balanço mensal chuva e ET0 em mm', 'Monthly rain and ET0 balance in mm')}>
            {monthlyWaterBalance.map((m) => (
              <div key={m.label} className="ndvi-col">
                <div
                  className="dual-bar-track"
                  title={`${m.label}: ${tr(lang, 'Chuva', 'Rain')} ${m.rainMm} mm | ET₀ ${m.et0Mm} mm`}
                >
                  <div
                    className="bar-rain"
                    style={{ height: `${Math.round((m.rainMm / maxMonthlyMm) * 100)}%` }}
                  />
                  <div
                    className="bar-et0"
                    style={{ height: `${Math.round((m.et0Mm / maxMonthlyMm) * 100)}%` }}
                  />
                </div>
                <span className="ndvi-month">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-header">
            <div>
              <h3>{tr(lang, 'Cenários de estresse climático', 'Climate stress scenarios')}</h3>
              <p className="dash-sub">
                {getCropDisplayName(currentCrop, cropInfo.name, lang)} • Kc {cropInfo.kc} / Ky {cropInfo.ky} ({cropInfo.sourceRef})
              </p>
            </div>
            {(climateStress.rainDeltaPct !== 0 || climateStress.tempDeltaC !== 0) && (
              <button
                type="button"
                className="reset-stress-btn"
                onClick={() => onClimateStressChange({ rainDeltaPct: 0, tempDeltaC: 0 })}
              >
                {tr(lang, 'Resetar', 'Reset')}
              </button>
            )}
          </div>

          <div className="stress-sliders">
            <label className="slider-row">
              <div className="slider-header">
                <span>
                  <CloudRain size={13} /> {tr(lang, 'Variação de chuva na safra', 'Growing-season rain change')}
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
                  <Thermometer size={13} /> {tr(lang, 'Aumento de temperatura (ET₀)', 'Temperature increase (ET₀)')}
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

          {sensitivity && (
            <div className="sensitivity-box">
              <strong>{tr(lang, 'Sensibilidade (±20% em Kc e Ky):', 'Sensitivity (±20% on Kc & Ky):')}</strong>{' '}
              <span>
                {sensitivity.isStable
                  ? tr(
                      lang,
                      'Ranking estável — a rotação recomendada não muda sob variação de ±20%.',
                      'Stable ranking — recommended rotation does not change under ±20% variation.'
                    )
                  : tr(
                      lang,
                      `Sensível a parâmetros: Kc−20% → ${sensitivity.kcMinus20Winner}; Ky+20% → ${sensitivity.kyPlus20Winner}.`,
                      `Parameter-sensitive: Kc−20% → ${sensitivity.kcMinus20Winner}; Ky+20% → ${sensitivity.kyPlus20Winner}.`
                    )}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 3. The 4 Rotation Scenarios */}
      <section className="dash-scenarios-section">
        <div className="section-heading-row">
          <h2>{tr(lang, 'Rotações comparadas (2005–2024)', 'Compared rotations (2005–2024)')}</h2>
          <span className="heading-hint">
            {tr(
              lang,
              'P10 pior caso • P50 mediana • Quebra < 60% • Índices comparativos 0–100',
              'P10 worst case • P50 median • Crop failure < 60% • Comparative index 0–100'
            )}
          </span>
        </div>

        <div className="dash-scenarios-grid-4">
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
                      {sc.recommended && (
                        <span className="recommended-tag">
                          <ShieldCheck size={12} />{' '}
                          {tr(lang, 'Maior score ponderado', 'Highest weighted score')}
                        </span>
                      )}
                      <h3>{sc.title}</h3>
                      <p className="scenario-subtitle">{sc.subtitle}</p>
                    </div>
                  </div>
                  <div className="overall-score">
                    <span className="score-num">{sc.scores.overall}</span>
                    <span className="score-label">{tr(lang, 'Índice', 'Score')}</span>
                  </div>
                </header>

                {/* P10 / P50 / P90 Risk Distribution */}
                <div className="backtest-box">
                  <div className="backtest-top">
                    <span>{tr(lang, 'Rendimento relativo (20 anos)', 'Relative yield (20 years)')}</span>
                    <span
                      className={`failure-badge ${
                        sc.backtest.failureRiskPct >= 25
                          ? 'high'
                          : sc.backtest.failureRiskPct >= 10
                            ? 'med'
                            : 'low'
                      }`}
                    >
                      {tr(lang, 'Quebra:', 'Failure:')} {sc.backtest.failureRiskPct}%
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
                        title={`P50: ${sc.backtest.p50YieldPct}%`}
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
                      <Droplets size={11} /> {tr(lang, 'ETc poupada', 'ETc saved')}
                    </span>
                    <strong>{sc.impact.waterSavedM3Ha} m³/ha</strong>
                  </div>
                  <div className="impact-kpi">
                    <span className="kpi-label">
                      <Sprout size={11} /> {tr(lang, 'N (faixa)', 'N (range)')}
                    </span>
                    <strong>{sc.impact.nitrogenFixedKgHa}</strong>
                  </div>
                  <div className="impact-kpi">
                    <span className="kpi-label">
                      <TrendingUp size={11} /> {tr(lang, 'Margem est.*', 'Est. margin*')}
                    </span>
                    <strong>R$ {sc.impact.estMarginBrlHa}/ha</strong>
                  </div>
                </div>

                {/* Sub-tabs */}
                <div className="card-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'why'}
                    className={`card-tab-btn ${activeTab === 'why' ? 'active' : ''}`}
                    onClick={() => setTab(sc.id, 'why')}
                  >
                    {tr(lang, 'Resumo', 'Summary')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'evidence'}
                    className={`card-tab-btn ${activeTab === 'evidence' ? 'active' : ''}`}
                    onClick={() => setTab(sc.id, 'evidence')}
                  >
                    {tr(lang, 'Dados de suporte', 'Supporting data')}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'gaps'}
                    className={`card-tab-btn ${activeTab === 'gaps' ? 'active' : ''}`}
                    onClick={() => setTab(sc.id, 'gaps')}
                  >
                    {tr(lang, 'Lacunas & Agrônomo', 'Gaps & Agronomist')}
                  </button>
                </div>

                <div className="card-tab-panel">
                  {activeTab === 'why' && (
                    <ul className="benefit-list">
                      {sc.benefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'evidence' && (
                    <ul className="evidence-list">
                      {sc.supportingData.map((item) => (
                        <li key={item.text}>
                          <span className={`prov-badge ${item.provenance}`}>
                            {provLabel(item.provenance, lang)}
                          </span>{' '}
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  )}

                  {activeTab === 'gaps' && (
                    <div className="gaps-panel">
                      <div className="gap-block">
                        <strong>
                          <HelpCircle size={12} /> {tr(lang, 'Lacunas de dados:', 'Data gaps:')}
                        </strong>
                        <ul>
                          {sc.dataGaps.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="gap-block warn">
                        <strong>
                          <AlertTriangle size={12} /> {tr(lang, 'Revisão agronômica:', 'Agronomic review:')}
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
          {tr(
            lang,
            '*Margem estimada com referência regional CONAB/EMATER (ilustrativa). Validação contra quebra municipal real (PAM/EMATER) pendente.',
            '*Estimated margin based on regional CONAB/EMATER reference (illustrative). Validation against municipal crop loss data (PAM/EMATER) pending.'
          )}
        </p>
      </section>
    </div>
  );
}
