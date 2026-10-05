/**
 * MockBridge: a scripted, seeded implementation of ITantraPlugin for the browser and the lab.
 * It lets the entire field UI be built, walked and screenshot-tested with no device. All data is
 * fabricated and every screen that shows it must label it `sample data` (plan Section 11).
 */

import { parseEvent, type EventName } from "./schemas";
import type {
  AlertEvent,
  EmulatorConfig,
  EngineState,
  ITantraEvents,
  ITantraPlugin,
  LinkEvent,
  Message,
  PackInfo,
  Peer,
  PermissionGroup,
  PermissionState,
  PluginListenerHandle,
  ReadbackEvent,
  ReadbackWord,
  SelfTestResult,
  TransportId,
  UtteranceEvent,
} from "./types";

type Listener<K extends EventName> = (event: ITantraEvents[K]) => void;

const SCRIPTED_WORDS: { text: string; conf: number; critical?: boolean }[] = [
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

const now = () => Date.now();
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const PACKS: PackInfo[] = [
  { packId: "hi", lang: "hi", displayName: "हिन्दी", version: 1, status: "experimental", licenseClass: "permissive", sizeBytes: 142_000_000, installed: true, selfTest: { text: "नदी का पानी बढ़ रहा है", maxWer: 0.25, measuredWer: 0.18 } },
  { packId: "en", lang: "en", displayName: "English", version: 1, status: "experimental", licenseClass: "permissive", sizeBytes: 137_000_000, installed: true, selfTest: { text: "The river is rising", maxWer: 0.2, measuredWer: 0.12 } },
  { packId: "ta", lang: "ta", displayName: "தமிழ்", version: 1, status: "not-installed", licenseClass: "non-commercial", sizeBytes: 151_000_000, installed: false, selfTest: null },
  { packId: "bn", lang: "bn", displayName: "বাংলা", version: 1, status: "not-installed", licenseClass: "permissive", sizeBytes: 149_000_000, installed: false, selfTest: null },
  { packId: "te", lang: "te", displayName: "తెలుగు", version: 1, status: "not-installed", licenseClass: "permissive", sizeBytes: 148_000_000, installed: false, selfTest: null },
  { packId: "mr", lang: "mr", displayName: "मराठी", version: 1, status: "not-installed", licenseClass: "permissive", sizeBytes: 141_000_000, installed: false, selfTest: null },
];

export class MockBridge implements ITantraPlugin {
  private readonly listeners: { [K in EventName]?: Set<Listener<K>> } = {};
  private peers: Peer[] = [
    { peerId: "ravi", displayName: "Ravi", senderId: 2, transport: null, state: "disconnected", rttMs: null, paired: false, lastSeenAt: null },
    { peerId: "meena", displayName: "Meena", senderId: 3, transport: null, state: "disconnected", rttMs: null, paired: false, lastSeenAt: null },
    { peerId: "unknown-1", displayName: "Unpaired phone", senderId: 0, transport: null, state: "disconnected", rttMs: null, paired: false, lastSeenAt: null },
  ];
  private messages: Message[] = [];
  private sessions = new Map<string, { peerId: string; lang: string; text: string; words: ReadbackWord[]; mustConfirm: boolean }>();
  private emulator: EmulatorConfig | null = null;
  private permissions: PermissionState = {
    groups: [
      { name: "microphone", granted: false },
      { name: "bluetooth", granted: false },
      { name: "nearbyWifi", granted: false },
      { name: "notifications", granted: false },
      { name: "dndAccess", granted: false },
    ],
    allGranted: false,
  };
  private state: EngineState = {
    running: false,
    deviceName: "Field phone A",
    activeLang: "hi",
    transports: ["bluetooth", "wifiDirect"],
    emulatorActive: false,
    emulatorPreset: null,
    foreground: false,
  };

  private on<K extends EventName>(name: K, fn: Listener<K>): PluginListenerHandle {
    let set = this.listeners[name] as Set<Listener<K>> | undefined;
    if (!set) {
      set = new Set();
      (this.listeners as Record<string, Set<Listener<K>>>)[name] = set;
    }
    set.add(fn);
    return {
      remove: () => {
        set!.delete(fn);
      },
    };
  }

  private emit<K extends EventName>(name: K, event: ITantraEvents[K]): void {
    const validated = parseEvent(name, event) as ITantraEvents[K];
    const set = this.listeners[name] as Set<Listener<K>> | undefined;
    const listeners = set ? [...set] : [];
    for (const fn of listeners) fn(validated);
  }

  private setPeer(peerId: string, patch: Partial<Peer>): void {
    this.peers = this.peers.map((p) => (p.peerId === peerId ? { ...p, ...patch } : p));
    this.emit("peers", { peers: this.peers });
  }

  private link(peerId: string, transport: TransportId, state: LinkEvent["state"], rttMs: number | null): void {
    this.setPeer(peerId, { transport: state === "connected" ? transport : null, state, rttMs });
    this.emit("link", { peerId, transport, state, rttMs, bytesTx: Math.round(Math.random() * 400), bytesRx: Math.round(Math.random() * 400) });
  }

  async start(o: { deviceName: string }): Promise<void> {
    this.state = { ...this.state, running: true, deviceName: o.deviceName, foreground: true };
    this.emit("engineState", this.state);
  }

  async stop(): Promise<void> {
    this.state = { ...this.state, running: false, foreground: false };
    this.emit("engineState", this.state);
  }

  async getState(): Promise<EngineState> {
    return this.state;
  }

  async checkPermissions(): Promise<PermissionState> {
    return this.permissions;
  }

  async requestPermissions(o: { groups: PermissionGroup["name"][] }): Promise<PermissionState> {
    this.permissions = {
      groups: this.permissions.groups.map((g) => (o.groups.includes(g.name) ? { ...g, granted: true } : g)),
      allGranted: false,
    };
    this.permissions.allGranted = this.permissions.groups.every((g) => g.name === "dndAccess" || g.granted);
    return this.permissions;
  }

  async startDiscovery(o: { transports: TransportId[] }): Promise<void> {
    this.state = { ...this.state, transports: o.transports };
    this.emit("engineState", this.state);
    for (const id of ["ravi", "meena", "unknown-1"]) {
      setTimeout(() => this.link(id, o.transports[0] ?? "bluetooth", "disconnected", null), 200);
    }
  }

  async stopDiscovery(): Promise<void> {}

  async listPeers(): Promise<{ peers: Peer[] }> {
    return { peers: this.peers };
  }

  async beginPairing(o: { peerRef: string; method: "sas" | "qr" }): Promise<{ sessionId: string; sas?: string }> {
    void o.peerRef;
    return { sessionId: uid("pair"), sas: o.method === "sas" ? "417 902" : undefined };
  }

  async confirmPairing(o: { sessionId: string; accepted: boolean }): Promise<void> {
    if (!o.accepted) return;
    const peer = this.peers.find((p) => !p.paired && p.peerId !== "unknown-1");
    if (peer) this.setPeer(peer.peerId, { paired: true });
  }

  async connect(o: { peerId: string; prefer?: TransportId }): Promise<void> {
    const transport = o.prefer ?? "bluetooth";
    this.link(o.peerId, transport, "connecting", null);
    setTimeout(() => this.link(o.peerId, transport, "connected", 42), 600);
  }

  async disconnect(o: { peerId: string }): Promise<void> {
    this.link(o.peerId, this.peers.find((p) => p.peerId === o.peerId)?.transport ?? "bluetooth", "disconnected", null);
  }

  async beginTalk(o: { peerId: string; mode: "ptt" | "handsfree"; confirmBeforeSend: boolean; lang: string }): Promise<{ utteranceId: string }> {
    const utteranceId = uid("utt");
    const words: ReadbackWord[] = SCRIPTED_WORDS.map((w) => ({
      text: w.text,
      conf: w.conf,
      low: w.conf < 0.6,
      critical: w.critical ?? false,
    }));
    this.sessions.set(utteranceId, {
      peerId: o.peerId,
      lang: o.lang,
      text: words.map((w) => w.text).join(" "),
      words,
      mustConfirm: o.confirmBeforeSend || words.some((w) => w.low && w.critical),
    });
    this.emit("utterance", { utteranceId, state: "listening", level: 0 });
    setTimeout(() => this.emit("utterance", { utteranceId, state: "transcribing" }), 900);
    setTimeout(() => {
      const session = this.sessions.get(utteranceId);
      if (!session) return;
      const event: ReadbackEvent = {
        utteranceId,
        lang: session.lang,
        words: session.words,
        text: session.text,
        mustConfirm: session.mustConfirm,
        voiceWarning: session.lang === "ta" ? "The Tamil voice is not installed." : null,
      };
      this.emit("readback", event);
    }, 1700);
    return { utteranceId };
  }

  async endTalk(o: { utteranceId: string }): Promise<void> {
    void o;
  }

  async acceptReadback(o: { utteranceId: string; editedText?: string }): Promise<{ messageId: string }> {
    const session = this.sessions.get(o.utteranceId);
    if (!session) throw new Error("unknown utterance");
    const words = session.words;
    const text = o.editedText ?? session.text;
    const message: Message = {
      messageId: uid("msg"),
      peerId: session.peerId,
      direction: "out",
      type: "text",
      priority: "routine",
      lang: session.lang,
      text,
      words,
      phraseId: null,
      state: "queued",
      createdAt: now(),
      attempts: 0,
      bytesFrame: 42,
      bytesText: 24,
      transport: null,
    };
    this.push(message);
    setTimeout(() => this.update(message.messageId, { state: "sent", attempts: 1, transport: "bluetooth", bytesFrame: 42, bytesText: 24 }), 500);
    setTimeout(() => this.update(message.messageId, { state: "acked" }), 1200);
    setTimeout(() => this.incomingReply(session.peerId), 2200);
    return { messageId: message.messageId };
  }

  async redoUtterance(o: { utteranceId: string }): Promise<void> {
    this.emit("utterance", { utteranceId: o.utteranceId, state: "listening" });
  }

  private incomingReply(peerId: string): void {
    const reply: Message = {
      messageId: uid("msg"),
      peerId,
      direction: "in",
      type: "text",
      priority: "routine",
      lang: "hi",
      text: "ठीक है, नाव भेज रहे हैं।",
      words: [
        { text: "ठीक", conf: 0.96, low: false, critical: false },
        { text: "है", conf: 0.94, low: false, critical: false },
        { text: "नाव", conf: 0.58, low: true, critical: false },
        { text: "भेज", conf: 0.91, low: false, critical: false },
        { text: "रहे", conf: 0.89, low: false, critical: false },
        { text: "हैं", conf: 0.93, low: false, critical: false },
      ],
      phraseId: null,
      state: "played",
      createdAt: now(),
      attempts: 1,
      bytesFrame: 40,
      bytesText: 22,
      transport: "bluetooth",
    };
    this.push(reply);
  }

  async sendPresetAlert(o: { peerId?: string; presetId: number }): Promise<{ messageId: string }> {
    const peerId = o.peerId ?? this.peers.find((p) => p.paired)?.peerId ?? "ravi";
    const message: Message = {
      messageId: uid("msg"),
      peerId,
      direction: "out",
      type: "phrase",
      priority: "alert",
      lang: "hi",
      text: "मदद चाहिए",
      words: null,
      phraseId: o.presetId,
      state: "queued",
      createdAt: now(),
      attempts: 0,
      bytesFrame: 31,
      bytesText: 3,
      transport: null,
    };
    this.push(message);
    setTimeout(() => this.update(message.messageId, { state: "acked", transport: "bluetooth" }), 800);
    return { messageId: message.messageId };
  }

  async sendSpokenAlert(o: { peerId?: string }): Promise<{ utteranceId: string }> {
    const utteranceId = uid("utt");
    this.emit("utterance", { utteranceId, state: "listening" });
    this.emit("readback", {
      utteranceId,
      lang: "hi",
      words: [
        { text: "दो", conf: 0.62, low: true, critical: true },
        { text: "लोग", conf: 0.9, low: false, critical: false },
        { text: "घायल", conf: 0.55, low: true, critical: true },
        { text: "हैं", conf: 0.93, low: false, critical: false },
      ],
      text: "दो लोग घायल हैं",
      mustConfirm: true,
      voiceWarning: null,
    });
    return { utteranceId };
  }

  async acknowledgeAlert(o: { messageId: string }): Promise<void> {
    this.update(o.messageId, { state: "played" });
    const alert: AlertEvent = {
      messageId: o.messageId,
      peerId: "ravi",
      peerName: "Ravi",
      lang: "hi",
      text: "मदद चाहिए",
      acked: true,
      audible: false,
    };
    this.emit("alert", alert);
  }

  /** Trigger an incoming alert; used by the demo, not part of the plugin contract. */
  simulateIncomingAlert(): void {
    const message: Message = {
      messageId: uid("msg"),
      peerId: "ravi",
      direction: "in",
      type: "phrase",
      priority: "alert",
      lang: "hi",
      text: "मदद चाहिए",
      words: null,
      phraseId: 1,
      state: "playing",
      createdAt: now(),
      attempts: 1,
      bytesFrame: 31,
      bytesText: null,
      transport: "bluetooth",
    };
    this.push(message);
    this.emit("alert", { messageId: message.messageId, peerId: "ravi", peerName: "Ravi", lang: "hi", text: "मदद चाहिए", acked: false, audible: true });
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

  async listMessages(o: { peerId: string; beforeMillis?: number; limit: number }): Promise<{ messages: Message[] }> {
    const filtered = this.messages.filter((m) => m.peerId === o.peerId && (!o.beforeMillis || m.createdAt < o.beforeMillis));
    return { messages: filtered.slice(0, o.limit) };
  }

  async cancelMessage(o: { messageId: string }): Promise<void> {
    this.update(o.messageId, { state: "cancelled" });
  }

  async listPacks(): Promise<{ packs: PackInfo[] }> {
    return { packs: PACKS.map((p) => ({ ...p })) };
  }

  async installPackFromFile(o: { uri: string }): Promise<void> {
    const packId = o.uri.split("/").pop()?.split(".")[0] ?? "pack";
    const totalBytes = 150_000_000;
    for (let step = 1; step <= 5; step++) {
      await new Promise((r) => setTimeout(r, 250));
      this.emit("packProgress", { packId, direction: "install", receivedBytes: Math.round((totalBytes * step) / 5), totalBytes, state: step === 5 ? "done" : "running" });
    }
  }

  async removePack(o: { packId: string }): Promise<void> {
    void o;
  }

  async setActiveLanguage(o: { lang: string }): Promise<void> {
    this.state = { ...this.state, activeLang: o.lang };
    this.emit("engineState", this.state);
  }

  async setEmulator(o: { config: EmulatorConfig | null }): Promise<void> {
    this.emulator = o.config;
    this.state = { ...this.state, emulatorActive: o.config !== null, emulatorPreset: o.config?.preset ?? null };
    this.emit("engineState", this.state);
  }

  async runSelfTest(o: { lang: string }): Promise<SelfTestResult> {
    const pack = PACKS.find((p) => p.lang === o.lang);
    const expected = pack?.selfTest?.text ?? "";
    return {
      lang: o.lang,
      expectedText: expected,
      transcribedText: expected,
      wer: pack?.selfTest?.measuredWer ?? 0,
      passed: (pack?.selfTest?.measuredWer ?? 1) <= (pack?.selfTest?.maxWer ?? 0.25),
      rtf: 0.4,
      firstAudioMs: 180,
    };
  }

  async exportMetrics(): Promise<{ uri: string }> {
    const header = "t_speech_end,t_asr_done,t_accept,t_link_write,t_link_recv,t_tts_first_audio,t_ack,bytes_frame,bytes_text,chars,words,lang,priority,attempts\n";
    const row = "0,1200,1800,1810,2100,2400,2600,42,24,20,4,hi,routine,1\n";
    return { uri: `data:text/csv;charset=utf-8,${encodeURIComponent(header + row)}` };
  }

  addListener<K extends EventName>(name: K, fn: Listener<K>): Promise<PluginListenerHandle> {
    return Promise.resolve(this.on(name, fn));
  }
}
