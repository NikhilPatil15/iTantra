/** The `ITantra` bridge contract, plan Section 11. TypeScript is the contract; Kotlin implements it. */

export type TransportId = "bluetooth" | "wifiDirect" | "nearby" | "loraMeshtastic" | "loopback";
export type Priority = "routine" | "urgent" | "alert";
export type ThemeMode = "day" | "night" | "auto";

export type LinkState = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export type OutgoingState = "queued" | "sending" | "sent" | "acked" | "expired" | "cancelled";
export type IncomingState = "received" | "playing" | "played" | "shownOnly" | "missedPrev";
export type MessageState = OutgoingState | IncomingState;

export interface Peer {
  peerId: string;
  displayName: string;
  senderId: number;
  transport: TransportId | null;
  state: LinkState;
  rttMs: number | null;
  paired: boolean;
  lastSeenAt: number | null;
}

export interface LinkEvent {
  peerId: string;
  transport: TransportId;
  state: LinkState;
  rttMs: number | null;
  bytesTx: number;
  bytesRx: number;
}

export interface UtteranceEvent {
  utteranceId: string;
  state: "listening" | "transcribing" | "hint";
  level?: number;
}

export interface ReadbackWord {
  text: string;
  conf: number;
  low: boolean;
  critical: boolean;
}

export interface ReadbackEvent {
  utteranceId: string;
  lang: string;
  words: ReadbackWord[];
  text: string;
  mustConfirm: boolean;
  voiceWarning: string | null;
}

export interface Message {
  messageId: string;
  peerId: string;
  direction: "out" | "in";
  type: "text" | "phrase" | "alertText";
  priority: Priority;
  lang: string;
  text: string | null;
  words: ReadbackWord[] | null;
  phraseId: number | null;
  state: MessageState;
  createdAt: number;
  attempts: number;
  bytesFrame: number | null;
  bytesText: number | null;
  transport: TransportId | null;
}

export interface AlertEvent {
  messageId: string;
  peerId: string;
  peerName: string;
  lang: string;
  text: string;
  acked: boolean;
  audible: boolean;
}

export interface PackFileInfo {
  name: string;
  bytes: number;
}

export interface PackInfo {
  packId: string;
  lang: string;
  displayName: string;
  version: number;
  status: "verified" | "experimental" | "disabled" | "not-installed";
  licenseClass: "permissive" | "share-alike" | "non-commercial" | null;
  sizeBytes: number;
  installed: boolean;
  selfTest: { text: string; maxWer: number; measuredWer: number | null } | null;
}

export interface PackProgress {
  packId: string;
  direction: "install" | "share";
  receivedBytes: number;
  totalBytes: number;
  state: "running" | "done" | "failed";
}

export interface EngineState {
  running: boolean;
  deviceName: string;
  activeLang: string;
  transports: TransportId[];
  emulatorActive: boolean;
  emulatorPreset: string | null;
  foreground: boolean;
}

export interface PermissionGroup {
  name: "microphone" | "bluetooth" | "nearbyWifi" | "notifications" | "dndAccess";
  granted: boolean;
}

export interface PermissionState {
  groups: PermissionGroup[];
  allGranted: boolean;
}

export interface EmulatorConfig {
  preset: string;
  rateBps: number | null;
  lossPercent: number;
  jitterMs: number;
  disconnectAfterMs: number | null;
  disconnectDurationMs: number | null;
}

export interface SelfTestResult {
  lang: string;
  expectedText: string;
  transcribedText: string;
  wer: number;
  passed: boolean;
  rtf: number;
  firstAudioMs: number | null;
}

export interface PluginListenerHandle {
  remove(): Promise<void> | void;
}

export interface EngineConfig {
  confirmBeforeSend: boolean;
  handsFree: boolean;
  staleLimitSeconds: number;
  keepHistory: boolean;
  theme: ThemeMode;
  textScale: number;
}

export interface ITantraEvents {
  engineState: EngineState;
  peers: { peers: Peer[] };
  link: LinkEvent;
  utterance: UtteranceEvent;
  readback: ReadbackEvent;
  message: Message;
  alert: AlertEvent;
  packProgress: PackProgress;
}

export interface ITantraPlugin {
  start(o: { deviceName: string }): Promise<void>;
  stop(): Promise<void>;
  getState(): Promise<EngineState>;
  checkPermissions(): Promise<PermissionState>;
  requestPermissions(o: { groups: PermissionGroup["name"][] }): Promise<PermissionState>;

  startDiscovery(o: { transports: TransportId[] }): Promise<void>;
  stopDiscovery(): Promise<void>;
  listPeers(): Promise<{ peers: Peer[] }>;
  beginPairing(o: { peerRef: string; method: "sas" | "qr" }): Promise<{ sessionId: string; sas?: string }>;
  confirmPairing(o: { sessionId: string; accepted: boolean }): Promise<void>;
  connect(o: { peerId: string; prefer?: TransportId }): Promise<void>;
  disconnect(o: { peerId: string }): Promise<void>;

  beginTalk(o: { peerId: string; mode: "ptt" | "handsfree"; confirmBeforeSend: boolean; lang: string }): Promise<{ utteranceId: string }>;
  endTalk(o: { utteranceId: string }): Promise<void>;
  acceptReadback(o: { utteranceId: string; editedText?: string }): Promise<{ messageId: string }>;
  redoUtterance(o: { utteranceId: string }): Promise<void>;
  sendPresetAlert(o: { peerId?: string; presetId: number }): Promise<{ messageId: string }>;
  sendSpokenAlert(o: { peerId?: string }): Promise<{ utteranceId: string }>;
  acknowledgeAlert(o: { messageId: string }): Promise<void>;

  listMessages(o: { peerId: string; beforeMillis?: number; limit: number }): Promise<{ messages: Message[] }>;
  cancelMessage(o: { messageId: string }): Promise<void>;

  listPacks(): Promise<{ packs: PackInfo[] }>;
  installPackFromFile(o: { uri: string }): Promise<void>;
  removePack(o: { packId: string }): Promise<void>;
  setActiveLanguage(o: { lang: string }): Promise<void>;

  setEmulator(o: { config: EmulatorConfig | null }): Promise<void>;
  runSelfTest(o: { lang: string }): Promise<SelfTestResult>;
  exportMetrics(): Promise<{ uri: string }>;

  addListener<K extends keyof ITantraEvents>(name: K, fn: (event: ITantraEvents[K]) => void): Promise<PluginListenerHandle>;
}
