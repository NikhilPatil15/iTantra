import { afterEach, describe, expect, it, vi } from "vitest";

import { MockBridge } from "./mock";
import { parseEvent } from "./schemas";

afterEach(() => {
  vi.useRealTimers();
});

describe("MockBridge scripted session", () => {
  it("emits a readback with two low-confidence words", async () => {
    vi.useFakeTimers();
    const bridge = new MockBridge();
    const readbacks: unknown[] = [];
    await bridge.addListener("readback", (e) => readbacks.push(e));
    const { utteranceId } = await bridge.beginTalk({ peerId: "ravi", mode: "ptt", confirmBeforeSend: true, lang: "hi" });
    vi.advanceTimersByTime(2000);
    expect(readbacks.length).toBe(1);
    const readback = parseEvent("readback", readbacks[0]);
    expect(readback.utteranceId).toBe(utteranceId);
    expect(readback.words.filter((w) => w.low).length).toBeGreaterThanOrEqual(2);
    expect(readback.mustConfirm).toBe(true);
  });

  it("moves an accepted message queued -> sent -> acked", async () => {
    vi.useFakeTimers();
    const bridge = new MockBridge();
    const states: string[] = [];
    await bridge.addListener("message", (m) => {
      if (m.direction === "out") states.push(m.state);
    });
    const { utteranceId } = await bridge.beginTalk({ peerId: "ravi", mode: "ptt", confirmBeforeSend: false, lang: "hi" });
    vi.advanceTimersByTime(2000);
    await bridge.acceptReadback({ utteranceId });
    vi.advanceTimersByTime(2000);
    expect(states).toContain("queued");
    expect(states).toContain("sent");
    expect(states).toContain("acked");
  });

  it("exposes a pack with a non-commercial licence", async () => {
    const bridge = new MockBridge();
    const { packs } = await bridge.listPacks();
    expect(packs.some((p) => p.licenseClass === "non-commercial")).toBe(true);
  });
});
