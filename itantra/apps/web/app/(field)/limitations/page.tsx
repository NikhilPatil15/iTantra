import { Card, ScreenHeader } from "@/components/ui";

const LIMITS = [
  "Recognition errors happen. A language is marked verified only after a qualification run; the rest are experimental.",
  "Accuracy figures are not shown until a licensed corpus and real ASR output exist in results/wer.csv.",
  "The core has no translation. Each side reads and speaks its own language.",
  "Security covers pairing pinning, per-session keys and replay rejection. It is not externally audited and does not protect against a malicious paired peer.",
  "No range in metres is claimed. Bluetooth and Wi-Fi Direct range depends on the site and the phone.",
  "An alert can be blocked by a phone's Do Not Disturb policy. We ask for the required access in Setup and record per-phone results.",
  "Latency is reported as measured. There is no claim of real-time calling.",
  "Synthetic-noise results, when they exist, do not represent a real noisy environment.",
  "No real-disaster or field validation has been performed.",
];

export default function LimitationsPage() {
  return (
    <div>
      <ScreenHeader title="Known limitations" subtitle="What this build does not claim" />
      <Card className="p-4">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px]">
          {LIMITS.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
