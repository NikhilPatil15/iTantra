/**
 * Language registry, plan Section 7.2. Index is the value carried in the header byte 2.
 * `scriptWindowBase` is the base code point of the script window used by the script-aware
 * coder (plan Section 7.3). English has no window.
 */

export interface Language {
  readonly index: number;
  readonly code: string;
  readonly displayName: string;
  readonly script: string;
  readonly scriptWindowBase: number | null;
}

export const LANGUAGES: readonly Language[] = [
  { index: 0, code: "en", displayName: "English", script: "Latin", scriptWindowBase: null },
  { index: 1, code: "hi", displayName: "हिन्दी", script: "Devanagari", scriptWindowBase: 0x0900 },
  { index: 2, code: "mr", displayName: "मराठी", script: "Devanagari", scriptWindowBase: 0x0900 },
  { index: 3, code: "gu", displayName: "ગુજરાતી", script: "Gujarati", scriptWindowBase: 0x0a80 },
  { index: 4, code: "bn", displayName: "বাংলা", script: "Bengali", scriptWindowBase: 0x0980 },
  { index: 5, code: "ta", displayName: "தமிழ்", script: "Tamil", scriptWindowBase: 0x0b80 },
  { index: 6, code: "te", displayName: "తెలుగు", script: "Telugu", scriptWindowBase: 0x0c00 },
  { index: 7, code: "kn", displayName: "ಕನ್ನಡ", script: "Kannada", scriptWindowBase: 0x0c80 },
  { index: 8, code: "ml", displayName: "മലയാളം", script: "Malayalam", scriptWindowBase: 0x0d00 },
  { index: 9, code: "or", displayName: "ଓଡ଼ିଆ", script: "Odia", scriptWindowBase: 0x0b00 },
  { index: 10, code: "pa", displayName: "ਪੰਜਾਬੀ", script: "Gurmukhi", scriptWindowBase: 0x0a00 },
];

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]));
const BY_INDEX = new Map(LANGUAGES.map((l) => [l.index, l]));

export function languageByCode(code: string): Language {
  const lang = BY_CODE.get(code);
  if (!lang) throw new Error(`unknown language code: ${code}`);
  return lang;
}

export function languageByIndex(index: number): Language {
  const lang = BY_INDEX.get(index);
  if (!lang) throw new Error(`unknown language index: ${index}`);
  return lang;
}

/** Windows are indexed 0..8; base = 0x0900 + idx * 0x80 (plan Section 7.3). */
export const WINDOW_BASES: readonly number[] = [0x0900, 0x0980, 0x0a00, 0x0a80, 0x0b00, 0x0b80, 0x0c00, 0x0c80, 0x0d00];

export function windowIndexForBase(base: number): number {
  const idx = Math.round((base - 0x0900) / 0x80);
  if (idx < 0 || idx >= WINDOW_BASES.length) throw new Error(`window base out of range: 0x${base.toString(16)}`);
  return idx;
}

export function windowContains(base: number | null, codePoint: number): boolean {
  return base !== null && codePoint >= base && codePoint <= base + 0x7f;
}
