import { describe, expect, it } from "vitest";

import { confidenceByteLength, countWords, decodeConfidence, encodeConfidence } from "./confidence.js";

describe("confidence bitmap", () => {
  it("uses ceil(words / 8) bytes", () => {
    expect(confidenceByteLength(0)).toBe(0);
    expect(confidenceByteLength(1)).toBe(1);
    expect(confidenceByteLength(8)).toBe(1);
    expect(confidenceByteLength(9)).toBe(2);
    expect(confidenceByteLength(64)).toBe(8);
  });

  it("round-trips 0, 1, 8, 9 and 64 words", () => {
    for (const n of [0, 1, 8, 9, 64]) {
      const flags = Array.from({ length: n }, (_, i) => i % 3 === 0);
      const encoded = encodeConfidence(flags);
      expect(encoded.length).toBe(confidenceByteLength(n));
      expect(decodeConfidence(encoded, n)).toEqual(flags);
    }
  });

  it("sets the most significant bit of each byte for word 0", () => {
    expect(encodeConfidence([true, false, false, false, false, false, false, false])[0]).toBe(0x80);
    expect(encodeConfidence([false, false, false, false, false, false, false, true])[0]).toBe(0x01);
  });

  it("counts words as space-separated segments", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("one")).toBe(1);
    expect(countWords("one two three")).toBe(3);
  });
});
