import { ArrowRight, Droplets, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import type { RotationScenario } from '../types/agro';

interface RotationDrawerProps {
  scenarios: RotationScenario[];
  areaHa: number | null;
  isLoading: boolean;
  onOpenDetails?: () => void;
}

export function RotationDrawer({
  scenarios,
  areaHa,
  isLoading,
  onOpenDetails,
}: RotationDrawerProps) {
  // Put recommended scenario first
  const sorted = [...scenarios].sort((a, b) => Number(b.recommended) - Number(a.recommended));

  const best = sorted.find((s) => s.recommended) ?? sorted[0];
  const others = sorted.filter((s) => s.id !== best?.id);

  const riskWord = (pct: number) =>
    pct <= 10 ? 'Baixo' : pct <= 25 ? 'Médio' : 'Alto';

  return (
    <aside className="rotation-panel" aria-label="Recomendação para a lavoura">
      <div className="panel-header">
        <div>
          <h2>O que plantar agora</h2>
          {areaHa !== null && (
            <span className="panel-sub">{areaHa} ha analisados</span>
          )}
        </div>
        {onOpenDetails && (
          <button type="button" className="panel-link-btn" onClick={onOpenDetails}>
            <span>Comparar</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="panel-body">
        {isLoading ? (
          <div className="drawer-loading">Analisando clima e solo da área...</div>
        ) : !best ? (
          <div className="drawer-empty">Marque sua terra no mapa para ver a sugestão.</div>
        ) : (
          <div className="panel-stack">
            <article className="panel-scenario-row recommended">
              <div className="panel-row-top">
                <div>
                  <span className="recommended-tag">
                    <ShieldCheck size={11} /> Melhor escolha para sua terra
                  </span>
                  <h3>{best.subtitle}</h3>
                  <p className="scenario-subtitle">
                    {best.id === 'cover-legume'
                      ? 'Protege a terra contra chuva forte e ajuda a segurar umidade.'
                      : best.id === 'drought-tolerant'
                        ? 'Aguenta melhor períodos secos sem perder muita produção.'
                        : best.id === 'forage-livestock'
                          ? 'Gera cobertura verde e alimento para o gado na entressafra.'
                          : 'Mantém o manejo atual com bom resultado histórico na região.'}
                  </p>
                </div>
                <div className="overall-score" title="Nota comparativa (0–100)">
                  <span className="score-num">{best.scores.overall}</span>
                  <span className="score-label">Nota</span>
                </div>
              </div>

              <div className="panel-metrics-line">
                <span>Colheita normal: <strong>{best.backtest.p50YieldPct}%</strong></span>
                <span>Ano seco: <strong>{best.backtest.p10YieldPct}%</strong></span>
                <span>Risco de perda: <strong>{riskWord(best.backtest.failureRiskPct)}</strong></span>
              </div>

              <div className="panel-rec-summary">
                <span>Água poupada: <strong>{best.impact.waterSavedM3Ha} m³/ha</strong></span>
                <span>•</span>
                <span>Nitrogênio: <strong>{best.impact.nitrogenFixedKgHa}</strong></span>
              </div>
            </article>

            <details className="sidebar-details">
              <summary className="details-summary">
                <span>Ver outras {others.length} opções e detalhes</span>
              </summary>
              <div className="details-body" style={{ paddingTop: 8 }}>
                <div className="panel-stack">
                  {others.map((sc) => (
                    <article key={sc.id} className="panel-scenario-row">
                      <div className="panel-row-top">
                        <div>
                          <h3>{sc.title}</h3>
                          <p className="scenario-subtitle">{sc.subtitle}</p>
                        </div>
                        <div className="overall-score">
                          <span className="score-num">{sc.scores.overall}</span>
                          <span className="score-label">Nota</span>
                        </div>
                      </div>

                      <div className="panel-metrics-line">
                        <span>Normal: <strong>{sc.backtest.p50YieldPct}%</strong></span>
                        <span>Seca: <strong>{sc.backtest.p10YieldPct}%</strong></span>
                        <span>Risco: <strong>{riskWord(sc.backtest.failureRiskPct)}</strong></span>
                      </div>

                      <div className="panel-bars-compact">
                        <div className="compact-bar-row">
                          <span className="cb-label"><Droplets size={11} /> Água</span>
                          <div className="bar-track">
                            <div className="bar-fill water" style={{ width: `${sc.scores.waterIndex}%` }} />
                          </div>
                          <strong className="cb-val">{sc.scores.waterIndex}</strong>
                        </div>
                        <div className="compact-bar-row">
                          <span className="cb-label"><TrendingUp size={11} /> Colheita</span>
                          <div className="bar-track">
                            <div className="bar-fill yield" style={{ width: `${sc.scores.yieldIndex}%` }} />
                          </div>
                          <strong className="cb-val">{sc.scores.yieldIndex}</strong>
                        </div>
                        <div className="compact-bar-row">
                          <span className="cb-label"><Sprout size={11} /> Solo</span>
                          <div className="bar-track">
                            <div className="bar-fill soil" style={{ width: `${sc.scores.soilIndex}%` }} />
                          </div>
                          <strong className="cb-val">{sc.scores.soilIndex}</strong>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </aside>
  );
}
