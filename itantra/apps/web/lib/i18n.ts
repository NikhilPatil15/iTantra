"use client";

import { useMemo } from "react";

/**
 * A small typed dictionary and hook (plan 16.10). English first; Hindi is a stretch goal.
 * No server-dependent i18n router.
 */

const en = {
  "app.name": "iTantra",
  "nav.talk": "Talk",
  "nav.thread": "Thread",
  "nav.alerts": "Alerts",
  "nav.link": "Link",
  "nav.packs": "Packs",
  "nav.settings": "Settings",
  "nav.setup": "Setup",
  "nav.peers": "Peers",
  "talk.holdToTalk": "Hold to talk",
  "talk.sending": "Sending…",
  "talk.noLink": "No link",
  "readback.title": "Check the read-back",
  "readback.hint": "Check the underlined words before sending.",
  "readback.send": "Send",
  "readback.sayAgain": "Say again",
  "readback.editWord": "Edit word",
  "readback.save": "Save word",
  "readback.listen": "Listening…",
  "readback.transcribe": "Recognising…",
  "peer.disconnected": "Disconnected",
  "peer.connecting": "Connecting…",
  "peer.connected": "Connected",
  "peer.reconnecting": "Reconnecting…",
  "peer.pair": "Pair",
  "peer.connect": "Connect",
  "peer.codesMatch": "Codes match",
  "peer.codesDiffer": "Codes differ",
  "peer.bothShow": "Both phones show the same code",
  "alert.iveSeenThis": "I've seen this",
  "alert.from": "Alert from",
  "alert.sos": "SOS",
  "alert.preset": "Preset alerts",
  "alert.spoken": "Spoken alert",
  "pack.verified": "Verified",
  "pack.experimental": "Experimental",
  "pack.notInstalled": "Not installed",
  "pack.installFromFile": "Install from file",
  "pack.getFromNearby": "Get from nearby phone",
  "pack.remove": "Remove",
  "pack.selfTest": "Run self-test",
  "pack.nonCommercial": "This voice is for non-commercial use only.",
  "link.emulatorOn": "Link emulator on",
  "link.drop": "Drop link for 10 seconds",
  "link.roundTrip": "Round trip",
  "link.estimated": "Estimated end to end",
  "setup.permissions": "Permissions",
  "setup.packs": "Language packs",
  "setup.deviceName": "Device name",
  "setup.continue": "Continue",
  "setup.finish": "Finish setup",
  "common.sampleData": "sample data",
  "common.source": "source",
  "common.n": "n",
  "common.waiting": "Waiting for link",
  "common.sent": "Sent",
  "common.delivered": "Delivered",
  "common.played": "Played",
  "common.expired": "Expired",
  "common.cancelled": "Cancelled",
  "common.shownOnly": "Shown only",
  "common.missingPrev": "Missing message before this",
  "common.cancel": "Cancel",
  "common.close": "Close",
} as const;

export type MessageKey = keyof typeof en;

const dictionaries: Record<string, Partial<Record<MessageKey, string>>> = { en };

export function translate(key: MessageKey, locale = "en"): string {
  return dictionaries[locale]?.[key] ?? en[key];
}

export function useT(locale = "en") {
  return useMemo(() => (key: MessageKey) => translate(key, locale), [locale]);
}
