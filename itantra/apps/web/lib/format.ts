/** Formatting helpers. Numbers that count use tabular figures (plan 16.3). */

export function bytes(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.round(ms / 60_000)} min`;
}

export function clockTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function percent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export const STATE_LABELS: Record<string, string> = {
  queued: "Waiting for link",
  sending: "Sending…",
  sent: "Sent",
  acked: "Delivered",
  expired: "Expired",
  cancelled: "Cancelled",
  received: "Received",
  playing: "Playing",
  played: "Played",
  shownOnly: "Shown only",
  missedPrev: "Missing message before this",
};
