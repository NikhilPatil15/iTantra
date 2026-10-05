import { create } from "zustand";

import {
  createBridge,
  isNativePlatform,
  type AlertEvent,
  type EmulatorConfig,
  type EngineState,
  type ITantraPlugin,
  type LinkEvent,
  type Message,
  type PackInfo,
  type Peer,
  type ReadbackEvent,
  type SelfTestResult,
  type ThemeMode,
  type TransportId,
} from "@itantra/bridge";

export interface Toast {
  id: string;
  text: string;
  tone: "info" | "alert";
}

export interface AppStore {
  bridge: ITantraPlugin | null;
  booted: boolean;
  native: boolean;
  engine: EngineState | null;
  peers: Peer[];
  messages: Message[];
  link: LinkEvent | null;
  readback: ReadbackEvent | null;
  activeUtteranceId: string | null;
  alert: AlertEvent | null;
  packs: PackInfo[];
  packProgress: Record<string, number>;
  emulator: EmulatorConfig | null;
  theme: ThemeMode;
  activePeerId: string;
  activeLang: string;
  confirmBeforeSend: boolean;
  staleLimitSeconds: number;
  lastSelfTest: SelfTestResult | null;
  toasts: Toast[];

  bootstrap: () => Promise<void>;
  setTheme: (theme: ThemeMode) => void;
  setActivePeer: (peerId: string) => void;
  setActiveLang: (lang: string) => Promise<void>;
  setConfirmBeforeSend: (value: boolean) => void;
  requestPermissions: (groups: Parameters<ITantraPlugin["requestPermissions"]>[0]["groups"]) => Promise<void>;
  startDiscovery: () => Promise<void>;
  connect: (peerId: string, prefer?: TransportId) => Promise<void>;
  pair: (peerRef: string) => Promise<{ sessionId: string; sas?: string } | null>;
  confirmPairing: (sessionId: string, accepted: boolean) => Promise<void>;
  beginTalk: () => Promise<void>;
  endTalk: () => Promise<void>;
  acceptReadback: (editedText?: string) => Promise<void>;
  redoUtterance: () => Promise<void>;
  sendPresetAlert: (presetId: number) => Promise<void>;
  sendSpokenAlert: () => Promise<void>;
  acknowledgeAlert: () => Promise<void>;
  simulateIncomingAlert: () => void;
  refreshMessages: (peerId: string) => Promise<void>;
  refreshPacks: () => Promise<void>;
  installPack: (uri: string) => Promise<void>;
  removePack: (packId: string) => Promise<void>;
  runSelfTest: (lang: string) => Promise<void>;
  setEmulator: (config: EmulatorConfig | null) => Promise<void>;
  exportMetrics: () => Promise<string | null>;
  pushToast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  bridge: null,
  booted: false,
  native: false,
  engine: null,
  peers: [],
  messages: [],
  link: null,
  readback: null,
  activeUtteranceId: null,
  alert: null,
  packs: [],
  packProgress: {},
  emulator: null,
  theme: "auto",
  activePeerId: "ravi",
  activeLang: "hi",
  confirmBeforeSend: true,
  staleLimitSeconds: 300,
  lastSelfTest: null,
  toasts: [],

