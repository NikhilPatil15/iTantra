/**
 * Confidence bitmap, plan Section 7.3. Words are segments between 0x20 bytes of decoded text.
 * Bit i is the most significant bit of byte floor(i/8); 1 means low confidence.
 */

export function confidenceByteLength(wordCount: number): number {
  return Math.ceil(wordCount / 8);
}

export function encodeConfidence(lowByWord: readonly boolean[]): Uint8Array {
  const out = new Uint8Array(confidenceByteLength(lowByWord.length));
  for (let i = 0; i < lowByWord.length; i++) {
    if (lowByWord[i]) {
      out[i >> 3]! |= 0x80 >> (i & 7);
    }
  }
  return out;
}

export function decodeConfidence(bytes: Uint8Array, wordCount: number): boolean[] {
  const out: boolean[] = new Array(wordCount).fill(false);
  for (let i = 0; i < wordCount; i++) {
    const byte = bytes[i >> 3];
    if (byte === undefined) throw new Error("confidence bitmap shorter than word count");
    out[i] = (byte & (0x80 >> (i & 7))) !== 0;
  }
  return out;
}

/** Number of words in a decoded text, matching the bitmap definition. */
export function countWords(text: string): number {
  if (text.length === 0) return 0;
  return text.split(" ").length;
}
