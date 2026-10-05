"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Card, ScreenHeader } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

const GROUPS = [
  { name: "microphone", why: "To recognise what you say on the phone itself." },
  { name: "bluetooth", why: "To reach the other phone directly." },
  { name: "nearbyWifi", why: "To use Wi-Fi Direct when Bluetooth is slow." },
  { name: "notifications", why: "To keep the link running in the background." },
  { name: "dndAccess", why: "Optional: lets an alert override silent mode." },
] as const;

export default function SetupPage() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [deviceName, setDeviceName] = useState("Field phone A");
  const requestPermissions = useAppStore((s) => s.requestPermissions);
  const engine = useAppStore((s) => s.engine);
  const bridge = useAppStore((s) => s.bridge);
  const pushToast = useAppStore((s) => s.pushToast);
  const [granted, setGranted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void useAppStore.getState().bootstrap();
  }, []);

  return (
    <div>
      <ScreenHeader title="Setup" subtitle={`Step ${step + 1} of 3`} />
      {step === 0 ? (
        <Card className="p-4">
          <h2 className="text-[20px] font-bold">{t("setup.permissions")}</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {GROUPS.map((group) => (
              <li key={group.name} className="flex items-start justify-between gap-3 border-b-[1.5px] border-[var(--rule)] pb-2 last:border-0">
                <div>
                  <p className="font-semibold capitalize">{group.name}</p>
                  <p className="text-[13px] text-[var(--slate)]">{group.why}</p>
                </div>
                <span className={`text-[13px] font-semibold ${granted[group.name] ? "text-[var(--lichen)]" : "text-[var(--slate)]"}`}>
                  {granted[group.name] ? "granted" : "not granted"}
                </span>
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            className="mt-4 w-full"
            onClick={async () => {
              await requestPermissions(GROUPS.map((g) => g.name));
              const state = await bridge?.checkPermissions();
              setGranted(Object.fromEntries((state?.groups ?? []).map((g) => [g.name, g.granted])));
            }}
          >
            Grant permissions
          </Button>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card className="p-4">
          <h2 className="text-[20px] font-bold">{t("setup.packs")}</h2>
          <p className="mt-2 text-[15px] text-[var(--slate)]">
            Speech models live in language packs, so adding a language never needs an app update.
          </p>
          <Link href="/packs/" className="mt-4 inline-block font-semibold text-[var(--ultramarine)]">
            Open Packs →
          </Link>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="p-4">
          <h2 className="text-[20px] font-bold">{t("setup.deviceName")}</h2>
          <p className="mt-1 text-[13px] text-[var(--slate)]">The other phone sees this name while pairing.</p>
          <input
            className="mt-3 min-h-[48px] w-full rounded-xl border-[1.5px] border-[var(--rule)] bg-[var(--vellum)] px-3 text-[17px]"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            aria-label="Device name"
          />
          <Button
            variant="primary"
            className="mt-4 w-full"
            onClick={async () => {
              await bridge?.start({ deviceName });
              pushToast("Engine started");
            }}
          >
            Start the engine
          </Button>
          {engine?.running ? <p className="mt-2 text-[13px] text-[var(--lichen)]">Engine running as {engine.deviceName}.</p> : null}
        </Card>
      ) : null}

      <div className="mt-4 flex justify-between">
        <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep((s) => Math.min(2, s + 1))}>
            {t("setup.continue")}
          </Button>
        ) : (
          <Link href="/talk/">
            <Button variant="primary">{t("setup.finish")}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