  bootstrap: async () => {
    if (get().bridge) return;
    const bridge = createBridge();
    const native = isNativePlatform();
    set({ bridge, native, booted: true });

    await bridge.addListener("engineState", (engine) => {
      set({ engine, activeLang: engine.activeLang });
      applyTheme(get().theme);
    });
    await bridge.addListener("peers", ({ peers }) => set({ peers }));
    await bridge.addListener("link", (link) => set({ link }));
    await bridge.addListener("readback", (readback) => set({ readback, activeUtteranceId: readback.utteranceId }));
    await bridge.addListener("message", (message) => {
      const existing = get().messages.filter((m) => m.messageId !== message.messageId);
      set({ messages: [message, ...existing] });
    });
    await bridge.addListener("alert", (alert) => set({ alert: alert.acked ? null : alert }));
    await bridge.addListener("packProgress", ({ packId, receivedBytes, totalBytes }) =>
      set({ packProgress: { ...get().packProgress, [packId]: totalBytes ? receivedBytes / totalBytes : 0 } }),
    );

    const engine = await bridge.getState();
    set({ engine, activeLang: engine.activeLang });
    const { peers } = await bridge.listPeers();
    set({ peers });
    const { packs } = await bridge.listPacks();
    set({ packs });
    applyTheme(get().theme);
  },

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== "undefined") window.localStorage.setItem("itantra-theme", theme);
    applyTheme(theme);
  },

  setActivePeer: (peerId) => set({ activePeerId: peerId }),

  setActiveLang: async (lang) => {
    await get().bridge?.setActiveLanguage({ lang });
    set({ activeLang: lang });
  },

  setConfirmBeforeSend: (confirmBeforeSend) => set({ confirmBeforeSend }),

  requestPermissions: async (groups) => {
    const bridge = get().bridge;
    if (!bridge) return;
    const state = await bridge.requestPermissions({ groups });
    const missing = state.groups.filter((g) => !g.granted && g.name !== "dndAccess");
    if (missing.length > 0) get().pushToast(`Permissions still needed: ${missing.map((m) => m.name).join(", ")}`);
  },

  startDiscovery: async () => {
    await get().bridge?.startDiscovery({ transports: ["bluetooth", "wifiDirect"] });
  },

  connect: async (peerId, prefer) => {
    await get().bridge?.connect({ peerId, prefer });
  },

  pair: async (peerRef) => {
    const result = await get().bridge?.beginPairing({ peerRef, method: "sas" });
    return result ?? null;
  },

  confirmPairing: async (sessionId, accepted) => {
    await get().bridge?.confirmPairing({ sessionId, accepted });
  },

  beginTalk: async () => {
    const bridge = get().bridge;
    if (!bridge) return;
    const { utteranceId } = await bridge.beginTalk({
      peerId: get().activePeerId,
      mode: "ptt",
      confirmBeforeSend: get().confirmBeforeSend,
      lang: get().activeLang,
    });
    set({ activeUtteranceId: utteranceId, readback: null });
  },

  endTalk: async () => {
    const id = get().activeUtteranceId;
    if (id) await get().bridge?.endTalk({ utteranceId: id });
  },

  acceptReadback: async (editedText) => {
    const id = get().activeUtteranceId;
    if (!id) return;
    await get().bridge?.acceptReadback({ utteranceId: id, ...(editedText ? { editedText } : {}) });
    set({ readback: null, activeUtteranceId: null });
  },

  redoUtterance: async () => {
    const id = get().activeUtteranceId;
    if (id) await get().bridge?.redoUtterance({ utteranceId: id });
    set({ readback: null });
  },

  sendPresetAlert: async (presetId) => {
    await get().bridge?.sendPresetAlert({ peerId: get().activePeerId, presetId });
    get().pushToast("Alert sent", "alert");
  },

  sendSpokenAlert: async () => {
    const { utteranceId } = (await get().bridge?.sendSpokenAlert({ peerId: get().activePeerId })) ?? { utteranceId: "" };
    if (utteranceId) set({ activeUtteranceId: utteranceId });
  },

  acknowledgeAlert: async () => {
    const alert = get().alert;
    if (!alert) return;
    await get().bridge?.acknowledgeAlert({ messageId: alert.messageId });
    set({ alert: null });
  },

  simulateIncomingAlert: () => {
    const bridge = get().bridge as (ITantraPlugin & { simulateIncomingAlert?: () => void }) | null;
    bridge?.simulateIncomingAlert?.();
  },

  refreshMessages: async (peerId) => {
    const result = await get().bridge?.listMessages({ peerId, limit: 50 });
    if (!result) return;
    const others = get().messages.filter((m) => m.peerId !== peerId);
    set({ messages: [...result.messages, ...others] });
  },

  refreshPacks: async () => {
    const result = await get().bridge?.listPacks();
    if (result) set({ packs: result.packs });
  },

  installPack: async (uri) => {
    await get().bridge?.installPackFromFile({ uri });
    get().pushToast("Pack installed");
    await get().refreshPacks();
  },

  removePack: async (packId) => {
    await get().bridge?.removePack({ packId });
    await get().refreshPacks();
  },

  runSelfTest: async (lang) => {
    const bridge = get().bridge;
    if (!bridge) return;
    const result = await bridge.runSelfTest({ lang });
    set({ lastSelfTest: result });
  },

  setEmulator: async (config) => {
    await get().bridge?.setEmulator({ config });
    set({ emulator: config });
  },

  exportMetrics: async () => {
    const result = await get().bridge?.exportMetrics();
    return result?.uri ?? null;
  },

  pushToast: (text, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, text, tone }] });
    setTimeout(() => get().dismissToast(id), 4000);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") return;
  const resolved =
    theme === "auto"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "night"
        : "day"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.style.colorScheme = resolved;
}


