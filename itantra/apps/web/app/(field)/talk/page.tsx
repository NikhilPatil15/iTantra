"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { LinkChip, MessageBubble, PttButton, ReadbackLine } from "@/components/field";
import { Button, Card, ScreenHeader } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function TalkPage() {
  const t = useT();
  const [level, setLevel] = useState(0.4);
  const engine = useAppStore((s) => s.engine);
  const peers = useAppStore((s) => s.peers);
  const activePeerId = useAppStore((s) => s.activePeerId);
  const activeLang = useAppStore((s) => s.activeLang);
  const messages = useAppStore((s) => s.messages);
  const readback = useAppStore((s) => s.readback);
  const link = useAppStore((s) => s.link);
  const beginTalk = useAppStore((s) => s.beginTalk);
  const endTalk = useAppStore((s) => s.endTalk);
  const acceptReadback = useAppStore((s) => s.acceptReadback);
  const redoUtterance = useAppStore((s) => s.redoUtterance);
  const sendPresetAlert = useAppStore((s) => s.sendPresetAlert);
  const setActiveLang = useAppStore((s) => s.setActiveLang);
  const setActivePeer = useAppStore((s) => s.setActivePeer);
  const [editedWords, setEditedWords] = useState<string[] | null>(null);

  useEffect(() => {
    void useAppStore.getState().bootstrap();
    void useAppStore.getState().startDiscovery();
    void useAppStore.getState().refreshMessages(activePeerId);
  }, [activePeerId]);

  const peer = peers.find((p) => p.peerId === activePeerId);
  const lastIncoming = useMemo(() => messages.find((m) => m.peerId === activePeerId && m.direction === "in"), [messages, activePeerId]);
  const langs = (engine?.transports ? ["hi", "en", "ta", "bn", "te", "mr"] : ["hi", "en"]);

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader
        title="Talk"
        subtitle={peer ? peer.displayName : "No peer selected"}
        right={
          <Link href="/peers/" className="rounded-lg border-[1.5px] border-[var(--rule)] px-2 py-1 text-[12px] font-semibold text-[var(--slate)]">
            Peers
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinkChip transport={link?.transport ?? peer?.transport ?? null} state={peer?.state ?? "disconnected"} peerName={peer?.displayName ?? "—"} rttMs={link?.rttMs ?? peer?.rttMs ?? null} />
        <label className="flex items-center gap-2 text-[13px] text-[var(--slate)]">
          Language
          <select
            className="min-h-[40px] rounded-lg border-[1.5px] border-[var(--rule)] bg-[var(--vellum)] px-2 text-[15px]"
            value={activeLang}
            onChange={(e) => void setActiveLang(e.target.value)}
          >
            {langs.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
      </div>

      {lastIncoming ? <MessageBubble message={lastIncoming} /> : null}

      {readback ? (
        <Card className="p-4">
          <ReadbackLine
            words={readback.words.map((w, i) => (editedWords && editedWords[i] ? { ...w, text: editedWords[i]! } : w))}
            mustConfirm={readback.mustConfirm}
            onEditWord={(i, text) => {
              const next = readback.words.map((w, idx) => (idx === i ? text : w.text));
              setEditedWords(next);
            }}
          />
          {readback.voiceWarning ? <p className="mt-2 text-[14px] text-[var(--amber-ink)]">{readback.voiceWarning}</p> : null}
          <div className="mt-4 flex gap-3">
            <Button variant="primary" className="flex-1" onClick={() => void acceptReadback(editedWords ? editedWords.join(" ") : undefined)}>
              {t("readback.send")}
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setEditedWords(null);
                void redoUtterance();
              }}
            >
              {t("readback.sayAgain")}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <PttButton
            state="idle"
            level={level}
            onPressStart={() => {
              setLevel(0.6);
              void beginTalk();
            }}
            onPressEnd={() => {
              setLevel(0.4);
              void endTalk();
            }}
            disabledReason={peer?.state !== "connected" ? "Waiting for link. This message will send when the other phone is back in range." : undefined}
          />
          <input
            aria-label="Input level preview"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="w-40"
          />
        </div>
      )}

      <div className="mt-auto flex items-center justify-between">
        <Button variant="danger" className="min-w-[88px]" onClick={() => void sendPresetAlert(1)}>
          {t("alert.sos")}
        </Button>
        <select
          aria-label="Active peer"
          className="min-h-[44px] rounded-lg border-[1.5px] border-[var(--rule)] bg-[var(--vellum)] px-2 text-[14px]"
          value={activePeerId}
          onChange={(e) => setActivePeer(e.target.value)}
        >
          {peers.map((p) => (
            <option key={p.peerId} value={p.peerId}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
