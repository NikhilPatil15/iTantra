import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildFrame, decodeAckPayload, decodePhrasePayload, decodeTextPayload, parseFrame } from "./codec.js";
import { deriveNonce } from "./crypto.js";
import { encodeConfidence } from "./confidence.js";
import { decodeHeader, encodeHeader, type Header } from "./header.js";
import { NodeChaCha20Poly1305 } from "./node.js";
import { decodeText, encodeText } from "./script.js";

const load = <T>(name: string): T => JSON.parse(readFileSync(fileURLToPath(new URL(`../../vectors/${name}`, import.meta.url)), "utf8")) as T;
const fromHex = (s: string): Uint8Array => Uint8Array.from(Buffer.from(s, "hex"));

describe("golden vectors", () => {
  it("script coding matches the committed vectors", () => {
    const { cases } = load<{ cases: { name: string; lang: string; text: string; bytes: string }[] }>("script_coding.json");
    expect(cases.length).toBeGreaterThan(6);
    for (const c of cases) {
      expect(encodeText(c.text, c.lang), c.name).toEqual(fromHex(c.bytes));
      expect(decodeText(fromHex(c.bytes), c.lang), c.name).toBe(decodeText(encodeText(c.text, c.lang), c.lang));
    }
  });

  it("headers match the committed vectors", () => {
    const { cases } = load<{ cases: { name: string; header: Header; bytes: string }[] }>("headers.json");
    for (const c of cases) {
      expect(encodeHeader(c.header), c.name).toEqual(fromHex(c.bytes));
      expect(decodeHeader(fromHex(c.bytes)), c.name).toEqual(c.header);
    }
  });

  it("confidence bitmaps match the committed vectors", () => {
    const { cases } = load<{ cases: { name: string; words: number; flags: boolean[]; bytes: string }[] }>("confidence.json");
    for (const c of cases) expect(encodeConfidence(c.flags), c.name).toEqual(fromHex(c.bytes));
  });

  it("authenticated frames reproduce byte for byte", () => {
    const { cases } = load<{
      cases: { name: string; payload: string; frame: string; key: string; salt: string; epoch: number; seq: number; headerInput: never }[];
    }>("frames.json");
    const aead = new NodeChaCha20Poly1305();
    for (const c of cases) {
      const key = fromHex(c.key);
      const security = { key, nonce: deriveNonce(fromHex(c.salt), c.epoch, c.seq), aead };
      const payload = fromHex(c.payload);
      expect(Array.from(buildFrame(c.headerInput, payload, security)), c.name).toEqual(Array.from(fromHex(c.frame)));
      const parsed = parseFrame(fromHex(c.frame), security);
      expect(Array.from(parsed.payload), c.name).toEqual(Array.from(payload));
      if (parsed.header.type === 0x4) decodeAckPayload(parsed.payload);
      if (parsed.header.type === 0x2) decodePhrasePayload(parsed.payload);
      if (parsed.header.type === 0x1 || parsed.header.type === 0x3) decodeTextPayload(parsed.payload, "hi", parsed.header.hasConf);
    }
  });
});
