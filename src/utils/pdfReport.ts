import { jsPDF } from 'jspdf';
import type { CropId, FarmAnalysis, FarmerPriorities, RotationScenario } from '../types/agro';
import { CROPS_CATALOG } from '../data/localAgroData';

export function generateAgronomistPdf(
  analysis: FarmAnalysis,
  currentCrop: CropId,
  priorities: FarmerPriorities,
  scenarios: RotationScenario[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  const cropName = CROPS_CATALOG[currentCrop].name;

  // Header Banner
  doc.setFillColor(0, 74, 173);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('FIELD SHIFT — Relatório Agronômico de Rotação', margin, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    `Apoio à Decisão com Dados NASA (Grade Harmonizada ~500m) | Gerado em: ${analysis.analyzedAt}`,
    margin,
    21
  );

  y = 36;

  // Farm & Soil Summary Box
  doc.setFillColor(244, 247, 245);
  doc.setDrawColor(210, 222, 215);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setTextColor(22, 40, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Identificação do Talhão & Solo Local', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Localidade: ${analysis.soil.municipality}  |  Área: ${analysis.areaHa} ha  |  Células 500m: ${analysis.gridCells.length}`,
    margin + 4,
    y + 13.5
  );
  doc.text(
    `Coordenadas: ${analysis.centroid[0].toFixed(4)}°, ${analysis.centroid[1].toFixed(4)}°  |  Cultura Atual: ${cropName}`,
    margin + 4,
    y + 19
  );
  doc.text(
    `Solo: ${analysis.soil.soilClass} (${analysis.soil.texture}) | MO: ${analysis.soil.organicMatterPct}% | Retenção: ${analysis.soil.waterRetentionCapacity}`,
    margin + 4,
    y + 24.5
  );

  y += 35;

  // NASA Telemetry Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 40, 30);
  doc.text('2. Médias de Satélite da NASA Extraídas no Polígono (Resolução ~500 m)', margin, y);
  y += 5;

  const metricsRows = [
    [
      'NASA POWER (Clima)',
      `Temp. Média: ${analysis.nasa.power.avgTempC} °C | Chuva Anual: ${analysis.nasa.power.annualPrecipMm} mm`,
      `ET: ${analysis.nasa.power.evapotranspirationMmDay} mm/dia`,
    ],
    [
      'SMAP (Umidade Solo)',
      `Umidade Volumétrica: ${analysis.nasa.smap.soilMoisturePct}%`,
      `Status: ${analysis.nasa.smap.rootZoneStatus}`,
    ],
    [
      'ECOSTRESS (Superfície)',
      `Temp. de Superfície (LST): ${analysis.nasa.ecostress.surfaceTempC} °C`,
      `Estresse Térmico: ${analysis.nasa.ecostress.heatStressDays} dias/ano`,
    ],
    [
      'GPM IMERG (Chuva)',
      `Acumulado 90 dias: ${analysis.nasa.gpm.accumulatedRain90dMm} mm`,
      `Anomalia: ${analysis.nasa.gpm.rainAnomalyPct}%`,
    ],
    [
      'MODIS (Vegetação)',
      `NDVI Médio: ${analysis.nasa.modis.meanNdvi}`,
      `Solo Exposto: ${analysis.nasa.modis.bareSoilMonths}`,
    ],
    [
      'Risco de Erosão (USLE)',
      `Índice Calculado: ${analysis.nasa.erosion.riskIndex} / 100`,
      `Nível: ${analysis.nasa.erosion.riskLevel}`,
    ],
  ];

  doc.setFontSize(8.5);
  metricsRows.forEach((row, idx) => {
    const rowY = y + idx * 6.8;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 249);
      doc.rect(margin, rowY, contentWidth, 6.8, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 42);
    doc.text(row[0], margin + 2, rowY + 4.7);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 60, 55);
    doc.text(row[1], margin + 45, rowY + 4.7);
    doc.text(row[2], margin + 128, rowY + 4.7);
  });

  y += metricsRows.length * 6.8 + 8;

  // Comparison Vector Chart
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 40, 30);
  doc.text('3. Comparativo Gráfico dos 3 Cenários de Rotação (Score 0–100)', margin, y);
  y += 5;

  const chartHeight = 36;
  doc.setFillColor(250, 251, 250);
  doc.setDrawColor(220, 228, 223);
  doc.roundedRect(margin, y, contentWidth, chartHeight, 2, 2, 'FD');

  const barColors: [number, number, number][] = [
    [37, 99, 235],   // Água (Azul)
    [217, 119, 6],   // Renda (Âmbar)
    [22, 163, 74],   // Solo (Verde)
  ];

  // Legend
  doc.setFontSize(8);
  const legends = ['Uso de Água', 'Potencial de Renda', 'Benefício ao Solo'];
  legends.forEach((label, i) => {
    const lx = margin + 6 + i * 52;
    doc.setFillColor(...barColors[i]);
    doc.rect(lx, y + 3.5, 3.5, 3.5, 'F');
    doc.setTextColor(50, 60, 55);
    doc.text(label, lx + 5, y + 6.3);
  });

  // Bars per scenario
  scenarios.forEach((sc, idx) => {
    const rowY = y + 11 + idx * 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 40, 30);
    const shortTitle =
      sc.id === 'baseline'
        ? '1. Rotação Atual'
        : sc.id === 'cover-legume'
          ? '2. Cobertura + Legum.'
          : '3. Tolerante à Seca';
    doc.text(shortTitle, margin + 4, rowY + 4.2);

    const vals = [sc.scores.waterUse, sc.scores.yieldPotential, sc.scores.soilBenefit];
    vals.forEach((val, bIdx) => {
      const bx = margin + 46 + bIdx * 43;
      const maxBarW = 30;
      doc.setFillColor(232, 236, 234);
      doc.rect(bx, rowY + 1, maxBarW, 4, 'F');
      doc.setFillColor(...barColors[bIdx]);
      doc.rect(bx, rowY + 1, (val / 100) * maxBarW, 4, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 50, 45);
      doc.text(`${val}`, bx + maxBarW + 1.5, rowY + 4.2);
    });
  });

  y += chartHeight + 8;

  // Scenario Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(22, 40, 30);
  doc.text('4. Recomendações e Pontos de Validação para o Agrônomo', margin, y);
  y += 5;

  scenarios.forEach((sc) => {
    if (y > 248) {
      doc.addPage();
      y = 18;
    }

    const boxH = 38;
    doc.setDrawColor(sc.recommended ? 22 : 205, sc.recommended ? 163 : 215, sc.recommended ? 74 : 210);
    doc.setFillColor(sc.recommended ? 242 : 252, sc.recommended ? 250 : 253, sc.recommended ? 245 : 252);
    doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(20, 45, 30);
    const titleLine = `${sc.title} (${sc.subtitle}) — Score: ${sc.scores.overall}/100${
      sc.recommended ? ' [RECOMENDADO]' : ''
    }`;
    doc.text(titleLine, margin + 3.5, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(21, 101, 52);
    doc.text(
      `Backtest 20 safras: P10=${sc.backtest.p10YieldPct}% | P50=${sc.backtest.p50YieldPct}% | P90=${sc.backtest.p90YieldPct}% | Risco quebra=${sc.backtest.failureRiskPct}% | Água poupada=${sc.impact.waterSavedM3Ha} m³/ha | N=${sc.impact.nitrogenFixedKgHa}`,
      margin + 3.5,
      y + 11.2
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(55, 65, 60);
    const summaryLines = doc.splitTextToSize(sc.summary, contentWidth - 7);
    doc.text(summaryLines.slice(0, 2), margin + 3.5, y + 16.5);

    doc.setFont('helvetica', 'italic');
    doc.setTextColor(95, 70, 30);
    const noteLines = doc.splitTextToSize(`Validação agronômica: ${sc.agronomistNotes}`, contentWidth - 7);
    doc.text(noteLines.slice(0, 2), margin + 3.5, y + 27.5);

    y += boxH + 4;
  });

  // Footer Disclaimer
  if (y > 268) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(110, 118, 114);
  const priorityText = `Prioridades informadas: Água (${priorities.lessWater}%), Renda (${priorities.moreIncome}%), Solo (${priorities.improveSoil}%), Erosão (${priorities.reduceErosion}%).`;
  doc.text(priorityText, margin, y + 4);
  doc.text(
    'Nota: Esta ferramenta apoia a decisão estratégica com dados NASA Space Apps 2026 e não substitui análise laboratorial de solo nem laudo do engenheiro agrônomo.',
    margin,
    y + 9
  );

  doc.save(`Relatorio_FieldShift_${analysis.soil.municipality.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}
