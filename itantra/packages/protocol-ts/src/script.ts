/**
 * Script-aware text coding, plan Section 7.3 (contribution C1).
 *
 * The coder keeps the current 128-code-point script window in state. Code points inside the
 * window cost one byte; ASCII costs one byte; anything else uses an escape.
 */

import { WINDOW_BASES, languageByCode, windowIndexForBase } from "./languages.js";

const TAG_SWITCH = 0x05;
const TAG_BMP = 0x01;
const TAG_SUPPLEMENTARY = 0x02;
const TAG_ZWJ = 0x03;
const TAG_ZWNJ = 0x04;
const TAG_DANDA = 0x06;
const TAG_DOUBLE_DANDA = 0x07;

const ZWJ = 0x200d;
const ZWNJ = 0x200c;
const DANDA = 0x0964;
const DOUBLE_DANDA = 0x0965;

/** NFC-normalise and fold control characters (except newline) to a space, per plan 7.3. */
export function normalizeText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ");
}

function windowFor(codePoint: number): number | null {
  for (let i = 0; i < WINDOW_BASES.length; i++) {
    const base = WINDOW_BASES[i]!;
    if (codePoint >= base && codePoint <= base + 0x7f) return base;
  }
  return null;
}

/**
 * Encode a single code point into `out`, given and updating `windowBase`.
 * Returns the new window base.
 */
function encodeCodePoint(cp: number, windowBase: number | null, out: number[]): number | null {
  if (cp === ZWJ) {
    out.push(TAG_ZWJ);
    return windowBase;
  }
  if (cp === ZWNJ) {
    out.push(TAG_ZWNJ);
    return windowBase;
  }
  if (cp === DANDA) {
    out.push(TAG_DANDA);
    return windowBase;
  }
  if (cp === DOUBLE_DANDA) {
    out.push(TAG_DOUBLE_DANDA);
    return windowBase;
  }
  if ((cp >= 0x20 && cp <= 0x7e) || cp === 0x0a) {
    out.push(cp);
    return windowBase;
  }
  // Try the current window first, then any registered window (emit a switch if needed).
  if (windowBase !== null && cp >= windowBase && cp <= windowBase + 0x7f) {
    out.push(0x80 + (cp - windowBase));
    return windowBase;
  }
  const targetWindow = windowFor(cp);
  if (targetWindow !== null) {
    const idx = windowIndexForBase(targetWindow);
    out.push(TAG_SWITCH, idx);
    out.push(0x80 + (cp - targetWindow));
    return targetWindow;
  }
  // Escapes.
  if (cp <= 0xffff) {
    out.push(TAG_BMP, (cp >> 8) & 0xff, cp & 0xff);
  } else {
    out.push(TAG_SUPPLEMENTARY, (cp >> 16) & 0xff, (cp >> 8) & 0xff, cp & 0xff);
  }
  return windowBase;
}

export function encodeText(text: string, langCode: string): Uint8Array {
  const lang = languageByCode(langCode);
  const normalised = normalizeText(text);
  const out: number[] = [];
  let windowBase = lang.scriptWindowBase;
  for (const ch of normalised) {
    const cp = ch.codePointAt(0)!;
    windowBase = encodeCodePoint(cp, windowBase, out);
  }
  return Uint8Array.from(out);
}

export function decodeText(bytes: Uint8Array, langCode: string): string {
  const lang = languageByCode(langCode);
  let windowBase = lang.scriptWindowBase;
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i]!;
    if (b === TAG_SWITCH) {
      const idx = bytes[i + 1];
      if (idx === undefined) throw new Error("truncated window switch");
      windowBase = WINDOW_BASES[idx] ?? null;
      if (windowBase === null) throw new Error(`invalid window index: ${idx}`);
      i += 2;
      continue;
    }
    if (b === TAG_BMP) {
      const hi = bytes[i + 1];
      const lo = bytes[i + 2];
      if (hi === undefined || lo === undefined) throw new Error("truncated BMP escape");
      out += String.fromCodePoint((hi << 8) | lo);
      i += 3;
      continue;
    }
    if (b === TAG_SUPPLEMENTARY) {
      const b2 = bytes[i + 1];
      const b1 = bytes[i + 2];
      const b0 = bytes[i + 3];
      if (b2 === undefined || b1 === undefined || b0 === undefined) throw new Error("truncated supplementary escape");
      out += String.fromCodePoint((b2 << 16) | (b1 << 8) | b0);
      i += 4;
      continue;
    }
    if (b === TAG_ZWJ) {
      out += String.fromCodePoint(ZWJ);
      i += 1;
      continue;
    }
    if (b === TAG_ZWNJ) {
      out += String.fromCodePoint(ZWNJ);
      i += 1;
      continue;
    }
    if (b === TAG_DANDA) {
      out += String.fromCodePoint(DANDA);
      i += 1;
      continue;
    }
    if (b === TAG_DOUBLE_DANDA) {
      out += String.fromCodePoint(DOUBLE_DANDA);
      i += 1;
      continue;
    }
    if ((b >= 0x20 && b <= 0x7e) || b === 0x0a) {
      out += String.fromCharCode(b);
      i += 1;
      continue;
    }
    if (b >= 0x80) {
      if (windowBase === null) throw new Error("window byte without a script window");
      out += String.fromCodePoint(windowBase + (b - 0x80));
      i += 1;
      continue;
    }
    throw new Error(`invalid script-coding byte 0x${b.toString(16)} at ${i}`);
  }
  return out;
}

/**
 * Split text into chunks whose encoded form fits `maxBytes` (plan 7.1 fragment handling).
 * Splits on code-point boundaries so a chunk always decodes on its own.
 */
export function fragmentText(text: string, langCode: string, maxBytes: number): string[] {
  if (maxBytes < 4) throw new Error("maxBytes too small for a single code point");
  const normalised = normalizeText(text);
  const chunks: string[] = [];
  let current = "";
  for (const ch of normalised) {
    // Recompute the encoded size of the candidate chunk; message-sized text makes this cheap.
    if (current.length > 0 && encodeText(current + ch, langCode).length > maxBytes) {
      chunks.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
