# Farmboost — Apoio à Decisão de Rotação de Cultivos

Projeto desenvolvido pela equipe **Lösungsjäger** para o **NASA Space Apps Challenge 2026** (Sede Lajeado, RS — Vale do Taquari), respondendo ao desafio *Field Shift: Adapting Farms with NASA Data*.

## O que o aplicativo faz

1. **Mapa & Talhão (`src/components/FarmMap.tsx`)**:
   - Desenho interativo do polígono da propriedade sobre imagens de satélite (Esri World Imagery) com cálculo de área (`@turf/turf`).
   - Sobreposição de camadas reais via **NASA GIBS WMTS** (`MODIS_Terra_NDVI_8Day`, `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture`, `IMERG_Precipitation_Rate`).
   - Linha do tempo (2005–2024) mostrando o resultado anual simulado do balanço hídrico FAO-56/33 para o polígono.

2. **Motor de Balanço Hídrico Diário (`src/engine/rotationEngine.ts`)**:
   - Consulta a série diária real de **20 anos (2005–2024)** da **NASA POWER Daily API** (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`).
   - Calcula contagem real de dias de geada (`T2M_MIN <= 2 °C`), limiar de chuva extrema (P95) e `ET₀` diária (Hargreaves).
   - Simula 4 estratégias de rotação: **1. Rotação Atual (Baseline)**, **2. Cobertura + Leguminosas**, **3. Cultura Tolerante à Seca** e **4. Forrageira / Integração Pecuária**, retornando **P10 / P50 / P90**, risco de quebra (`< 60%`) e análise de sensibilidade (`±20%` em `Kc` e `Ky`).

3. **Dashboard de Culturas & Relatório PDF (`src/components/CropDashboard.tsx`, `src/utils/pdfReport.ts`)**:
   - Tabela de culturas editável (`Kc`, `Ky`, ciclo), restrições da propriedade (irrigação, plantio direto, pecuária) e pesos explícitos do score.
   - Separação visual entre **Dado Medido**, **Dado Derivado** e **Premissa do Modelo**.
   - Exportação de relatório em PDF pronto para revisão com o engenheiro agrônomo.

## Fontes de Dados e Licenças

| Fonte | Uso | Endpoint / Referência | Licença |
| :--- | :--- | :--- | :--- |
| **NASA POWER** | Série diária 2005–2024 (`T2M`, `T2M_MIN`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`) | `https://power.larc.nasa.gov/api/temporal/daily/point` | Domínio Público (NASA) |
| **NASA GIBS** | Tiles WMTS (`MODIS_Terra_NDVI_8Day`, `SMAP_L4`, `IMERG`) | `https://gibs.earthdata.nasa.gov/wmts/` | Domínio Público (NASA) |
| **NASA CMR** | Busca de grânulos (`SPL4SMGP`, `ECO_L2T_LSTE`, `SRTMGL1`) | `https://cmr.earthdata.nasa.gov/search/granules.json` | Domínio Público (NASA) |
| **FAO-56 / FAO-33** | Coeficientes `Kc`, `Ky` e modelo de resposta ao déficit hídrico | [FAO Paper 56](https://www.fao.org/3/x0490e/x0490e00.htm) / [FAO-33](https://www.fao.org/3/i2800e/i2800e00.htm) | Acesso aberto FAO |
| **Embrapa / EMATER-RS / ZARC / CONAB / USDA / SoilGrids** | Perfis regionais de solo, faixas de fixação de N e referências de rendimento | Fontes públicas nacionais e globais | Uso público / acadêmico |

## Limitações Declaradas

- **Validação municipal:** A correlação estatística do modelo contra quebras históricas reais (IBGE-PAM / EMATER-RS) ainda não foi executada.
- **Resolução espacial:** NASA POWER (~50 km), SMAP L4 (9 km) e GPM (10 km) representam contexto regional; não substituem análise química/física de solo (0–20 cm) nem pluviômetro local.
- **Margem econômica:** Valores em `R$/ha` são estimativas ilustrativas baseadas em referências regionais e produtividade relativa.
- **Apoio à decisão:** O sistema não substitui a recomendação presencial do engenheiro agrônomo.

## Como Rodar Localmente

```bash
npm install
npm run dev
```

Para gerar o build de produção (Cloudflare Workers Static Assets via `wrangler.jsonc`):

```bash
npm run build
```

## Declaração de Uso de IA

Este projeto utilizou assistente de código baseado em IA (Antigravity / Gemini) para estruturação da interface React/TypeScript, integração das chamadas REST às APIs da NASA e geração de documentação. Toda a lógica agronômica foi baseada em parâmetros públicos citados (FAO-56, FAO-33, Embrapa e ZARC) e revisada pela equipe.
