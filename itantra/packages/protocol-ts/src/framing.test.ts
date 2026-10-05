import { describe, expect, it } from "vitest";

import { FrameReader } from "./framing.js";
import { MAX_FRAME_BYTES } from "./header.js";

const frame = (n: number, fill: number) => Uint8Array.from({ length: n }, () => fill);

const streamOf = (frames: Uint8Array[]): Uint8Array => {
  const total = frames.reduce((n, f) => n + 2 + f.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const f of frames) {
    out[o++] = (f.length >> 8) & 0xff;
    out[o++] = f.length & 0xff;
    out.set(f, o);
    o += f.length;
  }
  return out;
};

describe("FrameReader", () => {
  it("reads frames split across arbitrary chunk boundaries", () => {
    const frames = [frame(12, 1), frame(30, 2), frame(0xff, 3)];
    const stream = streamOf(frames);
    const reader = new FrameReader();
    const got: Uint8Array[] = [];
    for (const byte of stream) got.push(...reader.push(Uint8Array.from([byte])));
    expect(got).toEqual(frames);
  });

  it("reads many frames from one chunk", () => {
    const frames = [frame(1, 9), frame(2, 8), frame(3, 7)];
    const reader = new FrameReader();
    expect(reader.push(streamOf(frames))).toEqual(frames);
  });

  it("fuzz: random bytes never throw and never leak partial frames", () => {
    let seed = 12345;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let trial = 0; trial < 2000; trial++) {
      const reader = new FrameReader();
      const len = Math.floor(rand() * 64);
      const bytes = Uint8Array.from({ length: len }, () => Math.floor(rand() * 256));
      expect(() => reader.push(bytes)).not.toThrow();
      expect(reader.bufferedBytes).toBeLessThanOrEqual(2 + MAX_FRAME_BYTES);
    }
  });

  it("drops a corrupted length prefix without throwing", () => {
    const reader = new FrameReader();
    reader.push(Uint8Array.from([0xff, 0xff, 1, 2, 3]));
    expect(reader.dropped).toBe(1);
    expect(reader.push(Uint8Array.from([0, 1, 42]))).toEqual([Uint8Array.from([42])]);
  });
});
