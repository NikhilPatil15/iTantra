/**
 * Deterministic reliability primitives, plan Sections 6, 7.5, 10.3. These take an injected
 * clock (and RNG for jitter) so tests are fully deterministic.
 */

/**
 * Replay lookback (plan 7.4). The sender re-handshakes and starts a new epoch before the 16-bit
 * sequence wraps, so a literal comparison against the highest seen is sufficient here.
 */
const REPLAY_LOOKBACK = 32768;

export type DedupeResult = "new" | "duplicate" | "stale";

export class DedupeWindow {
  private readonly seen: number[] = [];
  private readonly set = new Set<number>();
  private highest: number | null = null;

  constructor(private readonly capacity = 256) {}

  inspect(seq: number): DedupeResult {
    if (this.set.has(seq)) return "duplicate";
    if (this.highest !== null && this.highest - seq > REPLAY_LOOKBACK) return "stale";
    return "new";
  }

  accept(seq: number): DedupeResult {
    const verdict = this.inspect(seq);
    if (verdict !== "new") return verdict;
    this.set.add(seq);
    this.seen.push(seq);
    if (this.seen.length > this.capacity) {
      const evicted = this.seen.shift()!;
      this.set.delete(evicted);
    }
    if (this.highest === null || seq > this.highest) this.highest = seq;
    return "new";
  }

  get highestSeen(): number | null {
    return this.highest;
  }
}

export interface Delivery<T> {
  item: T;
  /** Sequence numbers skipped by a timeout, delivered as a "previous message missing" cue. */
  skipped: number[];
}

interface Held<T> {
  item: T;
  at: number;
}

export class ReorderBuffer<T> {
  private nextSeq: number | null = null;
  private readonly held = new Map<number, Held<T>>();

  constructor(private readonly waitMs: number) {}

  offer(seq: number, item: T, now: number): Delivery<T>[] {
    if (this.nextSeq === null) {
      this.nextSeq = seq + 1;
      const out = [{ item, skipped: [] as number[] }];
      this.drain(out);
      return out;
    }
    if (seq < this.nextSeq) return [];
    this.held.set(seq, { item, at: now });
    const out: Delivery<T>[] = [];
    this.drain(out);
    return out;
  }

  /** Force delivery of the oldest held item after waitMs, reporting the gap as skipped. */
  expire(now: number): Delivery<T>[] {
    if (this.nextSeq === null || this.held.size === 0) return [];
    let oldestSeq: number | null = null;
    let oldestAt = Infinity;
    for (const [seq, held] of this.held) {
      if (seq >= this.nextSeq && held.at < oldestAt) {
        oldestAt = held.at;
        oldestSeq = seq;
      }
    }
    if (oldestSeq === null || oldestAt + this.waitMs > now) return [];
    const skipped: number[] = [];
    if (oldestSeq > this.nextSeq) {
      for (let s = this.nextSeq; s < oldestSeq; s++) skipped.push(s);
    }
    const entry = this.held.get(oldestSeq)!;
    this.held.delete(oldestSeq);
    this.nextSeq = oldestSeq + 1;
    const out: Delivery<T>[] = [{ item: entry.item, skipped }];
    this.drain(out);
    return out;
  }

  private drain(out: Delivery<T>[]): void {
    if (this.nextSeq === null) return;
    for (;;) {
      const entry = this.held.get(this.nextSeq);
      if (!entry) break;
      this.held.delete(this.nextSeq);
      out.push({ item: entry.item, skipped: [] });
      this.nextSeq += 1;
    }
  }

  get buffered(): number {
    return this.held.size;
  }
}

export interface RetryConfig {
  initialMs: number;
  factor: number;
  maxMs: number;
  /** Fraction of the delay applied as +/- jitter, e.g. 0.2 for +/-20%. */
  jitterFraction: number;
}

export const DEFAULT_RETRY: RetryConfig = { initialMs: 1000, factor: 2, maxMs: 30_000, jitterFraction: 0.2 };

interface RetryEntry {
  attempts: number;
  nextAt: number;
}

export type Rng = () => number;

/** Deterministic PRNG (mulberry32) for reproducible jitter in tests and benchmarks. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RetryScheduler {
  private readonly entries = new Map<string, RetryEntry>();

  constructor(
    private readonly config: RetryConfig,
    private readonly now: () => number,
    private readonly rng: Rng = () => 0.5,
  ) {}

  schedule(id: string): void {
    this.entries.set(id, { attempts: 0, nextAt: this.now() });
  }

  acknowledge(id: string): void {
    this.entries.delete(id);
  }

  cancel(id: string): void {
    this.entries.delete(id);
  }

  attempts(id: string): number {
    return this.entries.get(id)?.attempts ?? 0;
  }

  /** IDs whose retry is due now; each is rescheduled with the next backoff. */
  due(now: number): string[] {
    const out: string[] = [];
    for (const [id, entry] of this.entries) {
      if (entry.nextAt > now) continue;
      out.push(id);
      entry.attempts += 1;
      const base = Math.min(this.config.initialMs * this.config.factor ** (entry.attempts - 1), this.config.maxMs);
      const jitter = (this.rng() * 2 - 1) * this.config.jitterFraction;
      entry.nextAt = now + Math.max(1, Math.round(base * (1 + jitter)));
    }
    return out;
  }

  nextRetryAt(id: string): number | null {
    return this.entries.get(id)?.nextAt ?? null;
  }
}

export interface OutboxMessage {
  seq: number;
  priority: number;
  ageSeconds: number;
}

/** Priority first, then age (older first). Plan Section 7.5 and demo scenario 7. */
export function orderForDelivery<T extends OutboxMessage>(messages: readonly T[]): T[] {
  return [...messages].sort((a, b) => b.priority - a.priority || b.ageSeconds - a.ageSeconds || a.seq - b.seq);
}
