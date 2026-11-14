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

  return (
    <aside className="rotation-panel" aria-label="Ranking de rotações">
      <div className="panel-header">
        <div>
          <h2>Ranking de Rotações</h2>
          {areaHa !== null && (
            <span className="panel-sub">{areaHa} ha • Backtest FAO-56 (2005–2024)</span>
          )}
        </div>
        {onOpenDetails && (
          <button type="button" className="panel-link-btn" onClick={onOpenDetails}>
            <span>Detalhar</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="panel-body">
        {isLoading ? (
          <div className="drawer-loading">Carregando NASA POWER (2005–2024)...</div>
        ) : sorted.length === 0 ? (
          <div className="drawer-empty">Desenhe o talhão no mapa para simular.</div>
        ) : (
          <div className="panel-stack">
            {sorted.map((sc) => (
              <article
                key={sc.id}
                className={`panel-scenario-row ${sc.recommended ? 'recommended' : ''}`}
              >
                <div className="panel-row-top">
                  <div>
                    {sc.recommended && (
                      <span className="recommended-tag">
                        <ShieldCheck size={11} /> Maior score ponderado
                      </span>
                    )}
                    <h3>{sc.title}</h3>
                    <p className="scenario-subtitle">{sc.subtitle}</p>
                  </div>
                  <div className="overall-score">
                    <span className="score-num">{sc.scores.overall}</span>
                    <span className="score-label">Índice</span>
                  </div>
                </div>

                <div className="panel-metrics-line">
                  <span>P10: <strong>{sc.backtest.p10YieldPct}%</strong></span>
                  <span>P50: <strong>{sc.backtest.p50YieldPct}%</strong></span>
                  <span>Quebra: <strong>{sc.backtest.failureRiskPct}%</strong></span>
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
                    <span className="cb-label"><TrendingUp size={11} /> Rend.</span>
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

                {sc.recommended && (
                  <div className="panel-rec-summary">
                    <span>ETc poupada: <strong>{sc.impact.waterSavedM3Ha} m³/ha</strong></span>
                    <span>•</span>
                    <span>N: <strong>{sc.impact.nitrogenFixedKgHa}</strong></span>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
