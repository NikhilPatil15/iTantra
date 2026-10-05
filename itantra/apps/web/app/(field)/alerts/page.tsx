"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Card, ScreenHeader } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

const PRESETS = [
  { id: 1, text: "मदद चाहिए", en: "Need help" },
  { id: 2, text: "घायल हैं", en: "People injured" },
  { id: 3, text: "पानी चाहिए", en: "Need water" },
  { id: 4, text: "नाव चाहिए", en: "Need a boat" },
  { id: 5, text: "आग लगी है", en: "Fire" },
  { id: 6, text: "रास्ता बंद है", en: "Road blocked" },
  { id: 7, text: "सब सुरक्षित हैं", en: "All safe" },
  { id: 8, text: "स्थान भेजा", en: "Location shared" },
];

export default function AlertsPage() {
  const t = useT();
  const sendPresetAlert = useAppStore((s) => s.sendPresetAlert);
  const sendSpokenAlert = useAppStore((s) => s.sendSpokenAlert);
  const simulateIncomingAlert = useAppStore((s) => s.simulateIncomingAlert);
  const alert = useAppStore((s) => s.alert);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sosSent, setSosSent] = useState(false);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
    };
  }, []);

  const startHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    const started = Date.now();
    holdTimer.current = setInterval(() => {
      const progress = Math.min(1, (Date.now() - started) / 1500);
      setHoldProgress(progress);
      if (progress >= 1) {
        if (holdTimer.current) clearInterval(holdTimer.current);
        setSosSent(true);
        void sendPresetAlert(1);
      }
    }, 50);
  };

  const endHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  };

  return (
    <div>
      <ScreenHeader title="Alerts" subtitle="Alerts jump the queue and play until acknowledged" />

      <Card className="p-4">
        <h2 className="text-[17px] font-bold">Hold for SOS</h2>
        <p className="text-[13px] text-[var(--slate)]">Press and hold for 1.5 seconds.</p>
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          aria-label="Hold for SOS"
          className="relative mt-3 flex h-32 w-full items-center justify-center overflow-hidden rounded-[20px] border-[1.5px] border-[var(--beacon)] bg-[var(--beacon-tint)] text-[28px] font-bold text-[var(--beacon)]"
        >
          <span className="absolute inset-y-0 left-0 bg-[var(--beacon)] opacity-25" style={{ width: `${holdProgress * 100}%` }} />
          <span className="relative">{sosSent ? "SOS sent" : t("alert.sos")}</span>
        </button>
        <Button
          className="mt-2 w-full"
          onClick={() => {
            setSosSent(false);
          }}
        >
          Reset
        </Button>
      </Card>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">{t("alert.preset")}</h2>
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map((preset) => (
          <Button key={preset.id} variant="ghost" className="flex-col items-start py-3" onClick={() => void sendPresetAlert(preset.id)}>
            <span lang="hi" className="text-[19px] font-bold">
              {preset.text}
            </span>
            <span className="text-[12px] font-normal text-[var(--slate)]">{preset.en}</span>
          </Button>
        ))}
      </div>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Spoken alert</h2>
      <Button variant="primary" className="w-full" onClick={() => void sendSpokenAlert()}>
        {t("alert.spoken")}
      </Button>

      <h2 className="mt-5 mb-2 text-[17px] font-bold">Demo tools</h2>
      <Button variant="danger" className="w-full" onClick={() => simulateIncomingAlert()}>
        Simulate an incoming alert
      </Button>
      {alert ? <p className="mt-2 text-[13px] text-[var(--beacon)]">An alert is currently ringing.</p> : null}
    </div>
  );
}
