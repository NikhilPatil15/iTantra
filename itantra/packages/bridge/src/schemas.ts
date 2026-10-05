/** zod schemas for every event crossing the bridge. Validate at the boundary (plan Section 11). */

import { z } from "zod";

export const transportId = z.enum(["bluetooth", "wifiDirect", "nearby", "loraMeshtastic", "loopback"]);
export const priority = z.enum(["routine", "urgent", "alert"]);
export const linkState = z.enum(["disconnected", "connecting", "connected", "reconnecting", "error"]);
export const messageState = z.enum([
  "queued", "sending", "sent", "acked", "expired", "cancelled",
  "received", "playing", "played", "shownOnly", "missedPrev",
]);

export const peerSchema = z.object({
  peerId: z.string(),
  displayName: z.string(),
  senderId: z.number().int().nonnegative(),
  transport: transportId.nullable(),
  state: linkState,
  rttMs: z.number().nullable(),
  paired: z.boolean(),
  lastSeenAt: z.number().nullable(),
});

export const engineStateSchema = z.object({
  running: z.boolean(),
  deviceName: z.string(),
  activeLang: z.string(),
  transports: z.array(transportId),
  emulatorActive: z.boolean(),
  emulatorPreset: z.string().nullable(),
  foreground: z.boolean(),
});

export const linkEventSchema = z.object({
  peerId: z.string(),
  transport: transportId,
  state: linkState,
  rttMs: z.number().nullable(),
  bytesTx: z.number().nonnegative(),
  bytesRx: z.number().nonnegative(),
});

export const utteranceEventSchema = z.object({
  utteranceId: z.string(),
  state: z.enum(["listening", "transcribing", "hint"]),
  level: z.number().min(0).max(1).optional(),
});

export const readbackWordSchema = z.object({
  text: z.string(),
  conf: z.number(),
  low: z.boolean(),
  critical: z.boolean(),
});

export const readbackEventSchema = z.object({
  utteranceId: z.string(),
  lang: z.string(),
  words: z.array(readbackWordSchema),
  text: z.string(),
  mustConfirm: z.boolean(),
  voiceWarning: z.string().nullable(),
});

export const messageSchema = z.object({
  messageId: z.string(),
  peerId: z.string(),
  direction: z.enum(["out", "in"]),
  type: z.enum(["text", "phrase", "alertText"]),
  priority,
  lang: z.string(),
  text: z.string().nullable(),
  words: z.array(readbackWordSchema).nullable(),
  phraseId: z.number().nullable(),
  state: messageState,
  createdAt: z.number(),
  attempts: z.number().int().nonnegative(),
  bytesFrame: z.number().nullable(),
  bytesText: z.number().nullable(),
  transport: transportId.nullable(),
});

export const alertEventSchema = z.object({
  messageId: z.string(),
  peerId: z.string(),
  peerName: z.string(),
  lang: z.string(),
  text: z.string(),
  acked: z.boolean(),
  audible: z.boolean(),
});

export const packProgressSchema = z.object({
  packId: z.string(),
  direction: z.enum(["install", "share"]),
  receivedBytes: z.number().nonnegative(),
  totalBytes: z.number().nonnegative(),
  state: z.enum(["running", "done", "failed"]),
});

export const eventSchemas = {
  engineState: engineStateSchema,
  peers: z.object({ peers: z.array(peerSchema) }),
  link: linkEventSchema,
  utterance: utteranceEventSchema,
  readback: readbackEventSchema,
  message: messageSchema,
  alert: alertEventSchema,
  packProgress: packProgressSchema,
} as const;

export type EventName = keyof typeof eventSchemas;

export function parseEvent<K extends EventName>(name: K, value: unknown): z.infer<(typeof eventSchemas)[K]> {
  return eventSchemas[name].parse(value) as z.infer<(typeof eventSchemas)[K]>;
}
