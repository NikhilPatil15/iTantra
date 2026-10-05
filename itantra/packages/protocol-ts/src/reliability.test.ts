import { describe, expect, it } from "vitest";

import { DEFAULT_RETRY, DedupeWindow, ReorderBuffer, RetryScheduler, orderForDelivery, seededRng } from "./reliability.js";

describe("DedupeWindow", () => {
  it("accepts new, rejects duplicate and stale", () => {
    const window = new DedupeWindow(256);
    expect(window.accept(1)).toBe("new");
    expect(window.accept(1)).toBe("duplicate");
    expect(window.accept(2)).toBe("new");
    expect(window.inspect(2 - 32768)).toBe("new"); // exactly the lookback boundary
    expect(window.accept(40000)).toBe("new");
    expect(window.inspect(40000 - 33000)).toBe("stale");
  });

  it("evicts beyond capacity but keeps the highest sequence", () => {
    const window = new DedupeWindow(2);
    window.accept(1);
    window.accept(2);
    window.accept(3);
    expect(window.accept(3)).toBe("duplicate");
    expect(window.highestSeen).toBe(3);
  });
});

describe("ReorderBuffer", () => {
  it("delivers in order and holds a gap", () => {
    const buffer = new ReorderBuffer<string>(5000);
    expect(buffer.offer(1, "a", 0).map((d) => d.item)).toEqual(["a"]);
    expect(buffer.offer(3, "c", 10)).toEqual([]);
    expect(buffer.offer(2, "b", 20).map((d) => d.item)).toEqual(["b", "c"]);
  });

  it("forces delivery after the wait with a skipped cue", () => {
    const buffer = new ReorderBuffer<string>(5000);
    buffer.offer(1, "a", 0);
    buffer.offer(3, "c", 0);
    expect(buffer.expire(4999)).toEqual([]);
    const delivered = buffer.expire(5000);
    expect(delivered).toEqual([{ item: "c", skipped: [2] }]);
  });
});

describe("RetryScheduler", () => {
  it("backs off with a cap and clears on ACK", () => {
    let now = 0;
    const scheduler = new RetryScheduler({ ...DEFAULT_RETRY, jitterFraction: 0 }, () => now, seededRng(1));
    scheduler.schedule("m1");
    expect(scheduler.due(0)).toEqual(["m1"]);
    now = 999;
    expect(scheduler.due(now)).toEqual([]);
    now = 1000;
    expect(scheduler.due(now)).toEqual(["m1"]);
    now = 3000;
    expect(scheduler.due(now)).toEqual(["m1"]); // 1s then 2s
    now = 7000;
    expect(scheduler.due(now)).toEqual(["m1"]); // 4s then 8s
    scheduler.acknowledge("m1");
    expect(scheduler.due(99999)).toEqual([]);
  });

  it("never exceeds the configured maximum delay", () => {
    let now = 0;
    const scheduler = new RetryScheduler({ initialMs: 1000, factor: 10, maxMs: 5000, jitterFraction: 0 }, () => now, seededRng(1));
    scheduler.schedule("m1");
    scheduler.due(now);
    for (let i = 0; i < 5; i++) {
      const next = scheduler.nextRetryAt("m1")!;
      expect(next - now).toBeLessThanOrEqual(5000);
      now = next;
      scheduler.due(now);
    }
  });
});

describe("delivery ordering", () => {
  it("orders alert first, then older first", () => {
    const ordered = orderForDelivery([
      { seq: 1, priority: 0, ageSeconds: 10 },
      { seq: 2, priority: 2, ageSeconds: 1 },
      { seq: 3, priority: 0, ageSeconds: 30 },
      { seq: 4, priority: 1, ageSeconds: 5 },
    ]);
    expect(ordered.map((m) => m.seq)).toEqual([2, 4, 3, 1]);
  });
});
