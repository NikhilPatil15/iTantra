import { describe, expect, it } from "vitest";

import {
  buildFrame,
  decodeAckPayload,
  decodePackOfferPayload,
  decodePhrasePayload,
  decodePingPayload,
  decodeTextPayload,
  encodeAckPayload,
  encodePackOfferPayload,
  encodePhrasePayload,
  encodePingPayload,
  encodePongPayload,
  encodeTextPayload,
  parseFrame,
  type FrameSecurity,
} from "./codec.js";
import { deriveNonce } from "./crypto.js";
import { MessageType, Priority } from "./header.js";
import { NodeChaCha20Poly1305 } from "./node.js";

const aead = new NodeChaCha20Poly1305();
const key = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const salt = Uint8Array.from([9, 8, 7, 6]);
const security = (seq: number, epoch = 1): FrameSecurity => ({ key, nonce: deriveNonce(salt, epoch, seq), aead });

describe("payload codecs", () => {
  it("round-trips TEXT with and without confidence", () => {
    const text = "नदी का पानी बढ़ रहा है";
    const words = text.split(" ").length;
    const low = Array.from({ length: words }, (_, i) => i === 2);
    const payload = encodeTextPayload(text, "hi", low);
    expect(decodeTextPayload(payload, "hi", true)).toEqual({ text, lowByWord: low });
    const plain = encodeTextPayload(text, "hi");
    expect(decodeTextPayload(plain, "hi", false)).toEqual({ text, lowByWord: null });
  });

  it("round-trips PHRASE", () => {
    const payload = encodePhrasePayload(7, 3);
    expect(decodePhrasePayload(payload)).toEqual({ phraseId: 7, codebookVersion: 3 });
  });

  it("round-trips ACK with a selective bitmap", () => {
    const ack = { kind: 1, ackSeq: 0x1234, bitmap: 0b1010_0000_0000_0000_0000_0000_0000_0101 };
    expect(decodeAckPayload(encodeAckPayload(ack))).toEqual(ack);
  });

  it("round-trips PING and PONG", () => {
    expect(decodePingPayload(encodePingPayload(0xdeadbeef))).toEqual({ nonce: 0xdeadbeef });
    expect(decodePingPayload(encodePongPayload(1, 2500))).toEqual({ nonce: 1, responderMonotonicMs: 2500 });
  });

  it("round-trips PACK_OFFER", () => {
    const sha = Uint8Array.from({ length: 32 }, (_, i) => i);
    const decoded = decodePackOfferPayload(encodePackOfferPayload(4, 2, 140_000_000, sha));
    expect(decoded).toEqual({ langIndex: 4, version: 2, sizeBytes: 140_000_000, sha256: sha });
  });
});

describe("frame assembly", () => {
  it("builds and parses an authenticated TEXT frame", () => {
    const payload = encodeTextPayload("hello दुनिया", "hi");
    const frame = buildFrame(
      { type: MessageType.TEXT, language: 1, senderId: 5, seq: 10, ageSeconds: 3, priority: Priority.URGENT, needAck: true, hasConf: false },
      payload,
      security(10),
    );
    const parsed = parseFrame(frame, security(10));
    expect(parsed.header.type).toBe(MessageType.TEXT);
    expect(parsed.header.priority).toBe(Priority.URGENT);
    expect(parsed.header.needAck).toBe(true);
    expect(parsed.payload).toEqual(payload);
  });

  it("rejects a tampered tag", () => {
    const frame = buildFrame({ type: MessageType.TEXT, language: 1, senderId: 5, seq: 1, ageSeconds: 0 }, encodeTextPayload("hi", "en"), security(1));
    frame[frame.length - 1]! ^= 0xff;
    expect(() => parseFrame(frame, security(1))).toThrow(/authenticat/i);
  });

  it("rejects the wrong key", () => {
    const frame = buildFrame({ type: MessageType.TEXT, language: 1, senderId: 5, seq: 1, ageSeconds: 0 }, encodeTextPayload("hi", "en"), security(1));
    const otherKey = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);
    expect(() => parseFrame(frame, { key: otherKey, nonce: deriveNonce(salt, 1, 1), aead })).toThrow();
  });

  it("rejects a bad payload length", () => {
    const frame = buildFrame({ type: MessageType.TEXT, language: 1, senderId: 5, seq: 1, ageSeconds: 0 }, encodeTextPayload("hi", "en"), security(1));
    expect(() => parseFrame(frame.slice(0, frame.length - 1), security(1))).toThrow();
  });
});
