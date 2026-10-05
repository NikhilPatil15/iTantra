import { requireOptionalNativeModule } from "expo-modules-core";

import { MockBridge } from "./mock";
import type { EngineState, ITantraBridge, ITantraEvents, ListenerHandle, Message } from "./types";
import type { EngineStatePayload, ITantraNativeModule } from "../../modules/itantra-native";

/** The native module as it exists today and as it grows. */
export const ITantraNative = requireOptionalNativeModule<ITantraNativeModule>("ITantraNative");

export function isNativeEngineAvailable(): boolean {
  try {
    return ITantraNative?.engineReady?.() === true;
  } catch {
    return false;
  }
}

const ENGINE_EVENTS = new Set(["engineState", "readback", "message", "alert"]);

/**
 * EngineBridge routes the field flow (talk, read-back, messages, alerts, state) to the native
 * in-process engine and everything else (packs, permissions, discovery, emulator) to the scripted
 * mock, so the app runs on real device code while the radio is still pending.
 */
export class EngineBridge extends MockBridge implements ITantraBridge {
  private readonly native = ITantraNative as ITantraNativeModule;
  private readonly engineListeners = new Map<string, Set<(event: unknown) => void>>();
  private readonly nativeSubscribed = new Set<string>();

  private emitLocal(name: string, payload: unknown): void {
    const set = this.engineListeners.get(name);
    if (set) for (const fn of set) fn(payload);
  }

  /**
   * Event delivery is synthesised from the native function return values as well as from native
   * events, so the UI works even if native->JS events are delayed or dropped. Duplicate payloads
   * share a messageId and are de-duplicated by the store.
   */
  override addListener<K extends keyof ITantraEvents>(name: K, fn: (event: ITantraEvents[K]) => void): ListenerHandle {
    if (!ENGINE_EVENTS.has(name as string)) return super.addListener(name, fn);
    let set = this.engineListeners.get(name as string);
    if (!set) {
      set = new Set();
      this.engineListeners.set(name as string, set);
    }
    set.add(fn as (event: unknown) => void);
    if (!this.nativeSubscribed.has(name as string) && typeof this.native.addListener === "function") {
      this.nativeSubscribed.add(name as string);
      try {
        this.native.addListener(name as string, (payload) => this.emitLocal(name as string, payload));
      } catch {
        // Native events are best-effort; the return-value path still drives the UI.
      }
    }
    return { remove: () => set!.delete(fn as (event: unknown) => void) };
  }

  override async start(o: { deviceName: string }): Promise<void> {
    this.native.startEngine(o.deviceName);
  }

  override async getState(): Promise<EngineState> {
    const state = this.native.getEngineState() as EngineStatePayload;
    const value: EngineState = {
      running: state.running,
      deviceName: state.deviceName,
      activeLang: state.activeLang,
      transports: state.transports as EngineState["transports"],
      emulatorActive: state.emulatorActive,
      emulatorPreset: state.emulatorPreset,
      foreground: state.foreground,
    };
    this.emitLocal("engineState", value);
    return value;
  }

  override async beginTalk(o: { peerId: string; mode: "ptt" | "handsfree"; confirmBeforeSend: boolean; lang: string }): Promise<{ utteranceId: string }> {
    void o.peerId;
    void o.mode;
    void o.confirmBeforeSend;
    const readback = this.native.beginTalk(o.lang);
    // Synthesise the event from the return value so the read-back shows even without native events.
    this.emitLocal("readback", readback);
    return { utteranceId: readback.utteranceId };
  }

  override async acceptReadback(o: { utteranceId: string; editedText?: string }): Promise<{ messageId: string }> {
    void o.utteranceId;
    const message = this.native.acceptReadback(o.editedText ?? "");
    this.emitLocal("message", message as unknown as Message);
    return { messageId: message.messageId };
  }

  override async sendPresetAlert(o: { peerId?: string; presetId: number }): Promise<{ messageId: string }> {
    void o.peerId;
    const message = this.native.sendPresetAlert(o.presetId);
    this.emitLocal("message", message as unknown as Message);
    return { messageId: message.messageId };
  }

  override async acknowledgeAlert(o: { messageId: string }): Promise<void> {
    this.native.acknowledgeAlert(o.messageId);
  }

  override async listMessages(o: { peerId: string; limit: number }): Promise<{ messages: Message[] }> {
    void o;
    return { messages: this.native.listEngineMessages() as unknown as Message[] };
  }
}
