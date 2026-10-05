import type {
  AlertEvent,
  EmulatorConfig,
  EngineState,
  ITantraBridge,
  ITantraEvents,
  LinkEvent,
  ListenerHandle,
  Message,
  PackInfo,
  Peer,
  PermissionGroup,
  PermissionState,
  ReadbackEvent,
  ReadbackWord,
  SelfTestResult,
  TransportId,
} from "./types";

/** Scripted bridge for development, mirroring packages/bridge MockBridge. All data is fake. */

const now = () => Date.now();
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const SCRIPTED: { text: string; conf: number; critical?: boolean }[] = [
  { text: "नदी", conf: 0.97 },
  { text: "का", conf: 0.99 },
  { text: "पानी", conf: 0.42 },
  { text: "तेजी", conf: 0.88 },
  { text: "से", conf: 0.95 },
  { text: "बढ़", conf: 0.31 },
  { text: "रहा", conf: 0.9 },
  { text: "है", conf: 0.98 },
  { text: "नाव", conf: 0.94 },
  { text: "भेजिए", conf: 0.91 },
];

const PACKS: PackInfo[] = [
  { packId: "hi", lang: "hi", displayName: "हिन्दी", version: 1, status: "experimental", licenseClass: "permissive", sizeBytes: 142_000_000, installed: true, selfTest: { text: "नदी का पानी बढ़ रहा है", maxWer: 0.25, measuredWer: 0.18 } },
  { packId: "en", lang: "en", displayName: "English", version: 1, status: "experimental", licenseClass: "permissive", sizeBytes: 137_000_000, installed: true, selfTest: { text: "The river is rising", maxWer: 0.2, measuredWer: 0.12 } },
  { packId: "ta", lang: "ta", displayName: "தமிழ்", version: 1, status: "not-installed", licenseClass: "non-commercial", sizeBytes: 151_000_000, installed: false, selfTest: null },
  { packId: "bn", lang: "bn", displayName: "বাংলা", version: 1, status: "not-installed", licenseClass: "permissive", sizeBytes: 149_000_000, installed: false, selfTest: null },
];

type Listener<K extends keyof ITantraEvents> = (event: ITantraEvents[K]) => void;

export class MockBridge implements ITantraBridge {
  private listeners = new Map<string, Set<(e: never) => void>>();
  private peers: Peer[] = [
    { peerId: "ravi", displayName: "Ravi", senderId: 2, transport: null, state: "disconnected", rttMs: null, paired: false, lastSeenAt: null },
    { peerId: "meena", displayName: "Meena", senderId: 3, transport: null, state: "disconnected", rttMs: null, paired: false, lastSeenAt: null },
  ];
  private messages: Message[] = [];
  private sessions = new Map<string, { peerId: string; lang: string; text: string; words: ReadbackWord[]; mustConfirm: boolean }>();
  private state: EngineState = {
    running: false,
    deviceName: "Field phone A",
    activeLang: "hi",
    transports: ["bluetooth", "wifiDirect"],
    emulatorActive: false,
    emulatorPreset: null,
    foreground: false,
  };

  addListener<K extends keyof ITantraEvents>(name: K, fn: Listener<K>): ListenerHandle {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(fn as (e: never) => void);
    return { remove: () => set!.delete(fn as (e: never) => void) };
  }

  private emit<K extends keyof ITantraEvents>(name: K, event: ITantraEvents[K]): void {
    const set = this.listeners.get(name);
    if (set) for (const fn of set) (fn as (e: ITantraEvents[K]) => void)(event);
  }

  private setPeer(peerId: string, patch: Partial<Peer>): void {
    this.peers = this.peers.map((p) => (p.peerId === peerId ? { ...p, ...patch } : p));
    this.emit("peers", { peers: this.peers });
  }

  private link(peerId: string, transport: TransportId, state: LinkEvent["state"], rttMs: number | null): void {
    this.setPeer(peerId, { transport: state === "connected" ? transport : null, state, rttMs });
    this.emit("link", { peerId, transport, state, rttMs, bytesTx: 120, bytesRx: 118 });
  }

  private push(message: Message): void {
    this.messages = [message, ...this.messages];
    this.emit("message", message);
  }

