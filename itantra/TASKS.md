# TASKS.md — tickable copy of plan Section 13

Header (plan Section 2.4): team size = _unknown (Q3)_; demo date = _unknown (Q3)_.
A task is done only when its acceptance check passes and evidence is pasted on its line.

Legend: `[x]` done with evidence, `[~]` partial, `[ ]` not started, `[B]` blocked on a human.

## Focus areas requested by the team (2026-09-29)

Traceability from the six requested focus areas to evidence in this repo.

| # | Focus | Where | Evidence |
| --- | --- | --- | --- |
| 1 | Lightweight on-device AI: quantization, language packs, VAD | `core-speech/EnergyVad.kt`, `core-packs`, `docs/PACKS.md`, `tools/packs/build_pack.py` | `EnergyVadTest` 4 pass |
| 2 | Indic-efficient wire format | `packages/protocol-ts`, `core-protocol`, `docs/PROTOCOL.md`, `ProtocolSession` | `VectorsTest`, `results/size.csv` |
| 3 | Reliable messaging (ACK, retry, sequence, dedupe, priority) | `reliability.ts`, `RetryScheduler`, `Outbox`, `ProtocolSession`, `bench link` | `OutboxTest`, `ProtocolSessionTest` 8 pass, `results/link.csv` |
| 4 | Confidence-aware comms (numbers, locations, critical words) | confidence bitmap, `core-packs` `CriticalGuard` + `Codebook`, `files/packs/*/critical.*.json`, read-back UI | `confidence.test.ts`, `PacksTest` 5 pass | 
| 5 | End-to-end latency measurement | `engine-service/MetricsRecorder.kt`, `InProcessEngine` | `MetricsTest` 3, `InProcessEngineTest` 5 pass |
| G5 | Push-to-talk end to end with read-back + confidence (JVM analogue) | `InProcessEngine` (real codec/AEAD/dedupe/reorder/ACK + scripted ASR) | `InProcessEngineTest` 5 pass; app `engineDemo` |
| 6 | Narrow-link emulator (1/3/10 kbps, loss, disconnects) | `EmulatedLink`, web `EmulatorPanel`, mobile More, `bench link` | `EmulatedLinkTest`, 120-run sweep |

## Phase 0 — Foundations

- [x] **T01** monorepo, pnpm workspace, Gradle project, CI. Evidence: `pnpm-workspace.yaml`,
  `.github/workflows/ci.yml` (web + protocol-jvm + bench jobs); `pnpm lint/typecheck/test` green.
- [~] **T02** version checks done and recorded in `DECISIONS.md` (Next 16.3.6, Capacitor 8.5.2,
  Tailwind 4.3.3, Zustand 5.0.15, Zod 4.6.5, TS 7.0.2, Vitest 5.0.2, React 19.3.0). Device matrix
  `[B]` Q2; `minSdk`/`targetSdk` not chosen until phones are named.
- [B] **T03** official PS + compliance matrix. `docs/PS_OFFICIAL.md` scaffolded with reported
  requirements; every row awaits Q1.
- [x] **T04** AGENTS.md, DECISIONS.md, OPEN_QUESTIONS.md, TASKS.md. Evidence: files exist, linked
  from README.
- [x] **T05** licence generator. Evidence: `tools/packs/gen_licenses.py` ran on an empty pack list
  and wrote `docs/LICENSES.md` + `tools/packs/licenses.json`.

## Phase 1 — Protocol core

- [x] **T10** protocol module + JVM tests + CLI. Evidence: `core-protocol` (Kotlin) and
  `packages/protocol-ts` (runnable CLI). `gradle :core-protocol:test` BUILD SUCCESSFUL.
- [x] **T11** header codec (7.1). Evidence: `header.ts`, `Protocol.kt`, bit-position tests.
- [x] **T12** script-aware coding (7.3) + golden vectors. Evidence: `script.ts`/`ScriptCodec.kt`,
  property tests (500 random strings) + `packages/vectors/script_coding.json`.
- [x] **T13** confidence bitmap. Evidence: tests for 0/1/8/9/64 words in both languages.
- [x] **T14** `FrameReader`. Evidence: 2000-iteration fuzz test in TS and Kotlin; never throws.
- [~] **T15** AEAD + replay with injected interfaces. ChaCha20-Poly1305 verified end to end
  (Node `node:crypto`, Kotlin JCE); real X25519/Ed25519 identity awaits the on-device binding.
- [x] **T16** dedupe, reorder, retry with injected clock. Evidence: deterministic tests in TS and
  Kotlin.
