import { jsPDF } from 'jspdf';
import { getCropDisplayName, tr, translateLevel, type Lang } from '../i18n';
import type {
  CropId,
  CropInfo,
  FarmAnalysis,
  FarmerPriorities,
  RotationScenario,
} from '../types/agro';

function pdfSafe(value: string): string {
  return value
    .replaceAll('→', '->')
    .replaceAll('≤', '<=')
    .replaceAll('≥', '>=')
    .replaceAll('−', '-')
    .replaceAll('–', '-')
    .replaceAll('₀', '0')
    .replaceAll('…', '...');
}

export function generateAgronomistPdf(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  cropsCatalog: Record<CropId, CropInfo>,
  priorities: FarmerPriorities,
  scenarios: RotationScenario[],
  lang: Lang = 'en'
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const origText = doc.text.bind(doc);
  doc.text = ((text: string | string[], x: number, yPos: number, options?: unknown) => {
    const clean = Array.isArray(text) ? text.map(pdfSafe) : pdfSafe(text);
    return origText(clean, x, yPos, options as never);
  }) as typeof doc.text;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const innerWidth = contentWidth - 8;
  const lineH = 4.1;
  let y = 16;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }
  };

  const cropName = getCropDisplayName(currentCrop, cropsCatalog[currentCrop].name, lang);
  const { indicators, soil } = analysis;

  // Header Banner (#004aad)
  doc.setFillColor(0, 74, 173);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text(
    tr(lang, 'FARMBOOST — Relatório para o Agrônomo', 'FARMBOOST — Agronomist Field Report'),
    margin,
    12
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.text(
    tr(
      lang,
      `Equipe Lösungsjäger • NASA Space Apps 2026 (Lajeado, RS) | Gerado em: ${analysis.analyzedAt}`,
      `Team Lösungsjäger • NASA Space Apps 2026 (Lajeado, RS) | Generated: ${analysis.analyzedAt}`
    ),
    margin,
    19.5
  );

  y = 32;

  // 1. Farm & Soil Summary (dynamic height to avoid any overlap)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  const line1 = doc.splitTextToSize(
    pdfSafe(
      tr(
        lang,
        `Localidade: ${soil.municipality}  |  Área: ${analysis.areaHa} ha  |  Cultura principal: ${cropName}`,
        `Location: ${soil.municipality}  |  Area: ${analysis.areaHa} ha  |  Main crop: ${cropName}`
      )
    ),
    innerWidth
  ) as string[];
  const confLabel = translateLevel(soil.confidenceLevel, lang);
  const line2 = doc.splitTextToSize(
    pdfSafe(
      tr(
        lang,
        `Centroide: ${analysis.centroid[0].toFixed(4)}°, ${analysis.centroid[1].toFixed(4)}°  |  Fonte solo: ${soil.dataSourceLabel} (Confiança ${confLabel})`,
        `Centroid: ${analysis.centroid[0].toFixed(4)}°, ${analysis.centroid[1].toFixed(4)}°  |  Soil source: ${soil.dataSourceLabel} (Confidence: ${confLabel})`
      )
    ),
    innerWidth
  ) as string[];
  const line3 = doc.splitTextToSize(
    pdfSafe(
      tr(
        lang,
        `Solo: ${soil.soilClass} (${soil.texture}) | MO: ${soil.organicMatterPct}% | AWC: ${soil.availableWaterCapacityMm} mm`,
        `Soil: ${soil.soilClass} (${soil.texture}) | OM: ${soil.organicMatterPct}% | AWC: ${soil.availableWaterCapacityMm} mm`
      )
    ),
    innerWidth
  ) as string[];

  const summaryLines = [...line1, ...line2, ...line3];
  const summaryBoxH = 12 + summaryLines.length * 4.6;

  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(200, 212, 228);
  doc.roundedRect(margin, y, contentWidth, summaryBoxH, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 31, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.text(
    tr(lang, '1. Identificação do Talhão e Solo', '1. Field & Soil Identification'),
    margin + 4,
    y + 6.5
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  let sy = y + 12.2;
  summaryLines.forEach((ln) => {
    doc.text(ln, margin + 4, sy);
    sy += 4.6;
  });

  y += summaryBoxH + 6;

  // 2. Measured vs Derived Indicators (right-aligned tag column prevents overlap)
  ensureSpace(36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(15, 31, 56);
  doc.text(
    tr(
      lang,
      '2. Indicadores do Talhão (Medido vs. Derivado/Estimado)',
      '2. Field Indicators (Measured vs. Derived/Estimated)'
    ),
    margin,
    y
  );
  y += 4.5;

  const powerTag =
    indicators.powerSource === 'live-daily'
      ? tr(lang, '[MEDIDO - NASA POWER]', '[MEASURED - NASA POWER]')
      : tr(lang, '[ESTIMADO - OFFLINE]', '[ESTIMATED - OFFLINE]');

  const erosionText = translateLevel(indicators.erosionLevel, lang);
  const metricsRows = [
    [
      tr(lang, 'Clima (2005–2024)', 'Climate (2005–2024)'),
      tr(
        lang,
        `T média: ${indicators.annualAvgTempC} °C | Chuva: ${indicators.annualMeanPrecipMm} mm/ano`,
        `Mean T: ${indicators.annualAvgTempC} °C | Rain: ${indicators.annualMeanPrecipMm} mm/yr`
      ),
      powerTag,
    ],
    [
      tr(lang, 'Extremos (Tmin / P95)', 'Extremes (Tmin / P95)'),
      tr(
        lang,
        `Geada (<=2°C): ${indicators.frostDaysPerYear} d/ano | Chuva P95: ${indicators.extremeRainDaysPerYear} d/ano`,
        `Frost (<=2°C): ${indicators.frostDaysPerYear} d/yr | P95 Rain: ${indicators.extremeRainDaysPerYear} d/yr`
      ),
      powerTag,
    ],
    [
      tr(lang, 'ET0 e Déficit Hídrico', 'ET0 & Water Deficit'),
      tr(
        lang,
        `ET0 média: ${indicators.meanEt0MmDay} mm/dia | Déficit: ${indicators.seasonalWaterDeficitMm} mm`,
        `Mean ET0: ${indicators.meanEt0MmDay} mm/d | Deficit: ${indicators.seasonalWaterDeficitMm} mm`
      ),
      tr(lang, '[DERIVADO - HARGREAVES]', '[DERIVED - HARGREAVES]'),
    ],
    [
      tr(lang, 'Risco de Erosão', 'Erosion Risk'),
      tr(
        lang,
        `Índice: ${indicators.estimatedErosionIndex} / 100 (${erosionText})`,
        `Index: ${indicators.estimatedErosionIndex} / 100 (${erosionText})`
      ),
      tr(lang, '[DERIVADO - SOLO + CHUVA]', '[DERIVED - SOIL + RAIN]'),
    ],
  ];

  doc.setFontSize(8);
  metricsRows.forEach((row, idx) => {
    const rowY = y + idx * 6.8;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 248, 252);
      doc.rect(margin, rowY, contentWidth, 6.8, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 74, 173);
    doc.text(row[0], margin + 2, rowY + 4.7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(35, 45, 60);
    doc.text(row[1], margin + 40, rowY + 4.7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 95, 115);
    doc.text(row[2], pageWidth - margin - 2, rowY + 4.7, { align: 'right' });
  });

  y += metricsRows.length * 6.8 + 6;

  // 3. Comparison Chart (wider label column so titles never touch bars)
  ensureSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(15, 31, 56);
  doc.text(
    tr(lang, '3. Comparativo das 4 Rotações (Índices 0–100)', '3. 4-Rotation Comparison (0–100 Scores)'),
    margin,
    y
  );
  y += 4.5;

  const chartHeight = 42;
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(213, 223, 236);
  doc.roundedRect(margin, y, contentWidth, chartHeight, 1.5, 1.5, 'FD');

  const barColors: [number, number, number][] = [
    [0, 74, 173],
    [217, 119, 6],
    [126, 217, 87],
  ];

  doc.setFontSize(7.6);
  const legends = [
    tr(lang, 'Uso de Água', 'Water Efficiency'),
    tr(lang, 'Potencial de Rendimento', 'Yield Potential'),
    tr(lang, 'Benefício ao Solo', 'Soil Health'),
  ];
  legends.forEach((label, i) => {
    const lx = margin + 56 + i * 42;
    doc.setFillColor(...barColors[i]);
    doc.rect(lx, y + 3.2, 3.2, 3.2, 'F');
    doc.setTextColor(40, 50, 65);
    doc.text(label, lx + 4.5, y + 5.8);
  });

  scenarios.forEach((sc, idx) => {
    const rowY = y + 10.5 + idx * 7.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 31, 56);
    const shortTitle = sc.title.length > 25 ? `${sc.title.slice(0, 24)}…` : sc.title;
    doc.text(shortTitle, margin + 4, rowY + 4);

    const vals = [sc.scores.waterIndex, sc.scores.yieldIndex, sc.scores.soilIndex];
    vals.forEach((val, bIdx) => {
      const bx = margin + 56 + bIdx * 42;
      const maxBarW = 26;
      doc.setFillColor(229, 235, 242);
      doc.rect(bx, rowY + 1, maxBarW, 3.8, 'F');
      doc.setFillColor(...barColors[bIdx]);
      doc.rect(bx, rowY + 1, (val / 100) * maxBarW, 3.8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 50, 65);
      doc.text(`${val}`, bx + maxBarW + 1.8, rowY + 4);
    });
  });

  y += chartHeight + 6;

  // 4. Scenarios, Gaps & Agronomist Notes (100% dynamic box height)
  ensureSpace(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.2);
  doc.setTextColor(15, 31, 56);
  doc.text(
    tr(
      lang,
      '4. Resultados FAO-56, Lacunas de Dados e Revisão Agronômica',
      '4. FAO-56 Results, Data Gaps & Agronomic Review'
    ),
    margin,
    y
  );
  y += 4.5;

  scenarios.forEach((sc) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    const titleLines = doc.splitTextToSize(
      pdfSafe(
        `${sc.title} (${sc.subtitle}) - ${tr(lang, 'Índice', 'Score')}: ${sc.scores.overall}/100${
          sc.recommended ? tr(lang, ' [MAIOR SCORE]', ' [TOP SCORE]') : ''
        }`
      ),
      innerWidth
    ) as string[];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.7);
    const backtestLines = doc.splitTextToSize(
      pdfSafe(
        tr(
          lang,
          `Backtest 2005-2024: P10=${sc.backtest.p10YieldPct}% | P50=${sc.backtest.p50YieldPct}% | Quebra=${sc.backtest.failureRiskPct}% | ETc poupada=${sc.impact.waterSavedM3Ha} m3/ha | N=${sc.impact.nitrogenFixedKgHa} | Margem=R$ ${sc.impact.estMarginBrlHa}/ha (Total: R$ ${sc.impact.totalAreaMarginBrl})`,
          `Backtest 2005-2024: P10=${sc.backtest.p10YieldPct}% | P50=${sc.backtest.p50YieldPct}% | Failure=${sc.backtest.failureRiskPct}% | ETc saved=${sc.impact.waterSavedM3Ha} m3/ha | N=${sc.impact.nitrogenFixedKgHa} | Margin=R$ ${sc.impact.estMarginBrlHa}/ha (Total: R$ ${sc.impact.totalAreaMarginBrl})`
        )
      ),
      innerWidth
    ) as string[];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.7);
    const gapLines = doc.splitTextToSize(
      pdfSafe(`${tr(lang, 'Lacunas:', 'Data gaps:')} ${sc.dataGaps.join(' ; ')}`),
      innerWidth
    ) as string[];

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.7);
    const noteLines = doc.splitTextToSize(
      pdfSafe(`${tr(lang, 'Agrônomo:', 'Agronomist:')} ${sc.agronomistNotes}`),
      innerWidth
    ) as string[];

    const boxH =
      8 +
      titleLines.length * 4.3 +
      backtestLines.length * lineH +
      gapLines.length * lineH +
      noteLines.length * lineH +
      3;

    ensureSpace(boxH + 4);

    doc.setDrawColor(sc.recommended ? 0 : 205, sc.recommended ? 74 : 215, sc.recommended ? 173 : 225);
    doc.setFillColor(sc.recommended ? 245 : 252, sc.recommended ? 249 : 253, 255);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

    let cy = y + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 31, 56);
    titleLines.forEach((ln) => {
      doc.text(ln, margin + 4, cy);
      cy += 4.3;
    });

    cy += 0.6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.7);
    doc.setTextColor(0, 74, 173);
    backtestLines.forEach((ln) => {
      doc.text(ln, margin + 4, cy);
      cy += lineH;
    });

    cy += 0.6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 75);
    gapLines.forEach((ln) => {
      doc.text(ln, margin + 4, cy);
      cy += lineH;
    });

    cy += 0.6;
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(110, 65, 15);
    noteLines.forEach((ln) => {
      doc.text(ln, margin + 4, cy);
      cy += lineH;
    });

    y += boxH + 3.5;
  });

  // Footer
  ensureSpace(14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 125);
  doc.text(
    tr(
      lang,
      `Pesos informados: Água (${priorities.lessWater}%), Renda (${priorities.moreIncome}%), Solo (${priorities.improveSoil}%), Erosão (${priorities.reduceErosion}%).`,
      `Selected weights: Water (${priorities.lessWater}%), Yield/Income (${priorities.moreIncome}%), Soil (${priorities.improveSoil}%), Erosion (${priorities.reduceErosion}%).`
    ),
    margin,
    y + 3
  );
  doc.text(
    tr(
      lang,
      'Ferramenta de apoio à decisão (Equipe Lösungsjäger • NASA Space Apps 2026). Não substitui análise de solo nem recomendação agronômica.',
      'Decision-support tool (Team Lösungsjäger • NASA Space Apps 2026). Does not replace lab soil testing or certified agronomic advice.'
    ),
    margin,
    y + 7.5
  );

  const prefix = tr(lang, 'Relatorio_Farmboost_', 'Farmboost_Report_');
  doc.save(`${prefix}${soil.municipality.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
