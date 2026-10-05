/** 12-byte frame header, plan Section 7.1. All integers big-endian. */

export const HEADER_BYTES = 12;
export const TAG_BYTES = 16;
export const MAX_PAYLOAD_BYTES = 255;
export const MAX_FRAME_BYTES = 2048;
export const PROTOCOL_VERSION = 1;

export enum MessageType {
  TEXT = 0x1,
  PHRASE = 0x2,
  ALERT_TEXT = 0x3,
  ACK = 0x4,
  HELLO = 0x5,
  PACK_OFFER = 0x6,
  PING = 0x7,
  PONG = 0x8,
  LOCATION = 0x9,
}

export enum Priority {
  ROUTINE = 0,
  URGENT = 1,
  ALERT = 2,
}

export interface Header {
  version: number;
  type: number;
  priority: number;
  needAck: boolean;
  hasConf: boolean;
  fragment: boolean;
  codebook: boolean;
  reserved: number;
  language: number;
  senderId: number;
  seq: number;
  ageSeconds: number;
  hops: number;
  payloadLen: number;
}

export function encodeHeader(h: Header): Uint8Array {
  if (h.version < 0 || h.version > 0xf) throw new Error("version out of range");
  if (h.type < 0 || h.type > 0xf) throw new Error("type out of range");
  if (h.priority < 0 || h.priority > 3) throw new Error("priority out of range");
  if (h.reserved < 0 || h.reserved > 3) throw new Error("reserved out of range");
  if (h.language < 0 || h.language > 0xff) throw new Error("language out of range");
  if (h.payloadLen < 0 || h.payloadLen > MAX_PAYLOAD_BYTES) throw new Error("payloadLen out of range");
  const out = new Uint8Array(HEADER_BYTES);
  out[0] = (h.version << 4) | (h.type & 0x0f);
  out[1] =
    ((h.priority & 0x03) << 6) |
    (h.needAck ? 0x20 : 0) |
    (h.hasConf ? 0x10 : 0) |
    (h.fragment ? 0x08 : 0) |
    (h.codebook ? 0x04 : 0) |
    (h.reserved & 0x03);
  out[2] = h.language & 0xff;
  out[3] = (h.senderId >> 8) & 0xff;
  out[4] = h.senderId & 0xff;
  out[5] = (h.seq >> 8) & 0xff;
  out[6] = h.seq & 0xff;
  out[7] = (h.ageSeconds >> 8) & 0xff;
  out[8] = h.ageSeconds & 0xff;
  out[9] = h.hops & 0xff;
  out[10] = h.payloadLen & 0xff;
  out[11] = 0;
  return out;
}

export function decodeHeader(bytes: Uint8Array): Header {
  if (bytes.length < HEADER_BYTES) throw new Error("short header");
  return {
    version: (bytes[0]! >> 4) & 0x0f,
    type: bytes[0]! & 0x0f,
    priority: (bytes[1]! >> 6) & 0x03,
    needAck: (bytes[1]! & 0x20) !== 0,
    hasConf: (bytes[1]! & 0x10) !== 0,
    fragment: (bytes[1]! & 0x08) !== 0,
    codebook: (bytes[1]! & 0x04) !== 0,
    reserved: bytes[1]! & 0x03,
    language: bytes[2]!,
    senderId: (bytes[3]! << 8) | bytes[4]!,
    seq: (bytes[5]! << 8) | bytes[6]!,
    ageSeconds: (bytes[7]! << 8) | bytes[8]!,
    hops: bytes[9]!,
    payloadLen: bytes[10]!,
  };
}
