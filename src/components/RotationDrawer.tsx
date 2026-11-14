import { ArrowRight, Droplets, ShieldCheck, Sprout, TrendingUp } from 'lucide-react';
import { tr, type Lang } from '../i18n';
import type { RotationScenario } from '../types/agro';

interface RotationDrawerProps {
  lang: Lang;
  scenarios: RotationScenario[];
  areaHa: number | null;
  isLoading: boolean;
  onOpenDetails?: () => void;
}

export function RotationDrawer({
  lang,
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
    pct <= 10 ? tr(lang, 'Baixo', 'Low') : pct <= 25 ? tr(lang, 'Médio', 'Medium') : tr(lang, 'Alto', 'High');

  return (
    <aside className="rotation-panel" aria-label={tr(lang, 'Recomendação para a lavoura', 'Crop recommendation')}>
      <div className="panel-header">
        <div>
          <h2>{tr(lang, 'O que plantar agora', 'What to plant next')}</h2>
          {areaHa !== null && (
            <span className="panel-sub">
              {areaHa} {tr(lang, 'ha analisados', 'ha analyzed')}
            </span>
          )}
        </div>
        {onOpenDetails && (
          <button type="button" className="panel-link-btn" onClick={onOpenDetails}>
            <span>{tr(lang, 'Comparar', 'Compare')}</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="panel-body">
        {isLoading ? (
          <div className="drawer-loading">
            {tr(lang, 'Analisando clima e solo da área...', 'Analyzing local climate and soil...')}
          </div>
        ) : !best ? (
          <div className="drawer-empty">
            {tr(lang, 'Marque sua terra no mapa para ver a sugestão.', 'Mark your field on the map to see suggestions.')}
          </div>
        ) : (
          <div className="panel-stack">
            <article className="panel-scenario-row recommended">
              <div className="panel-row-top">
                <div>
                  <span className="recommended-tag">
                    <ShieldCheck size={11} /> {tr(lang, 'Melhor escolha para sua terra', 'Best choice for your field')}
                  </span>
                  <h3>{best.subtitle}</h3>
                  <p className="scenario-subtitle">
                    {best.id === 'cover-legume'
                      ? tr(
                          lang,
                          'Protege a terra contra chuva forte e ajuda a segurar umidade.',
                          'Protects topsoil from heavy rain and helps retain moisture.'
                        )
                      : best.id === 'drought-tolerant'
                        ? tr(
                            lang,
                            'Aguenta melhor períodos secos sem perder muita produção.',
                            'Handles dry spells better without major yield loss.'
                          )
                        : best.id === 'forage-livestock'
                          ? tr(
                              lang,
                              'Gera cobertura verde e alimento para o gado na entressafra.',
                              'Provides green cover and off-season forage for livestock.'
                            )
                          : tr(
                              lang,
                              'Mantém o manejo atual com bom resultado histórico na região.',
                              'Keeps your current rotation with solid historical results.'
                            )}
                  </p>
                </div>
                <div className="overall-score" title={tr(lang, 'Nota comparativa (0–100)', 'Comparative score (0–100)')}>
                  <span className="score-num">{best.scores.overall}</span>
                  <span className="score-label">{tr(lang, 'Nota', 'Score')}</span>
                </div>
              </div>

              <div className="panel-metrics-line">
                <span>{tr(lang, 'Colheita normal', 'Normal year')}: <strong>{best.backtest.p50YieldPct}%</strong></span>
                <span>{tr(lang, 'Ano seco', 'Dry year')}: <strong>{best.backtest.p10YieldPct}%</strong></span>
                <span>{tr(lang, 'Risco de perda', 'Loss risk')}: <strong>{riskWord(best.backtest.failureRiskPct)}</strong></span>
              </div>

              <div className="panel-rec-summary">
                <span>{tr(lang, 'Água poupada', 'Water saved')}: <strong>{best.impact.waterSavedM3Ha} m³/ha</strong></span>
                <span>•</span>
                <span>{tr(lang, 'Nitrogênio', 'Nitrogen')}: <strong>{best.impact.nitrogenFixedKgHa}</strong></span>
              </div>
            </article>

            <details className="sidebar-details">
              <summary className="details-summary">
                <span>
                  {tr(lang, `Ver outras ${others.length} opções e detalhes`, `See ${others.length} other options & details`)}
                </span>
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
                          <span className="score-label">{tr(lang, 'Nota', 'Score')}</span>
                        </div>
                      </div>

                      <div className="panel-metrics-line">
                        <span>{tr(lang, 'Normal', 'Normal')}: <strong>{sc.backtest.p50YieldPct}%</strong></span>
                        <span>{tr(lang, 'Seca', 'Dry')}: <strong>{sc.backtest.p10YieldPct}%</strong></span>
                        <span>{tr(lang, 'Risco', 'Risk')}: <strong>{riskWord(sc.backtest.failureRiskPct)}</strong></span>
                      </div>

                      <div className="panel-bars-compact">
                        <div className="compact-bar-row">
                          <span className="cb-label"><Droplets size={11} /> {tr(lang, 'Água', 'Water')}</span>
                          <div className="bar-track">
                            <div className="bar-fill water" style={{ width: `${sc.scores.waterIndex}%` }} />
                          </div>
                          <strong className="cb-val">{sc.scores.waterIndex}</strong>
                        </div>
                        <div className="compact-bar-row">
                          <span className="cb-label"><TrendingUp size={11} /> {tr(lang, 'Colheita', 'Yield')}</span>
                          <div className="bar-track">
                            <div className="bar-fill yield" style={{ width: `${sc.scores.yieldIndex}%` }} />
                          </div>
                          <strong className="cb-val">{sc.scores.yieldIndex}</strong>
                        </div>
                        <div className="compact-bar-row">
                          <span className="cb-label"><Sprout size={11} /> {tr(lang, 'Solo', 'Soil')}</span>
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
