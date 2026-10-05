/** Payload codecs and frame assembly, plan Section 7.2. */

import type { Aead } from "./crypto.js";
import { countWords, decodeConfidence, encodeConfidence } from "./confidence.js";
import {
  HEADER_BYTES,
  MAX_PAYLOAD_BYTES,
  MessageType,
  PROTOCOL_VERSION,
  Priority,
  TAG_BYTES,
  decodeHeader,
  encodeHeader,
  type Header,
} from "./header.js";
import { decodeText, encodeText } from "./script.js";

export interface HeaderInput {
  type: MessageType;
  language: number;
  senderId: number;
  seq: number;
  ageSeconds: number;
  priority?: Priority;
  needAck?: boolean;
  hasConf?: boolean;
  fragment?: boolean;
  codebook?: boolean;
  hops?: number;
  reserved?: number;
}

export interface FrameSecurity {
  key: Uint8Array;
  nonce: Uint8Array;
  aead: Aead;
}

export interface ParsedFrame {
  header: Header;
  payload: Uint8Array;
}

export function buildFrame(input: HeaderInput, payload: Uint8Array, security?: FrameSecurity): Uint8Array {
  if (payload.length > MAX_PAYLOAD_BYTES) throw new Error("payload exceeds 255 bytes");
  const header: Header = {
    version: PROTOCOL_VERSION,
    type: input.type,
    priority: input.priority ?? Priority.ROUTINE,
    needAck: input.needAck ?? false,
    hasConf: input.hasConf ?? false,
    fragment: input.fragment ?? false,
    codebook: input.codebook ?? false,
    reserved: input.reserved ?? 0,
    language: input.language,
    senderId: input.senderId,
    seq: input.seq,
    ageSeconds: input.ageSeconds,
    hops: input.hops ?? 0,
    payloadLen: payload.length,
  };
  const headerBytes = encodeHeader(header);
  const needsTag = input.type !== MessageType.HELLO;
  if (needsTag && !security) throw new Error("security is required for a non-HELLO frame");
  if (security) {
    const sealed = security.aead.seal(security.key, security.nonce, headerBytes, payload);
    const out = new Uint8Array(HEADER_BYTES + sealed.length);
    out.set(headerBytes, 0);
    out.set(sealed, HEADER_BYTES);
    return out;
  }
  const out = new Uint8Array(HEADER_BYTES + payload.length);
  out.set(headerBytes, 0);
  out.set(payload, HEADER_BYTES);
  return out;
}

export function parseFrame(frame: Uint8Array, security?: FrameSecurity): ParsedFrame {
  if (frame.length < HEADER_BYTES) throw new Error("frame shorter than header");
  const headerBytes = frame.slice(0, HEADER_BYTES);
  const header = decodeHeader(headerBytes);
  if (header.version !== PROTOCOL_VERSION) throw new Error(`unsupported protocol version ${header.version}`);
  const needsTag = header.type !== MessageType.HELLO;
  const expected = HEADER_BYTES + header.payloadLen + (needsTag ? TAG_BYTES : 0);
  if (frame.length !== expected) throw new Error(`frame length ${frame.length}, expected ${expected}`);
  const body = frame.slice(HEADER_BYTES);
  if (!needsTag) {
    return { header, payload: body };
  }
  if (!security) throw new Error("security is required for a tagged frame");
  const plaintext = security.aead.open(security.key, security.nonce, headerBytes, body);
  return { header, payload: plaintext };
}

// --- TEXT / ALERT_TEXT -------------------------------------------------------

export function encodeTextPayload(text: string, langCode: string, lowByWord?: readonly boolean[]): Uint8Array {
  const textBytes = encodeText(text, langCode);
  const wordCount = countWords(text);
  if (lowByWord && lowByWord.length !== wordCount) {
    throw new Error(`confidence length ${lowByWord.length} does not match word count ${wordCount}`);
  }
  const conf = lowByWord ? encodeConfidence(lowByWord) : new Uint8Array(0);
  if (textBytes.length > 255 - conf.length) throw new Error("text payload exceeds 255 bytes");
  const out = new Uint8Array(1 + textBytes.length + conf.length);
  out[0] = textBytes.length;
  out.set(textBytes, 1);
  out.set(conf, 1 + textBytes.length);
  return out;
}

export function decodeTextPayload(payload: Uint8Array, langCode: string, hasConf: boolean): { text: string; lowByWord: boolean[] | null } {
  if (payload.length < 1) throw new Error("empty text payload");
  const textLen = payload[0]!;
  if (1 + textLen > payload.length) throw new Error("text length exceeds payload");
  const textBytes = payload.slice(1, 1 + textLen);
  const text = decodeText(textBytes, langCode);
  const rest = payload.slice(1 + textLen);
  if (hasConf) {
    return { text, lowByWord: decodeConfidence(rest, countWords(text)) };
  }
  return { text, lowByWord: null };
}