  private update(messageId: string, patch: Partial<Message>): void {
    const existing = this.messages.find((m) => m.messageId === messageId);
    if (!existing) return;
    const updated = { ...existing, ...patch } as Message;
    this.messages = this.messages.map((m) => (m.messageId === messageId ? updated : m));
    this.emit("message", updated);
  }

  async start(o: { deviceName: string }): Promise<void> {
    this.state = { ...this.state, running: true, deviceName: o.deviceName, foreground: true };
    this.emit("engineState", this.state);
  }

  async getState(): Promise<EngineState> {
    return this.state;
  }

  async checkPermissions(): Promise<PermissionState> {
    return { groups: [
      { name: "microphone", granted: true },
      { name: "bluetooth", granted: true },
      { name: "nearbyWifi", granted: false },
      { name: "notifications", granted: true },
      { name: "dndAccess", granted: false },
    ], allGranted: false };
  }

  async requestPermissions(_o: { groups: PermissionGroup["name"][] }): Promise<PermissionState> {
    void _o;
    return this.checkPermissions();
  }

  async startDiscovery(o: { transports: TransportId[] }): Promise<void> {
    this.state = { ...this.state, transports: o.transports };
    this.emit("engineState", this.state);
    this.emit("peers", { peers: this.peers });
  }

  async listPeers(): Promise<{ peers: Peer[] }> {
    return { peers: this.peers };
  }

  async beginPairing(_o: { peerRef: string }): Promise<{ sessionId: string; sas?: string }> {
    void _o;
    return { sessionId: uid("pair"), sas: "417 902" };
  }

  async confirmPairing(o: { sessionId: string; accepted: boolean }): Promise<void> {
    if (!o.accepted) return;
    this.setPeer("ravi", { paired: true });
  }

  async connect(o: { peerId: string }): Promise<void> {
    this.link(o.peerId, "bluetooth", "connecting", null);
    setTimeout(() => this.link(o.peerId, "bluetooth", "connected", 42), 500);
  }

  async beginTalk(o: { peerId: string; confirmBeforeSend: boolean; lang: string }): Promise<{ utteranceId: string }> {
    const utteranceId = uid("utt");
    const words: ReadbackWord[] = SCRIPTED.map((w) => ({ text: w.text, conf: w.conf, low: w.conf < 0.6, critical: w.critical ?? false }));
    this.sessions.set(utteranceId, { peerId: o.peerId, lang: o.lang, text: words.map((w) => w.text).join(" "), words, mustConfirm: o.confirmBeforeSend });
    this.emit("utterance", { utteranceId, state: "listening", level: 0.5 });
    setTimeout(() => this.emit("utterance", { utteranceId, state: "transcribing" }), 800);
    setTimeout(() => {
      const s = this.sessions.get(utteranceId);
      if (!s) return;
      const event: ReadbackEvent = { utteranceId, lang: s.lang, words: s.words, text: s.text, mustConfirm: s.mustConfirm, voiceWarning: s.lang === "ta" ? "The Tamil voice is not installed." : null };
      this.emit("readback", event);
    }, 1600);
    return { utteranceId };
  }

  async endTalk(_o: { utteranceId: string }): Promise<void> {
    void _o;
  }

  async acceptReadback(o: { utteranceId: string; editedText?: string }): Promise<{ messageId: string }> {
    const s = this.sessions.get(o.utteranceId);
    if (!s) throw new Error("unknown utterance");
    const message: Message = {
      messageId: uid("msg"), peerId: s.peerId, direction: "out", type: "text", priority: "routine", lang: s.lang,
      text: o.editedText ?? s.text, words: s.words, phraseId: null, state: "queued", createdAt: now(), attempts: 0,
      bytesFrame: 42, bytesText: 24, transport: null,
    };
    this.push(message);
    setTimeout(() => this.update(message.messageId, { state: "sent", attempts: 1, transport: "bluetooth" }), 450);
    setTimeout(() => this.update(message.messageId, { state: "acked" }), 1100);
    setTimeout(() => this.incomingReply(s.peerId), 2000);
    return { messageId: message.messageId };
  }

  async redoUtterance(o: { utteranceId: string }): Promise<void> {
    this.emit("utterance", { utteranceId: o.utteranceId, state: "listening" });
  }

