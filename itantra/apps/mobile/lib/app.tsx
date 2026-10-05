import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createBridge } from "./bridge";
import type {
  AlertEvent,
  EmulatorConfig,
  EngineState,
  LinkEvent,
  Message,
  PackInfo,
  Peer,
  ReadbackEvent,
  SelfTestResult,
} from "./bridge/types";
import { resolveTheme, useSystemScheme, type Palette, type ThemeMode } from "./theme";

interface AppValue {
  ready: boolean;
  engine: EngineState | null;
  peers: Peer[];
  messages: Message[];
  link: LinkEvent | null;
  readback: ReadbackEvent | null;
  alert: AlertEvent | null;
  packs: PackInfo[];
  activePeerId: string;
  activeLang: string;
  confirmBeforeSend: boolean;
  lastSelfTest: SelfTestResult | null;
  colors: Palette;
  isNight: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  start: (deviceName: string) => Promise<void>;
  startDiscovery: () => Promise<void>;
  setActivePeer: (peerId: string) => void;
  setActiveLang: (lang: string) => Promise<void>;
  setConfirmBeforeSend: (value: boolean) => void;
  pairPeer: (peerRef: string) => Promise<string | undefined>;
  confirmPairing: (sessionId: string, accepted: boolean) => Promise<void>;
  connect: (peerId: string) => Promise<void>;
  beginTalk: () => Promise<void>;
  endTalk: () => Promise<void>;
  acceptReadback: (editedText?: string) => Promise<void>;
  redoUtterance: () => Promise<void>;
  sendPresetAlert: (presetId: number) => Promise<void>;
  sendSpokenAlert: () => Promise<void>;
  acknowledgeAlert: () => Promise<void>;
  simulateIncomingAlert: () => void;
  runSelfTest: (lang: string) => Promise<void>;
  installPack: (uri: string) => Promise<void>;
  setEmulator: (config: EmulatorConfig | null) => Promise<void>;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const bridgeRef = useRef(createBridge());
  const system = useSystemScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [ready, setReady] = useState(false);
  const [engine, setEngine] = useState<EngineState | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [link, setLink] = useState<LinkEvent | null>(null);
  const [readback, setReadback] = useState<ReadbackEvent | null>(null);
  const [alert, setAlert] = useState<AlertEvent | null>(null);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [activePeerId, setActivePeerId] = useState("ravi");
  const [activeLang, setActiveLangState] = useState("hi");
  const [confirmBeforeSend, setConfirmBeforeSend] = useState(true);
  const [lastSelfTest, setLastSelfTest] = useState<SelfTestResult | null>(null);

  useEffect(() => {
    const bridge = bridgeRef.current;
    const handles = [
      bridge.addListener("engineState", (e) => {
        setEngine(e);
        setActiveLangState(e.activeLang);
      }),
      bridge.addListener("peers", (e) => setPeers(e.peers)),
      bridge.addListener("link", (e) => setLink(e)),
      bridge.addListener("readback", (e) => setReadback(e)),
      bridge.addListener("alert", (e) => setAlert(e.acked ? null : e)),
      bridge.addListener("message", (e) => setMessages((prev) => [e, ...prev.filter((m) => m.messageId !== e.messageId)])),
    ];
    void (async () => {
      try {
        setEngine(await bridge.getState());
        setPacks((await bridge.listPacks()).packs);
        setPeers((await bridge.listPeers()).peers);
      } catch {
        // Native engine not ready; the mock answers these calls.
      } finally {
        setReady(true);
      }
    })();
    return () => handles.forEach((h) => h.remove());
  }, []);

  const activeUtteranceId = useRef<string | null>(null);