// --- PHRASE ------------------------------------------------------------------

export function encodePhrasePayload(phraseId: number, codebookVersion: number): Uint8Array {
  if (phraseId < 0 || phraseId > 0xffff) throw new Error("phraseId out of range");
  if (codebookVersion < 0 || codebookVersion > 0xff) throw new Error("codebookVersion out of range");
  return Uint8Array.from([(phraseId >> 8) & 0xff, phraseId & 0xff, codebookVersion & 0xff]);
}

export function decodePhrasePayload(payload: Uint8Array): { phraseId: number; codebookVersion: number } {
  if (payload.length < 3) throw new Error("short phrase payload");
  return { phraseId: (payload[0]! << 8) | payload[1]!, codebookVersion: payload[2]! };
}

// --- ACK ---------------------------------------------------------------------

export interface AckPayload {
  /** 0 transport, 1 human. */
  kind: number;
  ackSeq: number;
  /** Bit k = received ackSeq-1-k. */
  bitmap: number;
}

export function encodeAckPayload(ack: AckPayload): Uint8Array {
  const out = new Uint8Array(7);
  out[0] = ack.kind & 0xff;
  out[1] = (ack.ackSeq >> 8) & 0xff;
  out[2] = ack.ackSeq & 0xff;
  out[3] = (ack.bitmap >>> 24) & 0xff;
  out[4] = (ack.bitmap >>> 16) & 0xff;
  out[5] = (ack.bitmap >>> 8) & 0xff;
  out[6] = ack.bitmap & 0xff;
  return out;
}

export function decodeAckPayload(payload: Uint8Array): AckPayload {
  if (payload.length < 7) throw new Error("short ACK payload");
  const bitmap = ((payload[3]! << 24) | (payload[4]! << 16) | (payload[5]! << 8) | payload[6]!) >>> 0;
  return { kind: payload[0]!, ackSeq: (payload[1]! << 8) | payload[2]!, bitmap };
}

// --- PING / PONG -------------------------------------------------------------

export function encodePingPayload(nonce: number): Uint8Array {
  return Uint8Array.from([(nonce >>> 24) & 0xff, (nonce >>> 16) & 0xff, (nonce >>> 8) & 0xff, nonce & 0xff]);
}

export function encodePongPayload(nonce: number, responderMonotonicMs: number): Uint8Array {
  const out = new Uint8Array(8);
  out.set(encodePingPayload(nonce), 0);
  out[4] = (responderMonotonicMs >>> 24) & 0xff;
  out[5] = (responderMonotonicMs >>> 16) & 0xff;
  out[6] = (responderMonotonicMs >>> 8) & 0xff;
  out[7] = responderMonotonicMs & 0xff;
  return out;
}

export function decodePingPayload(payload: Uint8Array): { nonce: number; responderMonotonicMs?: number } {
  if (payload.length < 4) throw new Error("short ping payload");
  const nonce = ((payload[0]! << 24) | (payload[1]! << 16) | (payload[2]! << 8) | payload[3]!) >>> 0;
  if (payload.length >= 8) {
    const ms = ((payload[4]! << 24) | (payload[5]! << 16) | (payload[6]! << 8) | payload[7]!) >>> 0;
    return { nonce, responderMonotonicMs: ms };
  }
  return { nonce };
}

// --- PACK_OFFER --------------------------------------------------------------

export function encodePackOfferPayload(langIndex: number, version: number, sizeBytes: number, sha256: Uint8Array): Uint8Array {
  if (sha256.length !== 32) throw new Error("sha256 must be 32 bytes");
  const out = new Uint8Array(39);
  out[0] = langIndex;
  out[1] = (version >> 8) & 0xff;
  out[2] = version & 0xff;
  const view = new DataView(out.buffer);
  view.setUint32(3, sizeBytes >>> 0, false);
  out.set(sha256, 7);
  return out;
}

export function decodePackOfferPayload(payload: Uint8Array): { langIndex: number; version: number; sizeBytes: number; sha256: Uint8Array } {
  if (payload.length < 39) throw new Error("short PACK_OFFER payload");
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  return {
    langIndex: payload[0]!,
    version: (payload[1]! << 8) | payload[2]!,
    sizeBytes: view.getUint32(3, false),
    sha256: payload.slice(7, 39),
  };
}
