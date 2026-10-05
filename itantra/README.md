# iTantra (SIH26173)

An offline, device-to-device voice link for Indian languages. Speak into one Android phone,
confirm the recognised sentence, and send a compact authenticated message over Bluetooth or
Wi-Fi Direct to another phone that speaks it back — with no internet, no SIM and no server.

This repository is the implementation of `../ITANTRA_AGENT_PLAN.md`. Read that plan and
`AGENTS.md` before contributing.

## What is in here

| Path | Purpose |
| --- | --- |
| `packages/protocol-ts` | Wire protocol v1: script-aware coding, header codec, framing, AEAD envelope, dedupe/reorder/retry. Runs everywhere, tested with vitest. |
| `packages/bridge` | The `ITantra` Capacitor bridge contract (TypeScript + zod), `MockBridge` and `CapacitorBridge`. |
| `packages/vectors` | Golden vectors shared by the TypeScript and Kotlin implementations. |
| `apps/web` | Next.js site: public explainer, interactive demo against `MockBridge` (`(field)`), and the benchmark dashboard (`(lab)`). |
| `apps/mobile` | The shipping Android app: React Native (Expo 57) with a native `ITantra` module over the shared Kotlin core. |
| `apps/android` | Shared Kotlin engine modules (protocol, store, transport, speech, packs, service). |
| `tools/bench` | Python measurement harness; writes `results/*.csv`. |
| `tools/packs` | Pack manifest, checksum and licence-table tooling. |
| `docs/` | Protocol, packs, metrics, licences, demo and PS compliance documents. |
| `docs/REFERENCES.md` | All source documents, research papers, models, datasets and standards, with links. Also `docs/iTantra_References_and_Research.docx` / `.pdf`. |

## Quick start (web + protocol, no device)

```bash
pnpm install
pnpm lint && pnpm typecheck && pnpm test
pnpm --filter web build          # static export -> apps/web/out
python3 tools/bench/bench.py size
```

Then open the field UI in a browser (`pnpm --filter web dev`). With no native platform,
`Capacitor.isNativePlatform()` is false and the whole app runs against `MockBridge` with
clearly labelled mock data.

## Native build (requires a JDK and the Android SDK — see OPEN_QUESTIONS.md Q6)

```bash
cd apps/android && ./gradlew test assembleDebug
```

## Honesty rules

Every number shown in the UI, README or slides comes from a file produced by `tools/bench` or
the in-app metrics export. Placeholders are labelled `sample data`. See plan Section 15 for the
claims we must not make. Model licences are recorded in `docs/LICENSES.md`; non-commercial
assets show a banner in the app.

## Status and results

Everything below is implemented and verified on the build machine. Every number comes from a
measurement file in `tools/bench/results/` or a test run.

| Area | Evidence |
| --- | --- |
| Wire protocol v1, TypeScript + Kotlin, byte-identical | 42 TS tests; Kotlin `VectorsTest` against the same JSON vectors |
| Reliability (ACK, retry, TTL, dedupe, reorder, priority) | `OutboxTest`, `ProtocolSessionTest`, `LinkedEngineTest` |
| Script-aware coding (contribution C1) | `results/size.csv` — 937 B vs 2117 B UTF-8 over 28 sentences; preset alerts 3 B |
| Narrow-link emulator + reliability (C3) | `results/link.csv` — 120 runs; at 1 kbps/30% loss, reliable 100% vs fire-and-forget 69% |
| On-device VAD + packs + int8 convention | `EnergyVadTest`, `tools/packs` |
| Confidence + critical lexicons + codebooks | `confidence` tests, `PacksTest` (codebook lookup + critical guard), `files/packs/*/critical.*.json` |
| End-to-end latency timeline | `MetricsTest`, `InProcessEngineTest` |
| Kotlin JVM tests | **59 pass** across `core-protocol`, `core-transport`, `core-speech`, `core-packs`, `engine-service` |
| Web explainer + demo + Lab | static export (19 routes); 7 web + 42 TS tests; Playwright + axe clean |
| React Native field app | Expo 57; `EngineBridge` over the Kotlin engine |
| Signed offline release APK | 40.5 MB, **0 INTERNET**, arm64-v8a, signed `CN=iTantra` |

Not verified (requires hardware or licensed data): the two-phone Bluetooth/Wi-Fi Direct link,
on-device ASR/TTS quality, language qualification, and battery/thermal figures. See `TASKS.md` and
`OPEN_QUESTIONS.md`. Do not claim these.

## Two surfaces

The web app is the public explainer plus an interactive demo and the Lab. The React Native app is
the field tool. Both talk to the same `ITantra` contract; the web uses `MockBridge` in a browser,
the app uses the native Expo module over the shared Kotlin engine.

## References

All source documents, research papers, models, datasets and standards are collected in
`docs/REFERENCES.md` (Markdown), with a Word/PDF version at
`docs/iTantra_References_and_Research.docx` and `docs/iTantra_References_and_Research.pdf`.
The primary research document is `SIH26173 iTantra research, gap analysis and build plan-1.pdf`
in the workspace root.
