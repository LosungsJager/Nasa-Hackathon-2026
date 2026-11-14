import type { CropId } from './types/agro';

export type Lang = 'pt' | 'en';

export function tr(lang: Lang, pt: string, en: string): string {
  return lang === 'en' ? en : pt;
}

export const CROP_NAMES_EN: Record<CropId, string> = {
  soja: 'Soybean',
  milho: 'Corn (Maize)',
  algodao: 'Cotton',
  trigo: 'Wheat',
  feijao: 'Dry Beans',
  azevem: 'Ryegrass (Forage)',
  aveia: 'Black Oats',
  canola: 'Canola',
  mandioca: 'Cassava',
};

export function getCropDisplayName(id: CropId, fallbackPt: string, lang: Lang): string {
  return lang === 'en' ? CROP_NAMES_EN[id] ?? fallbackPt : fallbackPt;
}
