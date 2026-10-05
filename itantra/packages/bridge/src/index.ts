import { Capacitor } from "@capacitor/core";

import { CapacitorBridge } from "./capacitor";
import { MockBridge } from "./mock";
import type { ITantraPlugin } from "./types";

export * from "./types";
export * from "./schemas";
export { MockBridge } from "./mock";
export { CapacitorBridge } from "./capacitor";

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Selects the real plugin on a device and the scripted mock everywhere else. */
export function createBridge(): ITantraPlugin {
  return isNativePlatform() ? new CapacitorBridge() : new MockBridge();
}
