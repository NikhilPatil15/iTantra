/** Stream framing: `[len:uint16][frame]`, max frame 2048 bytes (plan Section 7). */

import { MAX_FRAME_BYTES } from "./header.js";

export function encodeStreamFrame(frame: Uint8Array): Uint8Array {
  if (frame.length > MAX_FRAME_BYTES) throw new Error("frame too large");
  const out = new Uint8Array(2 + frame.length);
  out[0] = (frame.length >> 8) & 0xff;
  out[1] = frame.length & 0xff;
  out.set(frame, 2);
  return out;
}

/**
 * Incremental stream parser. `push` never throws: malformed length prefixes are dropped and the
 * reader resynchronises on the next chunk (plan T14 fuzz requirement).
 */
export class FrameReader {
  private buf: Uint8Array = new Uint8Array(0);
  private droppedFrames = 0;

  push(chunk: Uint8Array): Uint8Array[] {
    try {
      if (chunk.length > 0) {
        const merged = new Uint8Array(this.buf.length + chunk.length);
        merged.set(this.buf, 0);
        merged.set(chunk, this.buf.length);
        this.buf = merged;
      }
      const frames: Uint8Array[] = [];
      for (;;) {
        if (this.buf.length < 2) break;
        const len = (this.buf[0]! << 8) | this.buf[1]!;
        if (len === 0 || len > MAX_FRAME_BYTES) {
          // Corrupt length prefix: drop the buffer and wait for a clean chunk.
          this.buf = new Uint8Array(0);
          this.droppedFrames += 1;
          break;
        }
        if (this.buf.length < 2 + len) break;
        frames.push(this.buf.slice(2, 2 + len));
        this.buf = this.buf.slice(2 + len);
      }
      return frames;
    } catch {
      this.buf = new Uint8Array(0);
      this.droppedFrames += 1;
      return [];
    }
  }

  get bufferedBytes(): number {
    return this.buf.length;
  }

  get dropped(): number {
    return this.droppedFrames;
  }
}
