# Slide outline (uses only measured numbers)

A short deck. Each slide states its evidence file or test. Nothing here is unmeasured; the
"pending" items are labelled as such.

## 1. Title
iTantra — offline device-to-device voice link for Indian languages. SIH26173, ISRO.
One line: "No internet, no SIM; two phones, ten scripts."

## 2. The problem
- Disaster/field areas lose network; voice is the fastest interface, but audio is expensive on
  narrow links.
- Reported scoring: Efficiency 20%, Accuracy 40%, Latency 20%. (Marked *reported* in
  `docs/PS_OFFICIAL.md`; verify against the portal.)
- The baseline (STT → text → TTS over Bluetooth/Wi-Fi Direct) is already built by many teams, so we
  pitch measurement and three contributions, not the pipeline.

## 3. Three contributions (the defensible core)
- **C1 Indic-efficient wire format** — script-aware bytes + 12-byte header + codebook.
- **C2 Uncertainty-aware speech path** — read-back, per-word confidence, critical-token guard,
  receiver cue.
- **C3 Reliable delivery under a narrow, lossy link** — ACK, retry, TTL, dedupe, ordering,
  priority, plus a link emulator.

## 4. C1 result — text is tiny
- Script-aware coding **937 B vs 2117 B UTF-8** over 28 sentences (avg 33 B/sentence).
- Preset alerts: **3 B** payload.
- Frame overhead: 12 B header + 16 B tag.
- Source: `tools/bench/results/size.csv` — **sample data** until a licensed corpus is used.

## 5. C1 vs audio (honest framing)
- The edge over a good codec is ~4–9×, not 1000× (research doc section 6).
- We show audio comparison only once a measured audio baseline exists; the Lab says so explicitly.

## 6. C3 result — reliability pays on narrow links
- `tools/bench/results/link.csv`, 120 runs.
- At **30% loss**: reliable **100%** vs fire-and-forget **69%** (1 kbps), **65%** (300 bps).
- **13,068 duplicate receipts** absorbed by the dedupe window; **0 duplicate playbacks**
  (`ProtocolSessionTest`).
- Emulator presets: 1 / 3 / 10 kbps, 300 bps, LoRa LongFast, plus loss and forced disconnects.

## 7. C2 — uncertainty-aware path
- Per-word confidence bitmap; low-confidence words get a wavy underline and force confirmation
  when they are critical (digits, water/medicine/injury/fire/road).
- Evidence: `confidence.test.ts`, `PacksTest` (critical guard + codebook), read-back screenshot.
- Calibration on a licensed dev set is **pending**.

## 8. Architecture
- One direction of authority: UI renders; Kotlin engine owns audio, speech, transport, crypto,
  outbox, database.
- Web (Next.js) is the explainer + demo + Lab; the field app is React Native (Expo) over a native
  `ITantra` module that compiles the shared Kotlin core.
- Transports: Bluetooth RFCOMM and Wi-Fi Direct behind one `Link` interface; `LinkedEngine` is
  transport-agnostic.

## 9. What runs on device today
- Protocol, reliability, VAD, metrics, transports implemented and compiled into a **40.5 MB**
  signed APK with **0 INTERNET** permission.
- Two-phone Bluetooth link implemented; **runtime on hardware pending** (`docs/DEMO.md`).

## 10. Honest status
- Verified: protocol on golden vectors, reliability invariants, benchmarks, UI tests
  (**59 JVM + 42 TS + 7 web + 5 Playwright**).
- Pending: on-device ASR/TTS quality, language qualification, two-phone link, battery/thermal.
- Do not claim: all ten languages verified, "no internet" before manifest check, range/mesh,
  real-time voice, real-disaster validation.

## 11. Roadmap
- Integrate per-language IndicConformer int8 + Piper/MMS voices; qualify Hindi and English first.
- Two-phone validation; then Wi-Fi Direct fallback; then LoRa via Meshtastic (stretch).

## 12. References
- `docs/REFERENCES.md` (Word/PDF also). Primary research doc:
  `SIH26173 iTantra research, gap analysis and build plan`.
