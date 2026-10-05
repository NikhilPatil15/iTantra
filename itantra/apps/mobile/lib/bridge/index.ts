import { MockBridge } from "./mock";
import { EngineBridge, isNativeEngineAvailable } from "./native";
import type { ITantraBridge } from "./types";

export * from "./types";
export { MockBridge } from "./mock";
export { EngineBridge, ITantraNative, isNativeEngineAvailable } from "./native";

let bridge: ITantraBridge | null = null;

/**
 * Selects the native engine bridge when the Kotlin engine is ready, and the scripted mock
 * everywhere else (web, or a build without the native module) so the field screens always run.
 */
export function createBridge(): ITantraBridge {
  if (bridge) return bridge;
  bridge = isNativeEngineAvailable() ? new EngineBridge() : new MockBridge();
  return bridge;
}