  const start = useCallback(async (deviceName: string) => {
    await bridgeRef.current.start({ deviceName });
  }, []);
  const startDiscovery = useCallback(async () => {
    await bridgeRef.current.startDiscovery({ transports: ["bluetooth", "wifiDirect"] });
  }, []);
  const setActiveLang = useCallback(async (lang: string) => {
    await bridgeRef.current.setActiveLanguage({ lang });
    setActiveLangState(lang);
  }, []);
  const pairPeer = useCallback(async (peerRef: string) => {
    const result = await bridgeRef.current.beginPairing({ peerRef });
    return result.sas;
  }, []);
  const confirmPairing = useCallback(async (sessionId: string, accepted: boolean) => {
    await bridgeRef.current.confirmPairing({ sessionId, accepted });
  }, []);
  const connect = useCallback(async (peerId: string) => {
    await bridgeRef.current.connect({ peerId });
  }, []);
  const beginTalk = useCallback(async () => {
    const { utteranceId } = await bridgeRef.current.beginTalk({ peerId: activePeerId, mode: "ptt", confirmBeforeSend, lang: activeLang });
    activeUtteranceId.current = utteranceId;
    setReadback(null);
  }, [activePeerId, confirmBeforeSend, activeLang]);
  const endTalk = useCallback(async () => {
    if (activeUtteranceId.current) await bridgeRef.current.endTalk({ utteranceId: activeUtteranceId.current });
  }, []);
  const acceptReadback = useCallback(async (editedText?: string) => {
    const id = activeUtteranceId.current;
    if (!id) return;
    await bridgeRef.current.acceptReadback({ utteranceId: id, ...(editedText ? { editedText } : {}) });
    setReadback(null);
    activeUtteranceId.current = null;
  }, []);
  const redoUtterance = useCallback(async () => {
    if (activeUtteranceId.current) await bridgeRef.current.redoUtterance({ utteranceId: activeUtteranceId.current });
    setReadback(null);
  }, []);
  const sendPresetAlert = useCallback(async (presetId: number) => {
    await bridgeRef.current.sendPresetAlert({ peerId: activePeerId, presetId });
  }, [activePeerId]);
  const sendSpokenAlert = useCallback(async () => {
    const { utteranceId } = await bridgeRef.current.sendSpokenAlert({ peerId: activePeerId });
    activeUtteranceId.current = utteranceId;
  }, [activePeerId]);
  const acknowledgeAlert = useCallback(async () => {
    if (!alert) return;
    await bridgeRef.current.acknowledgeAlert({ messageId: alert.messageId });
    setAlert(null);
  }, [alert]);
  const simulateIncomingAlert = useCallback(() => {
    const mock = bridgeRef.current as unknown as { simulateIncomingAlert?: () => void };
    mock.simulateIncomingAlert?.();
  }, []);
  const runSelfTest = useCallback(async (lang: string) => {
    setLastSelfTest(await bridgeRef.current.runSelfTest({ lang }));
  }, []);
  const installPack = useCallback(async (uri: string) => {
    await bridgeRef.current.installPackFromFile({ uri });
    setPacks((await bridgeRef.current.listPacks()).packs);
  }, []);
  const setEmulator = useCallback(async (config: EmulatorConfig | null) => {
    await bridgeRef.current.setEmulator({ config });
  }, []);

  const { colors, isNight } = resolveTheme(themeMode, system);

  const value = useMemo<AppValue>(
    () => ({
      ready, engine, peers, messages, link, readback, alert, packs, activePeerId, activeLang, confirmBeforeSend,
      lastSelfTest, colors, isNight, themeMode, setThemeMode, start, startDiscovery, setActivePeer: setActivePeerId,
      setActiveLang, setConfirmBeforeSend, pairPeer, confirmPairing, connect, beginTalk, endTalk, acceptReadback,
      redoUtterance, sendPresetAlert, sendSpokenAlert, acknowledgeAlert, simulateIncomingAlert, runSelfTest,
      installPack, setEmulator,
    }),
    [ready, engine, peers, messages, link, readback, alert, packs, activePeerId, activeLang, confirmBeforeSend,
      lastSelfTest, colors, isNight, themeMode, start, startDiscovery, setActiveLang, pairPeer, confirmPairing,
      connect, beginTalk, endTalk, acceptReadback, redoUtterance, sendPresetAlert, sendSpokenAlert, acknowledgeAlert,
      simulateIncomingAlert, runSelfTest, installPack, setEmulator],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
