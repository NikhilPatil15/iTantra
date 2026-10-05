/**
 * Cryptographic envelope. The shipping implementation lives in Kotlin (Tink/libsodium,
 * plan Section 3.2). This module only fixes the framing: AEAD over the payload with the
 * 12 header bytes as associated data, and the nonce layout `salt(4) | counter(8)`.
 *
 * `InsecureMockAead` exists so the TypeScript mock and the lab can exercise the whole codec.
 * It is NOT cryptography and MUST NEVER be used for a real message.
 */

export interface Aead {
  /** Returns ciphertext followed by exactly 16 tag bytes. Throws on authentication failure. */
  seal(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, plaintext: Uint8Array): Uint8Array;
  /** Inverse of seal. Must throw when the tag does not verify. */
  open(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array;
}

export function deriveNonce(salt4: Uint8Array, epoch: number, seq: number): Uint8Array {
  if (salt4.length !== 4) throw new Error("salt must be 4 bytes");
  const counter = ((epoch & 0xffff) << 16) | (seq & 0xffff);
  const nonce = new Uint8Array(12);
  nonce.set(salt4, 0);
  // counter is a safe integer; write big-endian into bytes 4..11.
  let value = counter;
  for (let i = 11; i >= 4; i--) {
    nonce[i] = value & 0xff;
    value = Math.floor(value / 256);
  }
  return nonce;
}

const fnv = (data: Uint8Array): number => {
  let h = 0x811c9dc5;
  for (const b of data) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

const streamXor = (key: Uint8Array, nonce: Uint8Array, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(data.length);
  let state = fnv(concat(key, nonce));
  for (let i = 0; i < data.length; i++) {
    state = (Math.imul(state ^ (i + 1), 0x01000193) >>> 0) || 0x9e3779b9;
    out[i] = data[i]! ^ (state & 0xff);
  }
  return out;
};

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

const tagFor = (key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array => {
  const tag = new Uint8Array(16);
  const seed = concat(key, nonce, aad, ciphertext);
  let h = fnv(seed);
  for (let i = 0; i < 16; i++) {
    h ^= i + 0x9e3779b9;
    h = Math.imul(h, 0x01000193) >>> 0;
    tag[i] = h & 0xff;
  }
  return tag;
};

export class InsecureMockAead implements Aead {
  seal(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, plaintext: Uint8Array): Uint8Array {
    const ciphertext = streamXor(key, nonce, plaintext);
    const tag = tagFor(key, nonce, aad, ciphertext);
    return concat(ciphertext, tag);
  }

  open(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
    if (ciphertext.length < 16) throw new Error("ciphertext shorter than tag");
    const body = ciphertext.slice(0, ciphertext.length - 16);
    const tag = ciphertext.slice(ciphertext.length - 16);
    const expected = tagFor(key, nonce, aad, body);
    let diff = 0;
    for (let i = 0; i < 16; i++) diff |= tag[i]! ^ expected[i]!;
    if (diff !== 0) throw new Error("AEAD authentication failed");
    return streamXor(key, nonce, body);
  }
}
