/**
 * CapacitorBridge: forwards the ITantra contract to the Kotlin plugin registered under the same
 * name. Only constructed when `Capacitor.isNativePlatform()` is true; the web build uses MockBridge.
 */

import { registerPlugin } from "@capacitor/core";

import type { ITantraPlugin } from "./types";

const native = registerPlugin<Record<string, never>>("ITantra") as unknown as ITantraPlugin;

export class CapacitorBridge implements ITantraPlugin {
  start: ITantraPlugin["start"] = (o) => native.start(o);
  stop: ITantraPlugin["stop"] = () => native.stop();
  getState: ITantraPlugin["getState"] = () => native.getState();
  checkPermissions: ITantraPlugin["checkPermissions"] = () => native.checkPermissions();
  requestPermissions: ITantraPlugin["requestPermissions"] = (o) => native.requestPermissions(o);

  startDiscovery: ITantraPlugin["startDiscovery"] = (o) => native.startDiscovery(o);
  stopDiscovery: ITantraPlugin["stopDiscovery"] = () => native.stopDiscovery();
  listPeers: ITantraPlugin["listPeers"] = () => native.listPeers();
  beginPairing: ITantraPlugin["beginPairing"] = (o) => native.beginPairing(o);
  confirmPairing: ITantraPlugin["confirmPairing"] = (o) => native.confirmPairing(o);
  connect: ITantraPlugin["connect"] = (o) => native.connect(o);
  disconnect: ITantraPlugin["disconnect"] = (o) => native.disconnect(o);

  beginTalk: ITantraPlugin["beginTalk"] = (o) => native.beginTalk(o);
  endTalk: ITantraPlugin["endTalk"] = (o) => native.endTalk(o);
  acceptReadback: ITantraPlugin["acceptReadback"] = (o) => native.acceptReadback(o);
  redoUtterance: ITantraPlugin["redoUtterance"] = (o) => native.redoUtterance(o);
  sendPresetAlert: ITantraPlugin["sendPresetAlert"] = (o) => native.sendPresetAlert(o);
  sendSpokenAlert: ITantraPlugin["sendSpokenAlert"] = (o) => native.sendSpokenAlert(o);
  acknowledgeAlert: ITantraPlugin["acknowledgeAlert"] = (o) => native.acknowledgeAlert(o);

  listMessages: ITantraPlugin["listMessages"] = (o) => native.listMessages(o);
  cancelMessage: ITantraPlugin["cancelMessage"] = (o) => native.cancelMessage(o);

  listPacks: ITantraPlugin["listPacks"] = () => native.listPacks();
  installPackFromFile: ITantraPlugin["installPackFromFile"] = (o) => native.installPackFromFile(o);
  removePack: ITantraPlugin["removePack"] = (o) => native.removePack(o);
  setActiveLanguage: ITantraPlugin["setActiveLanguage"] = (o) => native.setActiveLanguage(o);

  setEmulator: ITantraPlugin["setEmulator"] = (o) => native.setEmulator(o);
  runSelfTest: ITantraPlugin["runSelfTest"] = (o) => native.runSelfTest(o);
  exportMetrics: ITantraPlugin["exportMetrics"] = () => native.exportMetrics();

  addListener: ITantraPlugin["addListener"] = (name, fn) => native.addListener(name, fn as never);
}