- [x] **T17** vectors exported. Evidence: `packages/vectors/*.json` + `checksums.json`.
- [x] **T18** `bench size`. Evidence: `tools/bench/results/size.csv` (+ `.meta.json` provenance),
  23 sentences: coded 892 B vs UTF-8 2026 B. **sample data**.
- [x] **T19** `packages/protocol-ts` port. Evidence: 39 vitest tests, including `VectorsTest`
  parity with Kotlin.

**Gate G1:** met except T15 identity-key material. Size results exist and are labelled sample data.

## Phase 2 — UI, bridge, Capacitor shell

- [x] **T20** Next.js static export, tokens, route groups. Evidence: `apps/web/out` (19 routes),
  `app/globals.css` tokens.
- [x] **T21** `packages/bridge` types, zod schemas, MockBridge, CapacitorBridge selector.
- [x] **T22** components + `/dev/components`. Evidence: page builds; components render states.
- [x] **T23** screens S1–S9 against MockBridge. Evidence: Playwright walk
  Setup → Talk → Read-back → Thread, 3 passed.
- [x] **T24** screenshots 390 px day/night + axe. Evidence: `docs/shots/*.png` (9 files); axe scan
  of Talk: no serious/critical violations.
- [ ] **T25** Capacitor shell on a phone `[B]` needs a device + Android SDK (Q6).
- [x] **T26** `/dev/scripts` covering all ten scripts.

**Gate G2:** UI works in a browser against the mock. On-device WebView still `[B]`.

## React Native app (revised shell, decision 2026-09-28)

- [x] **RN1** Expo 57 app scaffolded at `apps/mobile` (expo-router, TypeScript, brand theme).
- [x] **RN2** Local Expo module `modules/itantra-native` compiling the shared `core-protocol`,
  `core-transport`, `core-speech` and `engine-service` sources. It exposes `hello`, `deviceInfo`,
  `scriptRoundTrip`, `frameInfo` (C1 frame sizes), `vadDemo` (EnergyVad), `metricsCsv`
  (MetricsRecorder), `outboxDemo` (priority + TTL) and `sessionDemo` (full send → wire → receive →
  duplicate-reject → ACK). Evidence: release dex contains `ITantraNativeModule`, `ScriptCodec`,
  `FrameCodec`, `EnergyVad`, `MetricsRecorder`, `Outbox`, `ProtocolSession`.
