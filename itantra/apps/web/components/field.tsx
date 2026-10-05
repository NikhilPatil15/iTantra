"use client";

import { useState } from "react";

import { useT } from "@/lib/i18n";
import { STATE_LABELS, bytes } from "@/lib/format";
import type { Message, Priority, ReadbackWord, TransportId } from "@itantra/bridge";
import { Chip } from "./ui";

const TRANSPORT_LABEL: Record<TransportId, string> = {
  bluetooth: "Bluetooth",
  wifiDirect: "Wi-Fi Direct",
  nearby: "Nearby",
  loraMeshtastic: "LoRa",
  loopback: "Loopback",
};

export function PttButton({
  state,
  level,
  onPressStart,
  onPressEnd,
  disabledReason,
}: {
  state: "idle" | "listening" | "processing";
  level: number;
  onPressStart: () => void;
  onPressEnd: () => void;
  disabledReason?: string;
}) {
  const t = useT();
  const [pressed, setPressed] = useState(false);
  const ring = 4 + Math.round(level * 10);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        aria-label={t("talk.holdToTalk")}
        disabled={Boolean(disabledReason) && state !== "listening"}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setPressed(true);
          onPressStart();
        }}
        onPointerUp={() => {
          setPressed(false);
          onPressEnd();
        }}
        onPointerCancel={() => {
          setPressed(false);
          onPressEnd();
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") onPressStart();
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") onPressEnd();
        }}
        className="relative flex h-28 w-28 items-center justify-center rounded-full border-[1.5px] text-center font-bold"
        style={{
          background: state === "listening" ? "var(--beacon)" : "var(--ultramarine)",
          color: "#fff",
          borderColor: pressed ? "var(--ink)" : "transparent",
          boxShadow: state === "listening" ? `0 0 0 ${ring}px var(--ultramarine-tint)` : "none",
        }}
      >
        <span className="px-2 text-[15px] leading-tight">
          {state === "listening" ? t("readback.listen") : state === "processing" ? t("readback.transcribe") : t("talk.holdToTalk")}
        </span>
      </button>
      {disabledReason ? <p className="max-w-[16rem] text-center text-[13px] text-[var(--slate)]">{disabledReason}</p> : null}
    </div>
  );
}

export function LinkChip({ transport, state, peerName, rttMs }: { transport: TransportId | null; state: string; peerName: string; rttMs: number | null }) {
  const connected = state === "connected";
  const label = transport ? `${TRANSPORT_LABEL[transport]} · ${state}` : state === "reconnecting" ? "Reconnecting" : "No link";
  return (
    <Chip tone={connected ? "lichen" : "neutral"}>
      <span aria-hidden>{connected ? "●" : "○"}</span>
      <span className="ml-1.5">
        {label} · {peerName}
        {rttMs !== null ? <span className="tnum"> · {Math.round(rttMs)} ms</span> : null}
      </span>
    </Chip>
  );
}

export function ReadbackLine({
  words,
  onEditWord,
  mustConfirm,
}: {
  words: ReadbackWord[];
  onEditWord: (index: number, text: string) => void;
  mustConfirm: boolean;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  return (
    <div>
      <p className="text-[30px] font-bold leading-[1.55]" aria-label="Recognised text">
        {words.map((word, i) => (
          <span key={`${word.text}-${i}`}>
            {word.low && word.critical ? <span title="Important word, low confidence">◆ </span> : null}
            <button
              type="button"
              className={`min-h-[44px] min-w-[44px] px-0.5 text-left ${word.low ? "wavy text-[var(--amber-ink)]" : ""}`}
              onClick={() => {
                setEditing(i);
                setDraft(word.text);
              }}
            >
              {word.text}
            </button>{" "}
          </span>
        ))}
      </p>
      {editing !== null ? (
        <div className="mt-2 flex gap-2">
          <input
            className="min-h-[48px] flex-1 rounded-xl border-[1.5px] border-[var(--rule)] bg-[var(--vellum)] px-3 text-[20px]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Edit word"
          />
          <button
            type="button"
            className="rounded-xl border-[1.5px] border-[var(--ultramarine)] px-4 font-semibold text-[var(--ultramarine)]"
            onClick={() => {
              onEditWord(editing, draft);
              setEditing(null);
            }}
          >
            Save
          </button>
        </div>
      ) : null}
      {mustConfirm ? <p className="mt-2 text-[14px] text-[var(--amber-ink)]">Check the underlined words before sending.</p> : null}
    </div>
  );
}

const PRIORITY_TONE: Record<Priority, "neutral" | "amber" | "beacon"> = { routine: "neutral", urgent: "amber", alert: "beacon" };

export function MessageBubble({ message, onPress }: { message: Message; onPress?: () => void }) {
  const out = message.direction === "out";
  const alert = message.priority === "alert";
  return (
    <button
      type="button"
      onClick={onPress}
      className={`w-full rounded-[16px] border-[1.5px] p-3 text-left ${alert ? "border-[var(--beacon)] bg-[var(--beacon-tint)]" : "border-[var(--rule)] bg-[var(--vellum)]"} ${out ? "ml-6" : "mr-6"}`}
    >
      <div className="mb-1 flex items-center gap-2">
        {alert ? <Chip tone="beacon">Alert</Chip> : PRIORITY_TONE[message.priority] !== "neutral" ? <Chip tone={PRIORITY_TONE[message.priority]}>{message.priority}</Chip> : null}
        <span className="text-[12px] text-[var(--slate)]" lang={message.lang}>
          {message.lang}
        </span>
      </div>
      <p className="text-[19px]" lang={message.lang}>
        {message.text ?? (message.phraseId !== null ? `Preset alert #${message.phraseId}` : "—")}
      </p>
      <div className="mt-1 flex items-center justify-between text-[13px] text-[var(--slate)]">
        <span>{STATE_LABELS[message.state] ?? message.state}</span>
        <span className="tnum">
          {out ? "to " : "from "}
          {message.peerId}
          {message.attempts > 1 ? ` · ${message.attempts} attempts` : ""}
        </span>
      </div>
    </button>
  );
}

export function PacketStrip({ headerBytes = 12, payloadBytes, tagBytes = 16, textBytes }: { headerBytes?: number; payloadBytes: number; tagBytes?: number; textBytes?: number | null }) {
  const total = headerBytes + payloadBytes + tagBytes;
  const segments = [
    { label: "header", bytes: headerBytes, color: "var(--slate)" },
    { label: "payload", bytes: payloadBytes, color: "var(--ultramarine)" },
    { label: "tag", bytes: tagBytes, color: "var(--lichen)" },
  ];
  return (
    <div>
      <div className="flex h-6 w-full overflow-hidden rounded-md border-[1.5px] border-[var(--rule)]" role="img" aria-label={`Frame of ${total} bytes`}>
        {segments.map((s) => (
          <div key={s.label} title={`${s.label}: ${s.bytes} B`} style={{ width: `${(s.bytes / total) * 100}%`, background: s.color }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-[var(--slate)]">
        <span>header {headerBytes} B</span>
        <span>payload {payloadBytes} B</span>
        <span>tag {tagBytes} B</span>
        <span className="font-semibold text-[var(--ink)]">frame {total} B</span>
        {textBytes != null ? <span>text {bytes(textBytes)}</span> : null}
      </div>
    </div>
  );
}
