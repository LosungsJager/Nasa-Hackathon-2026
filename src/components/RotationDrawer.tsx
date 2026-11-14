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
  TrendingUp,
} from 'lucide-react';
import type { RotationScenario } from '../types/agro';

interface RotationDrawerProps {
  scenarios: RotationScenario[];
  areaHa: number | null;
  isLoading: boolean;
}

function getScenarioIcon(id: RotationScenario['id']) {
  if (id === 'baseline') return <Repeat size={18} />;
  if (id === 'cover-legume') return <Sprout size={18} />;
  return <Sun size={18} />;
}

export function RotationDrawer({ scenarios, areaHa, isLoading }: RotationDrawerProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <section
      className={`rotation-drawer ${expanded ? 'open' : 'collapsed'}`}
      aria-label="Cenários de Rotação de Cultivos"
    >
      <button
        type="button"
        id="btn-toggle-drawer"
        className="drawer-handle"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="drawer-handle-left">
          <Leaf size={17} className="accent-leaf" />
          <span className="drawer-title">
            Comparativo de Rotações (3 Cenários)
          </span>
          {areaHa !== null && (
            <span className="drawer-meta">
              Talhão de {areaHa} ha • Normalizado em 500 m
            </span>
          )}
        </div>
        <div className="drawer-handle-right">
          <span className="drawer-hint">
            {expanded ? 'Recolher painel' : 'Expandir recomendações'}
          </span>
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </button>

      {expanded && (
        <div className="drawer-body">
          {isLoading ? (
            <div className="drawer-loading">
              Consultando NASA POWER e harmonizando camadas SMAP, ECOSTRESS, GPM e MODIS em grade de 500 m...
            </div>
          ) : scenarios.length === 0 ? (
            <div className="drawer-empty">
              Desenhe o limite da fazenda no mapa ou selecione uma região de exemplo para gerar os 3 cenários de rotação.
            </div>
          ) : (
            <div className="scenarios-grid">
              {scenarios.map((sc) => {
                const isDetailOpen = selectedId === sc.id;
                return (
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
                          <div className="scenario-badge-row">
                            <span className="scenario-tag">{sc.badge}</span>
                            {sc.recommended && (
                              <span className="recommended-tag">
                                <ShieldCheck size={12} /> Melhor para suas prioridades
                              </span>
                            )}
                          </div>
                          <h3>{sc.title}</h3>
                          <p className="scenario-subtitle">{sc.subtitle}</p>
                        </div>
                      </div>
                      <div className="overall-score" title="Score Geral Ponderado">
                        <span className="score-num">{sc.scores.overall}</span>
                        <span className="score-label">Score</span>
                      </div>
                    </header>

                    {/* Sequence Pills */}
                    <div className="sequence-row">
                      {sc.sequence.map((step, i) => (
                        <span key={`${sc.id}-seq-${i}`} className="sequence-step">
                          {step}
                          {i < sc.sequence.length - 1 && (
                            <span className="sequence-arrow"> → </span>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* 3 Metric Bars */}
                    <div className="score-bars">
                      <div className="score-bar-item">
                        <div className="bar-label">
                          <span><Droplets size={12} /> Uso de Água</span>
                          <strong>{sc.scores.waterUse}</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill water"
                            style={{ width: `${sc.scores.waterUse}%` }}
                          />
                        </div>
                      </div>

                      <div className="score-bar-item">
                        <div className="bar-label">
                          <span><TrendingUp size={12} /> Rendimento</span>
                          <strong>{sc.scores.yieldPotential}</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill yield"
                            style={{ width: `${sc.scores.yieldPotential}%` }}
                          />
                        </div>
                      </div>

                      <div className="score-bar-item">
                        <div className="bar-label">
                          <span><Sprout size={12} /> Benefício Solo</span>
                          <strong>{sc.scores.soilBenefit}</strong>
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill soil"
                            style={{ width: `${sc.scores.soilBenefit}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <p className="scenario-summary">{sc.summary}</p>

                    <button
                      type="button"
                      className="scenario-detail-btn"
                      onClick={() =>
                        setSelectedId(isDetailOpen ? null : sc.id)
                      }
                    >
                      {isDetailOpen
                        ? 'Ocultar evidências NASA & notas'
                        : 'Ver evidências NASA & nota ao agrônomo'}
                    </button>

                    {isDetailOpen && (
                      <div className="scenario-details">
                        <div className="detail-block">
                          <strong>Evidências de Satélite:</strong>
                          <ul>
                            {sc.nasaEvidence.map((ev) => (
                              <li key={ev}>{ev}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="detail-block">
                          <strong>Validação Local (Agrônomo):</strong>
                          <p>{sc.agronomistNotes}</p>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
