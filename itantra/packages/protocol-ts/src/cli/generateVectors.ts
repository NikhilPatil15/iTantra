/**
 * Generates the golden vectors shared by the TypeScript and Kotlin implementations.
 * Run with `pnpm vectors`. The committed JSON files are the contract; regenerate only when the
 * wire format intentionally changes (and bump the protocol version).
 */

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { buildFrame, encodeAckPayload, encodePhrasePayload, encodeTextPayload } from "../codec.js";
import { deriveNonce } from "../crypto.js";
import { encodeConfidence } from "../confidence.js";
import { MessageType, Priority, encodeHeader, type Header } from "../header.js";
import { NodeChaCha20Poly1305 } from "../node.js";
import { encodeText } from "../script.js";

const VECTORS_DIR = fileURLToPath(new URL("../../../vectors/", import.meta.url));
mkdirSync(VECTORS_DIR, { recursive: true });

const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

const scriptCases: { name: string; lang: string; text: string }[] = [
  { name: "pure-hindi", lang: "hi", text: "नदी का पानी तेजी से बढ़ रहा है।" },
  { name: "pure-tamil", lang: "ta", text: "ஆற்று நீர் வேகமாக உயர்கிறது." },
  { name: "hindi-with-english", lang: "hi", text: "पानी rising near the bridge है" },
  { name: "joiners", lang: "hi", text: "क्‍ष‌त्रिय" },
  { name: "danda-in-bengali", lang: "bn", text: "জল বাড়ছে। এখনই আসুন।" },
  { name: "emoji", lang: "hi", text: "बाढ़ 😀 आ गई" },
  { name: "empty", lang: "hi", text: "" },
  { name: "ascii-english", lang: "en", text: "Send a boat at once.\nNow" },
];

const scriptVectors = scriptCases.map((c) => ({
  ...c,
  bytes: hex(encodeText(c.text, c.lang)),
}));

const headers: { name: string; header: Header }[] = [
  {
    name: "text-routine",
    header: {
      version: 1, type: MessageType.TEXT, priority: Priority.ROUTINE, needAck: true, hasConf: false,
      fragment: false, codebook: false, reserved: 0, language: 1, senderId: 1, seq: 1, ageSeconds: 0, hops: 0, payloadLen: 8,
    },
  },
  {
    name: "alert-phrase",
    header: {
      version: 1, type: MessageType.PHRASE, priority: Priority.ALERT, needAck: true, hasConf: false,
      fragment: false, codebook: true, reserved: 0, language: 5, senderId: 0xbeef, seq: 0xffff, ageSeconds: 0x1234, hops: 3, payloadLen: 3,
    },
  },
];

const headerVectors = headers.map((h) => ({ ...h, bytes: hex(encodeHeader(h.header)) }));

const confVectors = [
  { name: "none", words: 0, flags: [] as boolean[] },
  { name: "one-low", words: 1, flags: [true] },
  { name: "eight", words: 8, flags: [true, false, false, true, false, false, true, true] },
  { name: "nine", words: 9, flags: [false, true, false, true, false, true, false, true, false] },
  { name: "sixty-four", words: 64, flags: Array.from({ length: 64 }, (_, i) => i % 4 === 0) },
].map((v) => ({ ...v, bytes: hex(encodeConfidence(v.flags)) }));

// Authenticated frames: fixed key, salt and sequences, ChaCha20-Poly1305.
const key = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const salt = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
const aead = new NodeChaCha20Poly1305();
const security = (seq: number) => ({ key, nonce: deriveNonce(salt, 1, seq), aead });

const frameVectors = [
  {
    name: "text-hindi",
    header: { type: MessageType.TEXT, language: 1, senderId: 0x0102, seq: 0x000a, ageSeconds: 3, priority: Priority.URGENT, needAck: true },
    payload: encodeTextPayload("पानी बढ़ रहा है", "hi"),
    seq: 0x000a,
  },
  {
    name: "ack",
    header: { type: MessageType.ACK, language: 1, senderId: 0x0103, seq: 0x000b, ageSeconds: 1, priority: Priority.ROUTINE },
    payload: encodeAckPayload({ kind: 1, ackSeq: 0x000a, bitmap: 0b1000_0000_0000_0000_0000_0000_0000_0000 }),
    seq: 0x000b,
  },
  {
    name: "phrase-alert",
    header: { type: MessageType.PHRASE, language: 1, senderId: 0x0102, seq: 0x000c, ageSeconds: 0, priority: Priority.ALERT, needAck: true, codebook: true },
    payload: encodePhrasePayload(3, 1),
    seq: 0x000c,
  },
].map((v) => ({
  name: v.name,
  headerInput: v.header,
  payload: hex(v.payload),
  frame: hex(buildFrame(v.header as never, v.payload, security(v.seq))),
  key: hex(key),
  salt: hex(salt),
  epoch: 1,
  seq: v.seq,
}));

const catalog: Record<string, unknown> = {
  script_coding: { version: 1, cases: scriptVectors },
  headers: { version: 1, cases: headerVectors },
  confidence: { version: 1, cases: confVectors },
  frames: { version: 1, algorithm: "chacha20-poly1305", cases: frameVectors },
};

const checksums: Record<string, string> = {};
for (const [name, value] of Object.entries(catalog)) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(`${VECTORS_DIR}${name}.json`, json);
  checksums[`${name}.json`] = createHash("sha256").update(json).digest("hex");
}
writeFileSync(`${VECTORS_DIR}checksums.json`, `${JSON.stringify({ version: 1, checksums }, null, 2)}\n`);

console.log(`wrote ${Object.keys(catalog).length} vector files to ${VECTORS_DIR}`);
