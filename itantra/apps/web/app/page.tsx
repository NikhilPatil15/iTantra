import Link from "next/link";

import { BrandFooter, BrandNav, FeatureCard, Kicker, Pill, SectionHeading } from "@/components/brand";
import { PacketStrip } from "@/components/field";

const STEPS = [
  {
    icon: "🎙️",
    title: "Recognise on the phone",
    body: "The phone listens through voice activity detection and recognises speech with an on-device model. No audio ever leaves the handset and no internet is used.",
  },
  {
    icon: "🔒",
    title: "Seal into a tiny packet",
    body: "The recognised sentence becomes a script-aware byte string, gets a 12-byte header, and is sealed with authenticated encryption. Tens of bytes, not audio.",
  },
  {
    icon: "🔊",
    title: "Heard on the other phone",
    body: "The message travels over Bluetooth or Wi-Fi Direct, is verified and de-duplicated, then spoken aloud with an on-device voice.",
  },
];

const CONTRIBUTIONS = [
  {
    tag: "C1",
    title: "Indic-efficient wire format",
    body: "Script-aware coding turns Devanagari and other Indic text into roughly one byte per character, then a compact header and optional codebook keep alerts to a few bytes.",
    evidence: "Measured on the seed corpus: ~39 B per sentence vs 88 B UTF-8 (sample data, results/size.csv).",
    tone: "primary" as const,
  },
  {
    tag: "C2",
    title: "Uncertainty-aware speech path",
    body: "Per-word confidence drives a read-back with wavy underlines, a critical-token guard and an unclear-word cue at the receiver, so numbers and place names get checked.",
    evidence: "Confidence bitmap, critical lexicons and preset codebooks implemented; calibration on a licensed dev set is pending (Q8).",
    tone: "accent" as const,
  },
  {
    tag: "C3",
    title: "Reliable under a narrow, lossy link",
    body: "ACK, retry with backoff, TTL, priority, de-duplication and ordering live in an outbox that keeps working even when the other phone is away.",
    evidence: "Seeded link simulation: reliable delivery vs fire-and-forget across 0–30% loss (results/link.csv).",
    tone: "primary" as const,
  },
];

const LANGUAGES = [
  { lang: "hi", name: "Hindi", sample: "नदी का पानी" },
  { lang: "mr", name: "Marathi", sample: "नदीचे पाणी" },
  { lang: "bn", name: "Bengali", sample: "নদীর জল" },
  { lang: "gu", name: "Gujarati", sample: "નદીનું પાણી" },
  { lang: "or", name: "Odia", sample: "ନଦୀର ପାଣି" },
  { lang: "pa", name: "Punjabi", sample: "ਨਦੀ ਦਾ ਪਾਣੀ" },
  { lang: "ta", name: "Tamil", sample: "ஆற்று நீர்" },
  { lang: "te", name: "Telugu", sample: "నది నీరు" },
  { lang: "kn", name: "Kannada", sample: "ನದಿಯ ನೀರು" },
  { lang: "ml", name: "Malayalam", sample: "നദിയിലെ വെള്ളം" },
];

