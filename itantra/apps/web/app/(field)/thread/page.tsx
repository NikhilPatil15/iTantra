"use client";

import { useEffect, useMemo, useState } from "react";

import { MessageBubble, PacketStrip } from "@/components/field";
import { Card, ScreenHeader, Sheet } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { clockTime } from "@/lib/format";
import type { Message } from "@itantra/bridge";

export default function ThreadPage() {
  const activePeerId = useAppStore((s) => s.activePeerId);
  const peers = useAppStore((s) => s.peers);
  const messages = useAppStore((s) => s.messages);
  const [selected, setSelected] = useState<Message | null>(null);

  useEffect(() => {
    void useAppStore.getState().bootstrap();
    void useAppStore.getState().refreshMessages(activePeerId);
  }, [activePeerId]);

  const peer = peers.find((p) => p.peerId === activePeerId);
  const thread = useMemo(() => messages.filter((m) => m.peerId === activePeerId), [messages, activePeerId]);

  return (
    <div>
      <ScreenHeader title="Thread" subtitle={`${peer?.displayName ?? activePeerId} · ${thread.length} messages`} />
      {thread.length === 0 ? <p className="text-[15px] text-[var(--slate)]">No messages yet. Hold to talk on the Talk screen.</p> : null}
      <ul className="flex flex-col gap-3">
        {thread.map((message) => (
          <li key={message.messageId}>
            <MessageBubble message={message} onPress={() => setSelected(message)} />
          </li>
        ))}
      </ul>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title="Message details">
        {selected ? (
          <div className="flex flex-col gap-3">
            <Card className="p-3">
              <PacketStrip payloadBytes={selected.bytesFrame != null ? Math.max(0, selected.bytesFrame - 28) : 0} textBytes={selected.bytesText} />
            </Card>
            <dl className="grid grid-cols-2 gap-2 text-[14px]">
              <dt className="text-[var(--slate)]">State</dt>
              <dd className="font-semibold">{selected.state}</dd>
              <dt className="text-[var(--slate)]">Created</dt>
              <dd className="tnum">{clockTime(selected.createdAt)}</dd>
              <dt className="text-[var(--slate)]">Priority</dt>
              <dd className="font-semibold">{selected.priority}</dd>
              <dt className="text-[var(--slate)]">Attempts</dt>
              <dd className="tnum">{selected.attempts}</dd>
              <dt className="text-[var(--slate)]">Transport</dt>
              <dd className="font-semibold">{selected.transport ?? "—"}</dd>
            </dl>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
