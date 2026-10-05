/**
 * Node-only crypto used by the CLI, tests and benchmarks. The shipping app uses the Kotlin
 * implementation (Tink/libsodium); this keeps the wire format provable in CI.
 */

import { createCipheriv, createDecipheriv, hkdfSync } from "node:crypto";

import type { Aead } from "./crypto.js";

const TAG_LENGTH = 16;

export class NodeChaCha20Poly1305 implements Aead {
  seal(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, plaintext: Uint8Array): Uint8Array {
    if (key.length !== 32) throw new Error("ChaCha20-Poly1305 requires a 32-byte key");
    if (nonce.length !== 12) throw new Error("ChaCha20-Poly1305 requires a 12-byte nonce");
    const cipher = createCipheriv("chacha20-poly1305", key, nonce, { authTagLength: TAG_LENGTH });
    cipher.setAAD(aad, { plaintextLength: plaintext.length });
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    const out = new Uint8Array(ciphertext.length + tag.length);
    out.set(ciphertext, 0);
    out.set(tag, ciphertext.length);
    return out;
  }

  open(key: Uint8Array, nonce: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
    if (ciphertext.length < TAG_LENGTH) throw new Error("ciphertext shorter than tag");
    const body = ciphertext.subarray(0, ciphertext.length - TAG_LENGTH);
    const tag = ciphertext.subarray(ciphertext.length - TAG_LENGTH);
    const decipher = createDecipheriv("chacha20-poly1305", key, nonce, { authTagLength: TAG_LENGTH });
    decipher.setAAD(aad, { plaintextLength: body.length });
    decipher.setAuthTag(tag);
    return new Uint8Array(Buffer.concat([decipher.update(body), decipher.final()]));
  }
}

export function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  return new Uint8Array(hkdfSync("sha256", ikm, salt, info, length));
}