- [x] **RN3** Debug APK built. Evidence: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`,
  `:app:assembleDebug` BUILD SUCCESSFUL; `aapt2 dump badging` -> package `dev.itantra.app`,
  targetSdk 36, mic/Bluetooth/nearby-Wi-Fi/foreground-service permissions present.
- [x] **RN4** `npx tsc --noEmit` passes in `apps/mobile`.
- [x] **RN5a** Field UI ported to React Native: Talk, Thread, Alerts, Packs, More tabs, plus Setup,
  Peers and the native spike screen, all driven by a mobile `MockBridge`. Evidence: `npx tsc --noEmit`
  passes; `expo export --platform android` bundles `entry-*.hbc` (2.8 MB).
- [x] **RN5b** Self-contained release APK. Evidence: `app-release.apk` (97.6 MB) with
  `assets/index.android.bundle` (Hermes) and native libs for arm64-v8a, armeabi-v7a, x86, x86_64;
  `:app:assembleRelease` BUILD SUCCESSFUL.
- [~] **RN5c** Field screens wired to the Kotlin engine: `EngineBridge` routes talk, read-back,
  messages, alerts and engine state to `ITantraNative` (in-process engine) and keeps the mock for
  packs/permissions/discovery. Evidence: `tsc` clean, `expo export` bundles, APK builds with
  `startEngine`/`listEngineMessages`/`engineReady` in the dex. **Runtime behaviour on a device is
  not yet verified** (no hardware here).
- [x] **RN6** Offline release build. Evidence: `app-release.apk` (40.4 MB) with **zero**
  `android.permission.INTERNET` entries (`aapt2 dump badging`), arm64-v8a only, self-contained
  `assets/index.android.bundle`. `expo-dev-client` removed; `plugins/withOfflineManifest.js`
  applies `tools:node="remove"` when `ITANTRA_OFFLINE=1`. Still to do: release signing and
  stripping `SYSTEM_ALERT_WINDOW`.

## Phase 3–8 — native engine

- [~] `core-store` Room schema + entities written (Android SDK absent).
- [x] transport/link interfaces, `LoopbackTransport`, `EmulatedLink`, `LoraAirtime`, `LinkManager`.
  Evidence: `LoopbackTest` 2 + `EmulatedLinkTest` 3 + `LoraAirtimeTest` 3 + `LinkManagerTest` 3
  pass; loopback exchanges whole frames across both directions; emulator drops at 100% loss and
  forwards after the modelled serialisation delay; LinkManager prefers Wi-Fi Direct over Bluetooth.
- [x] `engine-service` `Outbox` state machine with TTLs and retry. Evidence: `OutboxTest` 4 tests
  pass (due/ack, routine TTL, alert-before-routine, retry until ack).
- [~] `BluetoothTransport` (RFCOMM, 2-byte stream framing) and `WifiDirectTransport` (P2P group +
  TCP) written under `core-transport/src/androidMain` and compiled into the release APK. Evidence:
  dex contains `BluetoothTransport` and `WifiDirectTransport`; APK still 0 INTERNET.
- [~] Bluetooth wired to the engine: `startBluetoothServer` / `connectBluetooth` / `sendBluetooth`
  build a `LinkedEngine` over the RFCOMM link and emit `link`/`message` events; `/dev` has controls
  for a two-phone smoke test. **Runtime link on two phones is not verified** (no hardware here).
- [x] `LinkedEngine`: transport-agnostic send/receive over a `Link` (codec + AEAD + dedupe +
  reorder). Evidence: `LinkedEngineTest` 3 pass over `LoopbackTransport` (frame decodes at the
  peer, alert frame arrives, duplicate frame ignored). The same class accepts Bluetooth/Wi-Fi
  Direct links on device.
- [~] `core-speech` capture/VAD/ASR/TTS interfaces with `AsrResult`, `TtsEngine`; `EnergyVad` and
  scripted ASR/TTS fakes implemented and tested.
- [~] `engine-service` `Orchestrator`, alert player, metrics: not yet written.
- [~] `capacitor-plugin` `ITantraPlugin` Kotlin skeleton (thin delegation). Superseded on mobile by
  the Expo module `modules/itantra-native`, which compiles the shared `core-protocol` sources.
- [~] pack manifest model + validator + `tools/packs/build_pack.py`.

## Batch (2026-09-30)

- [x] Web unit tests: `lib/csv.test.ts` (4) and `lib/i18n.test.ts` (3). Evidence: `pnpm --filter web test`
  -> 7 passed. `parseCsv` moved to `lib/csv.ts` so it tests without a DOM.
- [x] Offline plugin also strips `SYSTEM_ALERT_WINDOW`. Evidence: `android/app/src/main/AndroidManifest.xml`
  has `tools:node="remove"` for both INTERNET and SYSTEM_ALERT_WINDOW.
- [x] `pairedBluetoothDevices()` exposed through the native module (lists bonded devices via
  `BluetoothTransport`; returns [] without BLUETOOTH_CONNECT). Shown on the `/dev` screen.
- [x] `docs/DEMO.md` two-phone hardware test steps for Gates G3/G5 (build, install, pair, talk,
  receive, alert, store-and-forward, 1 kbps, airplane mode) with the evidence to capture.
- [x] Release signing via `plugins/withReleaseSigning.js` + a local keystore. Evidence:
  `apksigner verify --print-certs` -> `CN=iTantra, OU=SIH26173, O=iTantra`. Credentials are
  git-ignored.
- [x] Lab UI test + README results table + PS compliance matrix updated. Evidence: Playwright 5/5
  (incl. "Lab size page renders the measured numbers with their source"). Web 7 + TS 42 tests.

## Phase 9 — Lab and benchmarks

- [x] Lab routes `/lab/size`, `/lab/accuracy`, `/lab/latency`, `/lab/link` with CSV import.
- [x] charts (grouped bars, line, waterfall) with source + n on every frame.
- [x] `bench size` results committed with provenance.
- [x] `bench link` simulation results committed (60 runs).
- [ ] `bench wer`/`noise`/`calibrate`/`semantic` harness present; real runs await corpora (Q8)
  and real ASR (T42).

## Phase 10 — Demo and hardening

- [~] failure-path copy in screens (Bluetooth off, no voice, waiting for link) present in the mock.
- [~] README, generated `LICENSES.md`, limitations page present; needs a human review.

## What is explicitly not done (do not claim otherwise)

- A debug APK now builds, but it only proves the toolchain and one native call. The field screens
  are not ported to React Native yet, and there is still no Bluetooth/Wi-Fi Direct link on real
  phones, no real speech recognition or synthesis, no language qualification, no battery/thermal
  numbers, no Wi-Fi Direct, no peer pack share and no LoRa.