  private incomingReply(peerId: string): void {
    this.push({
      messageId: uid("msg"), peerId, direction: "in", type: "text", priority: "routine", lang: "hi",
      text: "ठीक है, नाव भेज रहे हैं।",  words: [
        { text: "ठीक", conf: 0.96, low: false, critical: false },
        { text: "है", conf: 0.94, low: false, critical: false },
        { text: "नाव", conf: 0.58, low: true, critical: false },
      ], phraseId: null, state: "played", createdAt: now(), attempts: 1, bytesFrame: 40, bytesText: 22, transport: "bluetooth",
    });
  }

  async sendPresetAlert(o: { peerId?: string; presetId: number }): Promise<{ messageId: string }> {
    const peerId = o.peerId ?? "ravi";
    const message: Message = {
      messageId: uid("msg"), peerId, direction: "out", type: "phrase", priority: "alert", lang: "hi",
      text: "मदद चाहिए", words: null, phraseId: o.presetId, state: "queued", createdAt: now(), attempts: 0,
      bytesFrame: 31, bytesText: 3, transport: null,
    };
    this.push(message);
    setTimeout(() => this.update(message.messageId, { state: "acked", transport: "bluetooth" }), 700);
    return { messageId: message.messageId };
  }

  async sendSpokenAlert(_o: { peerId?: string }): Promise<{ utteranceId: string }> {
    void _o;
    const utteranceId = uid("utt");
    this.emit("readback", {
      utteranceId, lang: "hi",
      words: [
        { text: "दो", conf: 0.62, low: true, critical: true },
        { text: "लोग", conf: 0.9, low: false, critical: false },
        { text: "घायल", conf: 0.55, low: true, critical: true },
        { text: "हैं", conf: 0.93, low: false, critical: false },
      ],
      text: "दो लोग घायल हैं", mustConfirm: true, voiceWarning: null,
    });
    return { utteranceId };
  }

  async acknowledgeAlert(o: { messageId: string }): Promise<void> {
    this.update(o.messageId, { state: "played" });
    const alert: AlertEvent = { messageId: o.messageId, peerId: "ravi", peerName: "Ravi", lang: "hi", text: "मदद चाहिए", acked: true, audible: false };
    this.emit("alert", alert);
  }

  simulateIncomingAlert(): void {
    const message: Message = {
      messageId: uid("msg"), peerId: "ravi", direction: "in", type: "phrase", priority: "alert", lang: "hi",
      text: "मदद चाहिए", words: null, phraseId: 1, state: "playing", createdAt: now(), attempts: 1, bytesFrame: 31, bytesText: null, transport: "bluetooth",
    };
    this.push(message);
    this.emit("alert", { messageId: message.messageId, peerId: "ravi", peerName: "Ravi", lang: "hi", text: "मदद चाहिए", acked: false, audible: true });
  }

  async listMessages(o: { peerId: string; limit: number }): Promise<{ messages: Message[] }> {
    return { messages: this.messages.filter((m) => m.peerId === o.peerId).slice(0, o.limit) };
  }

  async listPacks(): Promise<{ packs: PackInfo[] }> {
    return { packs: PACKS.map((p) => ({ ...p })) };
  }

  async installPackFromFile(_o: { uri: string }): Promise<void> {
    void _o;
  }

  async setActiveLanguage(o: { lang: string }): Promise<void> {
    this.state = { ...this.state, activeLang: o.lang };
    this.emit("engineState", this.state);
  }

  async setEmulator(o: { config: EmulatorConfig | null }): Promise<void> {
    this.state = { ...this.state, emulatorActive: o.config !== null, emulatorPreset: o.config?.preset ?? null };
    this.emit("engineState", this.state);
  }

  async runSelfTest(o: { lang: string }): Promise<SelfTestResult> {
    const pack = PACKS.find((p) => p.lang === o.lang);
    const text = pack?.selfTest?.text ?? "";
    return { lang: o.lang, expectedText: text, transcribedText: text, wer: pack?.selfTest?.measuredWer ?? 0, passed: true, rtf: 0.4, firstAudioMs: 180 };
  }

  async exportMetrics(): Promise<{ uri: string }> {
    return { uri: "file:///data/data/dev.itantra.app/files/metrics.csv" };
  }
}
