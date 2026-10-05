"use client";

import { useState } from "react";

import { LinkChip, MessageBubble, PacketStrip, PttButton, ReadbackLine } from "@/components/field";
import { PackCard } from "@/components/tools";
import { Button, Card, Chip, ScreenHeader, Sheet, StatTile, Toggle } from "@/components/ui";
import { ThemeControl } from "@/components/chrome";
import type { Message, PackInfo } from "@itantra/bridge";

const words = [
  { text: "नदी", conf: 0.97, low: false, critical: false },
  { text: "का", conf: 0.99, low: false, critical: false },
  { text: "पानी", conf: 0.42, low: true, critical: false },
  { text: "तेजी", conf: 0.88, low: false, critical: false },
  { text: "से", conf: 0.95, low: false, critical: false },
  { text: "बढ़", conf: 0.31, low: true, critical: false },
  { text: "रहा", conf: 0.9, low: false, critical: false },
  { text: "है", conf: 0.98, low: false, critical: false },
];

const message: Message = {
  messageId: "m1",
  peerId: "ravi",
  direction: "in",
  type: "text",
  priority: "routine",
  lang: "hi",
  text: "ठीक है, नाव भेज रहे हैं।",
  words,
  phraseId: null,
  state: "played",
  createdAt: Date.now(),
  attempts: 1,
  bytesFrame: 40,
  bytesText: 22,
  transport: "bluetooth",
};

const pack: PackInfo = {
  packId: "ta",
  lang: "ta",
  displayName: "தமிழ்",
  version: 1,
  status: "not-installed",
  licenseClass: "non-commercial",
  sizeBytes: 151_000_000,
  installed: false,
  selfTest: null,
};

export default function ComponentsPage() {
  const [toggle, setToggle] = useState(true);
  const [sheet, setSheet] = useState(false);
  return (
    <div className="mx-auto max-w-3xl p-4">
      <ScreenHeader
        title="Components"
        subtitle="Every component in both themes"
        right={<ThemeControl />}
      />

      <section className="mb-6">
        <h2 className="mb-2 text-[17px] font-bold">Buttons and chips</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary">Primary</Button>
          <Button>Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Chip tone="lichen">Delivered</Chip>
          <Chip tone="amber">Uncertain</Chip>
          <Chip tone="beacon">Alert</Chip>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[17px] font-bold">Talk controls</h2>
        <div className="flex flex-wrap items-center gap-6">
          <PttButton state="idle" level={0.4} onPressStart={() => {}} onPressEnd={() => {}} />
          <PttButton state="listening" level={0.8} onPressStart={() => {}} onPressEnd={() => {}} />
        </div>
        <div className="mt-3">
          <LinkChip transport="bluetooth" state="connected" peerName="Ravi" rttMs={42} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[17px] font-bold">Read-back and message</h2>
        <Card className="p-4">
          <ReadbackLine words={words} mustConfirm onEditWord={() => {}} />
        </Card>
        <div className="mt-3">
          <MessageBubble message={message} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[17px] font-bold">Packet strip and stats</h2>
        <Card className="p-4">
          <PacketStrip payloadBytes={14} textBytes={22} />
        </Card>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatTile label="Round trip" value="42" unit="ms" source="link events" n={20} />
          <StatTile label="Bytes per sentence" value="42" unit="B" source="results/size.csv" n={23} />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[17px] font-bold">Pack and sheet</h2>
        <PackCard pack={pack} onInstall={() => {}} onRemove={() => {}} onSelfTest={() => {}} />
        <div className="mt-3 flex items-center justify-between">
          <span>Toggle control</span>
          <Toggle checked={toggle} onChange={setToggle} label="Toggle control" />
        </div>
        <Button className="mt-3" onClick={() => setSheet(true)}>
          Open sheet
        </Button>
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Example sheet">
          <p className="text-[15px] text-[var(--slate)]">Sheets slide up from the bottom and trap focus.</p>
        </Sheet>
      </section>
    </div>
  );
}