export default function Home() {
  return (
    <div className="brand-page min-h-dvh">
      <BrandNav />

      {/* Hero */}
      <section className="brand-grid-bg border-b brand-border">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <Kicker>no internet · no SIM · still heard</Kicker>
            <h1 className="brand-display mt-2 text-[clamp(2.1rem,5vw,3.4rem)] font-bold leading-[1.08]">
              Speak. Sealed into bytes. <span className="brand-gradient-text">Heard on the other phone.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed brand-muted">
              iTantra lets two Android phones talk to each other in ten Indian languages with no network at all. Speech is
              recognised on device, sent as a compact authenticated message over Bluetooth or Wi-Fi Direct, and spoken back
              by the receiving phone. Alerts jump the queue and play until acknowledged.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/talk/"
                className="rounded-full px-5 py-3 text-[15px] font-semibold active:translate-y-0.5"
                style={{ background: "hsl(var(--brand-primary))", color: "hsl(var(--brand-primary-fg))" }}
              >
                Try the interactive demo
              </Link>
              <Link
                href="/lab/size/"
                className="brand-card px-5 py-3 text-[15px] font-semibold hover:scale-[1.02]"
              >
                See the measurements
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="primary">≈ 39 B per sentence</Pill>
              <Pill tone="accent">10 scripts</Pill>
              <Pill>0 internet connections</Pill>
            </div>
          </div>

          <div className="brand-card p-6">
            <p className="text-[13px] font-semibold brand-muted">One message on the wire</p>
            <p lang="hi" className="mt-2 text-[26px] font-bold leading-[1.5]">
              नदी का पानी तेजी से बढ़ रहा है
            </p>
            <div className="mt-4">
              <PacketStrip payloadBytes={22} textBytes={56} />
            </div>
            <p className="mt-3 text-[13px] brand-muted">
              The same sentence as raw UTF-8 is 56 B; script-aware coding fits it in 22 B. Header and tag add 28 B.{" "}
              <span className="italic">sample data</span>.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading
          id="how"
          kicker="how it works"
          title="An instrument, not an app"
          sub="Every time-critical step runs in a native foreground service, so delivery does not depend on the screen being on."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <FeatureCard key={step.title} icon={step.icon} title={step.title}>
              {step.body}
            </FeatureCard>
          ))}
        </div>
      </section>

      {/* Contributions */}
      <section className="border-y brand-border" style={{ background: "hsl(var(--brand-muted))" }}>
        <div className="mx-auto max-w-6xl px-5 py-14">
          <SectionHeading
            id="contrib"
            kicker="what we can defend with numbers"
            title="Three contributions, measured not asserted"
            sub="Everything else — speech, Bluetooth, Wi-Fi Direct — is baseline that other teams already built."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CONTRIBUTIONS.map((item) => (
              <div key={item.tag} className="brand-card flex flex-col p-5">
                <Pill tone={item.tone}>{item.tag}</Pill>
                <h3 className="brand-display mt-3 text-[19px] font-bold">{item.title}</h3>
                <p className="mt-2 flex-1 text-[15px] brand-muted">{item.body}</p>
                <p className="mt-3 border-t brand-border pt-3 text-[13px]">{item.evidence}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <SectionHeading
          id="languages"
          kicker="ten languages, honest labels"
          title="Built for Indian scripts"
          sub="A language is marked verified only after it passes a qualification run. The rest are experimental and say so."
        />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {LANGUAGES.map((language) => (
            <div key={language.lang} className="brand-card p-3 text-center">
              <p lang={language.lang} className="text-[22px] leading-[1.7]">
                {language.sample}
              </p>
              <p className="mt-1 text-[13px] brand-muted">{language.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alert */}
      <section className="border-y brand-border">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-2">
          <div>
            <Kicker>emergency path</Kicker>
            <h2 className="brand-display mt-1 text-[clamp(1.6rem,3.5vw,2.4rem)] font-bold leading-tight">
              Alerts take the whole screen and play until someone answers
            </h2>
            <p className="mt-3 text-[17px] brand-muted">
              A preset SOS is a three-byte phrase that the receiver reads in its own language — no recognition step needed. Spoken
              alerts are checked for uncertain digits and names before they go. Volume is restored after acknowledgement, and we
              record per-phone results instead of claiming it works everywhere.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/alerts/"
                className="rounded-full px-5 py-3 text-[15px] font-semibold active:translate-y-0.5"
                style={{ background: "hsl(var(--brand-accent))", color: "hsl(var(--brand-accent-fg))" }}
              >
                Open the alert demo
              </Link>
              <Link href="/limitations/" className="brand-card px-5 py-3 text-[15px] font-semibold hover:scale-[1.02]">
                What we don&apos;t claim
              </Link>
            </div>
          </div>
          <div className="brand-card p-6" style={{ background: "hsl(var(--brand-accent) / 0.12)" }}>
            <p className="brand-hand text-[22px] text-[hsl(var(--brand-accent))]">alert from Ravi</p>
            <p lang="hi" className="mt-2 text-[30px] font-bold leading-[1.5]">
              मदद चाहिए
            </p>
            <p className="mt-2 text-[15px] brand-muted">Need help</p>
            <div
              className="mt-5 rounded-2xl px-5 py-4 text-center text-[18px] font-bold"
              style={{ background: "hsl(var(--brand-accent))", color: "hsl(var(--brand-accent-fg))" }}
            >
              I&apos;ve seen this
            </div>
          </div>
        </div>
      </section>

      {/* Status */}
      <section className="mx-auto max-w-3xl px-5 py-14 text-center">
        <SectionHeading
          kicker="built honestly"
          title="A working core, with the field parts clearly pending"
          sub="The protocol, the interface and the benchmarks are implemented and tested. On-device speech and the radio link need the target phones and the licensed models."
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Pill tone="primary">Protocol + golden vectors demo</Pill>
          <Pill tone="accent">Interface tested in a browser</Pill>
          <Pill>On-device speech pending</Pill>
          <Pill>No field validation claimed</Pill>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/setup/"
            className="rounded-full px-5 py-3 text-[15px] font-semibold active:translate-y-0.5"
            style={{ background: "hsl(var(--brand-primary))", color: "hsl(var(--brand-primary-fg))" }}
          >
            Walk the field flow
          </Link>
          <Link href="/dev/scripts/" className="brand-card px-5 py-3 text-[15px] font-semibold hover:scale-[1.02]">
            Check all ten scripts
          </Link>
        </div>
      </section>

      <BrandFooter />
    </div>
  );
}
