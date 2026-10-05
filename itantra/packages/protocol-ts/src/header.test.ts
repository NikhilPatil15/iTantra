import { describe, expect, it } from "vitest";

import { HEADER_BYTES, MessageType, Priority, decodeHeader, encodeHeader, type Header } from "./header.js";

const sample = (over: Partial<Header> = {}): Header => ({
  version: 1,
  type: MessageType.TEXT,
  priority: Priority.ALERT,
  needAck: true,
  hasConf: true,
  fragment: false,
  codebook: false,
  reserved: 0,
  language: 4,
  senderId: 0x1234,
  seq: 0xabcd,
  ageSeconds: 0x0f0f,
  hops: 7,
  payloadLen: 42,
  ...over,
});

describe("header codec", () => {
  it("is 12 bytes", () => {
    expect(encodeHeader(sample()).length).toBe(HEADER_BYTES);
  });

  it("round-trips every field", () => {
    const h = sample();
    expect(decodeHeader(encodeHeader(h))).toEqual(h);
  });

  it("packs bits at the documented positions", () => {
    const bytes = encodeHeader(sample({ type: MessageType.ACK, priority: Priority.URGENT, needAck: false, hasConf: false }));
    expect(bytes[0]).toBe(0x14); // version 1 << 4 | type 4
    expect(bytes[1]).toBe(0x40); // priority 1 << 6
    expect(bytes[3]).toBe(0x12);
    expect(bytes[4]).toBe(0x34);
    expect(bytes[11]).toBe(0);
  });

  it("rejects out-of-range fields", () => {
    expect(() => encodeHeader(sample({ payloadLen: 256 }))).toThrow();
    expect(() => encodeHeader(sample({ version: 16 }))).toThrow();
  });
});
