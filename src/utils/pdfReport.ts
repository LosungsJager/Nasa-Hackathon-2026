import { jsPDF } from 'jspdf';
import type {
  CropId,
  CropInfo,
  FarmAnalysis,
  FarmerPriorities,
  RotationScenario,
} from '../types/agro';

export function generateAgronomistPdf(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  cropsCatalog: Record<CropId, CropInfo>,
  priorities: FarmerPriorities,
  scenarios: RotationScenario[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const cropName = cropsCatalog[currentCrop].name;
  const { indicators, soil } = analysis;

  // Header Banner (#004aad)
  doc.setFillColor(0, 74, 173);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FARMBOOST — Relatório para o Agrônomo', margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Equipe Lösungsjäger • NASA Space Apps 2026 (Lajeado, RS) | Gerado em: ${analysis.analyzedAt}`,
    margin,
    19.5
  );

  y = 33;

  // 1. Farm & Soil Summary
  doc.setFillColor(245, 248, 252);
  doc.setDrawColor(200, 212, 228);
  doc.roundedRect(margin, y, contentWidth, 27, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 31, 56);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Identificação do Talhão e Solo', margin + 4, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Localidade: ${soil.municipality}  |  Área: ${analysis.areaHa} ha  |  Cultura principal: ${cropName}`,
    margin + 4,
    y + 12.5
  );
  doc.text(
    `Centroide: ${analysis.centroid[0].toFixed(4)}°, ${analysis.centroid[1].toFixed(4)}°  |  Fonte solo: ${soil.dataSourceLabel} (Confiança ${soil.confidenceLevel})`,
    margin + 4,
    y + 18
  );
  doc.text(
    `Solo: ${soil.soilClass} (${soil.texture}) | MO: ${soil.organicMatterPct}% | AWC: ${soil.availableWaterCapacityMm} mm`,
    margin + 4,
    y + 23.5
  );

  y += 33;

  // 2. Measured vs Derived Indicators
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 31, 56);
  doc.text('2. Indicadores do Talhão (Legenda: Medido vs. Derivado/Estimado)', margin, y);
  y += 4.5;

  const powerTag =
    indicators.powerSource === 'live-daily' ? '[MEDIDO - NASA POWER]' : '[ESTIMADO - OFFLINE]';

  const metricsRows = [
    [
      'Clima (2005–2024)',
      `T média: ${indicators.annualAvgTempC} °C | Chuva: ${indicators.annualMeanPrecipMm} mm/ano`,
      powerTag,
    ],
    [
      'Extremos (Tmin / P95)',
      `Geada (≤2°C): ${indicators.frostDaysPerYear} d/ano | Chuva P95: ${indicators.extremeRainDaysPerYear} d/ano`,
      powerTag,
    ],
    [
      'ET₀ e Déficit Hídrico',
      `ET₀ média: ${indicators.meanEt0MmDay} mm/dia | Déficit sazonal: ${indicators.seasonalWaterDeficitMm} mm`,
      '[DERIVADO - HARGREAVES]',
    ],
    [
      'Risco de Erosão',
      `Índice: ${indicators.estimatedErosionIndex} / 100 (${indicators.erosionLevel})`,
      '[DERIVADO - SOLO + CHUVA]',
    ],
  ];

  doc.setFontSize(8.2);
  metricsRows.forEach((row, idx) => {
    const rowY = y + idx * 6.5;
    if (idx % 2 === 0) {
      doc.setFillColor(245, 248, 252);
      doc.rect(margin, rowY, contentWidth, 6.5, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 74, 173);
    doc.text(row[0], margin + 2, rowY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(35, 45, 60);
    doc.text(row[1], margin + 40, rowY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 95, 115);
    doc.text(row[2], margin + 132, rowY + 4.5);
  });

  y += metricsRows.length * 6.5 + 7;

  // 3. Comparison Chart
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 31, 56);
  doc.text('3. Comparativo das 4 Rotações (Índices 0–100)', margin, y);
  y += 4.5;

  const chartHeight = 42;
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(213, 223, 236);
  doc.roundedRect(margin, y, contentWidth, chartHeight, 1.5, 1.5, 'FD');

  const barColors: [number, number, number][] = [
    [0, 74, 173],    // Água
    [217, 119, 6],   // Rendimento
    [126, 217, 87],  // Solo
  ];

  doc.setFontSize(7.8);
  const legends = ['Uso de Água', 'Potencial de Rendimento', 'Benefício ao Solo'];
  legends.forEach((label, i) => {
    const lx = margin + 6 + i * 54;
    doc.setFillColor(...barColors[i]);
    doc.rect(lx, y + 3.2, 3.2, 3.2, 'F');
    doc.setTextColor(40, 50, 65);
    doc.text(label, lx + 4.5, y + 5.8);
  });

  scenarios.forEach((sc, idx) => {
    const rowY = y + 10.5 + idx * 7.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 31, 56);
    doc.text(sc.title.slice(0, 24), margin + 4, rowY + 4);

    const vals = [sc.scores.waterIndex, sc.scores.yieldIndex, sc.scores.soilIndex];
    vals.forEach((val, bIdx) => {
      const bx = margin + 48 + bIdx * 43;
      const maxBarW = 28;
      doc.setFillColor(229, 235, 242);
      doc.rect(bx, rowY + 1, maxBarW, 3.8, 'F');
      doc.setFillColor(...barColors[bIdx]);
      doc.rect(bx, rowY + 1, (val / 100) * maxBarW, 3.8, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 50, 65);
      doc.text(`${val}`, bx + maxBarW + 1.5, rowY + 4);
    });
  });

  y += chartHeight + 7;

  // 4. Scenarios, Gaps & Agronomist Notes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 31, 56);
  doc.text('4. Resultados FAO-56, Lacunas de Dados e Revisão Agronômica', margin, y);
  y += 4.5;

  scenarios.forEach((sc) => {
    if (y > 242) {
      doc.addPage();
      y = 16;
    }

    const boxH = 34;
    doc.setDrawColor(sc.recommended ? 0 : 205, sc.recommended ? 74 : 215, sc.recommended ? 173 : 225);
    doc.setFillColor(sc.recommended ? 245 : 252, sc.recommended ? 249 : 253, 255);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 31, 56);
    doc.text(
      `${sc.title} (${sc.subtitle}) — Índice: ${sc.scores.overall}/100${
        sc.recommended ? ' [MAIOR SCORE]' : ''
      }`,
      margin + 3.5,
      y + 5.5
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(0, 74, 173);
    doc.text(
      `Backtest 2005–2024: P10=${sc.backtest.p10YieldPct}% | P50=${sc.backtest.p50YieldPct}% | P90=${sc.backtest.p90YieldPct}% | Quebra=${sc.backtest.failureRiskPct}% | ETc poupada=${sc.impact.waterSavedM3Ha} m³/ha | N=${sc.impact.nitrogenFixedKgHa}`,
      margin + 3.5,
      y + 10.8
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(50, 60, 75);
    const gapText = `Lacunas: ${sc.dataGaps.join(' ; ')}`;
    const gapLines = doc.splitTextToSize(gapText, contentWidth - 7);
    doc.text(gapLines.slice(0, 2), margin + 3.5, y + 16);

    doc.setFont('helvetica', 'italic');
    doc.setTextColor(110, 65, 15);
    const noteLines = doc.splitTextToSize(`Agrônomo: ${sc.agronomistNotes}`, contentWidth - 7);
    doc.text(noteLines.slice(0, 2), margin + 3.5, y + 25.5);

    y += boxH + 3.5;
  });

  // Footer
  if (y > 268) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 110, 125);
  doc.text(
    `Pesos informados: Água (${priorities.lessWater}%), Renda (${priorities.moreIncome}%), Solo (${priorities.improveSoil}%), Erosão (${priorities.reduceErosion}%).`,
    margin,
    y + 3
  );
  doc.text(
    'Ferramenta de apoio à decisão (Equipe Lösungsjäger • NASA Space Apps 2026). Não substitui análise de solo nem recomendação agronômica.',
    margin,
    y + 7.5
  );

  doc.save(`Relatorio_Farmboost_${soil.municipality.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
