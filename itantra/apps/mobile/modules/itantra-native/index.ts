import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * The `ITantraNative` Expo module. This is the React Native equivalent of the Capacitor plugin:
 * a thin bridge that forwards the ITantra contract to the shared Kotlin engine. It returns null
 * on platforms without the native module (e.g. Expo web) so imports never crash.
 */
export interface DeviceInfo {
  manufacturer: string;
  model: string;
  android: string;
  abi: string;
}

export interface RoundTrip {
  bytes: number;
  decoded: string;
  matches: boolean;
}

export interface FrameInfo {
  headerBytes: number;
  payloadBytes: number;
  tagBytes: number;
  frameBytes: number;
  textBytes: number;
  hex: string;
}

export interface OutboxDemo {
  firstOrder: string[];
  afterTtl: string[];
}

export interface SessionDemo {
  frameBytes: number;
  decoded: string;
  duplicateRejected: boolean;
  ackBytes: number;
  outcome: string;
}

export interface EngineDemo {
  readback: string;
  lowWords: string[];
  mustConfirm: boolean;
  criticalLow: boolean;
  delivered: string;
  frameBytes: number;
  state: string;
  metricsRows: number;
}

export interface EngineWord {
  text: string;
  conf: number;
  low: boolean;
  critical: boolean;
}

export interface EngineReadbackPayload {
  utteranceId: string;
  lang: string;
  text: string;
  words: EngineWord[];
  mustConfirm: boolean;
  voiceWarning: string | null;
}

export interface EngineMessagePayload {
  messageId: string;
  peerId: string;
  direction: string;
  type: string;
  priority: string;
  lang: string;
  text: string | null;
  words: null;
  phraseId: number | null;
  state: string;
  createdAt: number;
  attempts: number;
  bytesFrame: number | null;
  bytesText: number | null;
  transport: string | null;
}

export interface EngineStatePayload {
  running: boolean;
  deviceName: string;
  activeLang: string;
  transports: string[];
  emulatorActive: boolean;
  emulatorPreset: string | null;
  foreground: boolean;
}

export interface NativeSubscription {
  remove(): void;
}

export interface ITantraNativeModule {
  hello(): string;
  deviceInfo(): DeviceInfo;
  scriptRoundTrip(lang: string, text: string): RoundTrip;
  frameInfo(lang: string, text: string): FrameInfo;
  vadDemo(): string[];
  metricsCsv(): string;
  outboxDemo(): OutboxDemo;
  sessionDemo(lang: string, text: string): SessionDemo;
  engineDemo(lang: string, text: string): EngineDemo;

  // Engine-backed field flow
  engineReady(): boolean;
  startEngine(name: string): EngineStatePayload;
  getEngineState(): EngineStatePayload;
  beginTalk(lang: string): EngineReadbackPayload;
  acceptReadback(edited: string): EngineMessagePayload;
  sendPresetAlert(presetId: number): EngineMessagePayload;
  acknowledgeAlert(messageId: string): boolean;
  listEngineMessages(): EngineMessagePayload[];
  pairedBluetoothDevices(): { name: string; address: string }[];

  // Real Bluetooth transport wired to a LinkedEngine
  startBluetoothServer(): boolean;
  connectBluetooth(address: string): boolean;
  sendBluetooth(text: string, lang: string): number;
  bluetoothLinkActive(): boolean;
  stopBluetooth(): boolean;

  // Real Wi-Fi Direct transport
  startWifiDirectServer(): boolean;
  connectWifiDirect(address: string): boolean;
  stopWifiDirect(): boolean;
  addListener?(name: string, fn: (event: unknown) => void): NativeSubscription;
}

export default requireOptionalNativeModule<ITantraNativeModule>("ITantraNative");
