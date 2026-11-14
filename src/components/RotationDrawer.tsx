import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Droplets,
  Leaf,
  Repeat,
  ShieldCheck,
  Sprout,
  Sun,
  Tractor,
  TrendingUp,
} from 'lucide-react';
import type { RotationScenario } from '../types/agro';

interface RotationDrawerProps {
  scenarios: RotationScenario[];
  areaHa: number | null;
  isLoading: boolean;
}

function getScenarioIcon(id: RotationScenario['id']) {
  if (id === 'baseline') return <Repeat size={16} />;
  if (id === 'cover-legume') return <Sprout size={16} />;
  if (id === 'drought-tolerant') return <Sun size={16} />;
  return <Tractor size={16} />;
}

export function RotationDrawer({ scenarios, areaHa, isLoading }: RotationDrawerProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section
      className={`rotation-drawer ${expanded ? 'open' : 'collapsed'}`}
      aria-label="Resumo das rotações"
    >
      <button
        type="button"
        id="btn-toggle-drawer"
        className="drawer-handle"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="drawer-handle-left">
          <Leaf size={16} className="accent-leaf" />
          <span className="drawer-title">Comparativo rápido (4 rotações)</span>
          {areaHa !== null && <span className="drawer-meta">{areaHa} ha</span>}
        </div>
        <div className="drawer-handle-right">
          <span className="drawer-hint">{expanded ? 'Recolher' : 'Expandir'}</span>
          {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </div>
      </button>

      {expanded && (
        <div className="drawer-body">
          {isLoading ? (
            <div className="drawer-loading">Carregando série climática NASA POWER...</div>
          ) : scenarios.length === 0 ? (
            <div className="drawer-empty">Desenhe o talhão no mapa para simular as rotações.</div>
          ) : (
            <div className="scenarios-grid-4">
              {scenarios.map((sc) => (
                <article
                  key={sc.id}
                  className={`scenario-card ${sc.recommended ? 'recommended' : ''}`}
                >
                  <header className="scenario-header">
                    <div className="scenario-icon-title">
                      <div className={`scenario-icon ${sc.id}`}>
                        {getScenarioIcon(sc.id)}
                      </div>
                      <div>
                        {sc.recommended && (
                          <span className="recommended-tag">
                            <ShieldCheck size={11} /> Maior índice
                          </span>
                        )}
                        <h3>{sc.title}</h3>
                        <p className="scenario-subtitle">{sc.subtitle}</p>
                      </div>
                    </div>
                    <div className="overall-score">
                      <span className="score-num">{sc.scores.overall}</span>
                      <span className="score-label">Índice</span>
                    </div>
                  </header>

                  <div className="score-bars">
                    <div className="score-bar-item">
                      <div className="bar-label">
                        <span><Droplets size={11} /> Água</span>
                        <strong>{sc.scores.waterIndex}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill water" style={{ width: `${sc.scores.waterIndex}%` }} />
                      </div>
                    </div>

                    <div className="score-bar-item">
                      <div className="bar-label">
                        <span><TrendingUp size={11} /> Rend. (P50: {sc.backtest.p50YieldPct}%)</span>
                        <strong>{sc.scores.yieldIndex}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill yield" style={{ width: `${sc.scores.yieldIndex}%` }} />
                      </div>
                    </div>

                    <div className="score-bar-item">
                      <div className="bar-label">
                        <span><Sprout size={11} /> Solo</span>
                        <strong>{sc.scores.soilIndex}</strong>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill soil" style={{ width: `${sc.scores.soilIndex}%` }} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
