"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "ghost",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" | "ghost"; children: ReactNode }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl border px-4 font-semibold transition-colors min-h-[48px] disabled:opacity-40 disabled:cursor-not-allowed";
  const styles = {
    primary: "border-transparent bg-[var(--ultramarine)] text-white hover:opacity-90",
    danger: "border-transparent bg-[var(--beacon)] text-white hover:opacity-90",
    ghost: "border-[var(--rule)] bg-[var(--vellum)] text-[var(--ink)] hover:bg-[var(--ultramarine-tint)]",
  }[variant];
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[20px] border-[1.5px] border-[var(--rule)] bg-[var(--vellum)] ${className}`}>{children}</div>;
}

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "lichen" | "amber" | "beacon" | "ultramarine";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    neutral: "border-[var(--rule)] text-[var(--slate)]",
    lichen: "border-[var(--lichen)] text-[var(--lichen)]",
    amber: "border-[var(--amber)] text-[var(--amber-ink)]",
    beacon: "border-[var(--beacon)] text-[var(--beacon)]",
    ultramarine: "border-[var(--ultramarine)] text-[var(--ultramarine)]",
  };
  return <span className={`inline-flex items-center rounded-full border-[1.5px] px-2.5 py-0.5 text-[13px] font-semibold ${styles[tone]}`}>{children}</span>;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: "var(--scrim)" }} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-t-[20px] border-t-[1.5px] border-[var(--rule)] bg-[var(--vellum)] p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[20px] font-bold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full border-[1.5px] border-[var(--rule)] transition-colors ${checked ? "bg-[var(--ultramarine)]" : "bg-[var(--chalk)]"}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-[var(--vellum)] transition-all ${checked ? "left-7" : "left-0.5"}`} />
    </button>
  );
}

export function StatTile({ label, value, unit, source, n }: { label: string; value: string; unit?: string; source: string; n?: number }) {
  return (
    <Card className="p-3">
      <div className="text-[13px] text-[var(--slate)]">{label}</div>
      <div className="tnum text-[26px] font-bold">
        {value}
        {unit ? <span className="ml-1 text-[15px] font-normal text-[var(--slate)]">{unit}</span> : null}
      </div>
      <div className="mt-1 text-[12px] text-[var(--slate)]">
        source: {source}
        {n !== undefined ? ` · n=${n}` : ""}
      </div>
    </Card>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-[26px] font-bold leading-tight">{title}</h1>
        {subtitle ? <p className="text-[15px] text-[var(--slate)]">{subtitle}</p> : null}
      </div>
      {right}
    </header>
  );
}

export function Ribbon({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "ultramarine" }) {
  const styles = tone === "amber" ? "bg-[var(--amber)] text-[#3a2600]" : "bg-[var(--ultramarine)] text-white";
  return <div className={`px-4 py-1.5 text-center text-[13px] font-semibold ${styles}`}>{children}</div>;
}
