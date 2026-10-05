# iTantra (SIH26173): Agent Development Plan

Status: ready to execute. Written 2026-09-28. Companion to the research doc "SIH26173 iTantra: research, gap analysis and build plan".

This file is the single source of truth for a coding agent (and for the humans supervising it). Read Sections 0–3 fully before writing any code. Everything after that is reference plus the ordered task list in Section 13.

---

## 0. Agent contract (read first, obey always)

1. **Stop and report, never guess.** If a fact is missing (official PS text, target phone models, licence of a model, an API you are unsure of), write it into `OPEN_QUESTIONS.md` and stop that task. Do not invent numbers, file names, model URLs, package versions or API signatures.
2. **Verify versions and APIs from current documentation, not memory.** At project start run the version checks in Section 3.3 and record results in `DECISIONS.md`. Libraries in this plan (Next.js, Capacitor, Tailwind, sherpa-onnx, Room, Tink) change fast.
3. **Native owns the truth; the web layer renders it.** Audio capture, speech models, transport, crypto, the outbox and the database live in Kotlin inside a foreground service. The Next.js UI never captures audio, never opens sockets to peers, and never holds the only copy of any message. If the UI process dies, messages must still be delivered.
4. **No cloud, no runtime internet.** After packs are installed, no code path may need the internet. Internet is allowed only for downloading packs and dependencies at build/provision time. No analytics, no crash reporters that phone home.
5. **Every number in the UI, README, slides or reports comes from a measurement file** produced by `tools/bench` or the in-app metrics export. Never hard-code a claimed WER, latency, byte count or battery figure. Placeholders in mocks must be labelled `sample data`.
6. **Do not claim what is not implemented and tested.** Section 15 lists banned claims. If a feature is partial, the UI and docs say so.
7. **Keep the wire format frozen once Gate 3 passes.** Changes after that need a new protocol version and an entry in `DECISIONS.md`.
8. **Small, verifiable steps.** One task at a time. A task is done only when its acceptance check (Section 13) passes and you have pasted the evidence (command output, screenshot path, CSV path) into the task's line in `TASKS.md`.
9. **Licences are data.** Every model and voice records its licence class in its pack manifest. Non-commercial models must show a banner in the app and in `docs/LICENSES.md`.
10. **When a native crash occurs, reproduce on desktop before changing model files.** Native libraries abort without Java exceptions; one team lost four build cycles to a malformed tokens file that the desktop build of the same library explained in one second.

---

## 1. Product in one paragraph

Two Android phones, no internet, no SIM. Person A speaks in one of ten Indian languages (Hindi, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Odia, English). Phone A recognises the speech on-device, shows the recognised sentence as a read-back with per-word confidence, and (after accept) sends a compact authenticated message of roughly 60–100 bytes over Bluetooth or Wi-Fi Direct. Phone B verifies, de-duplicates, queues and speaks it with an on-device voice. Alerts jump the queue and play loudly until acknowledged. A link emulator can throttle, drop and disconnect the link so the benefit on narrow links (LoRa-like, satellite-message-like) can be measured, not asserted.

**The three contributions we must be able to defend with numbers** (see research doc, section 8):

| # | Contribution | Baseline we beat | Measured by |
| --- | --- | --- | --- |
| C1 | Indic-efficient wire format (script-aware bytes, 12-byte header, optional codebook) | UTF-8 text + generic compression | `tools/bench size` on real transcripts |
| C2 | Uncertainty-aware speech path (read-back, word confidence, critical-token guard, unclear-word cue at receiver) | Same pipeline with no confidence signal | `tools/bench semantic` on noisy sets |
| C3 | Reliable delivery under an emulated narrow, lossy, intermittent link (ACK, retry, dedupe, ordering, priority, outbox) | Fire-and-forget send | `tools/bench link` sweeps |

Everything else (STT, TTS, Bluetooth, Wi-Fi Direct, Protobuf-like packets) is baseline that other teams already built. Do not present it as novel.

---

## 2. Scope

### 2.1 In scope (must ship)

- Android app (Capacitor shell + Next.js UI + Kotlin native engine), sideloaded APK.
- Offline recognition and speech output for a **language subset chosen by measurement** (Section 9.4), architecture ready for all ten.
- Transports: Bluetooth Classic RFCOMM, Wi-Fi Direct (both behind one interface).
- Push-to-talk mode and hands-free (phone-like) mode.
- Alerts: preset codebook alerts and spoken alerts, non-interruptible playback until acknowledged.
- Outbox with ACK, retry, TTL, priority, de-duplication, ordering.
- Link emulator (rate, loss, jitter, forced disconnects).
- Metrics capture and export; Lab dashboard (Next.js route group) for benchmark results.
- Pack system for language models (install from file, share peer-to-peer).

### 2.2 Stretch (only after Gate 9)

- LoRa bridge through the Meshtastic Android app (AIDL) with two LoRa boards.
- Multi-hop relay (flood with hop limit).
- Automatic language identification.
- Translation between languages (IndicTrans2 distilled or similar). Not required by any source we found.
- Location field in alerts.
- Hindi UI strings.

### 2.3 Non-goals

- iOS. Web-only/PWA (see 3.1 for why it cannot meet the PS). Cloud backend. User accounts. Group chats. Voice cloning. Full Bundle Protocol v7. Any claim of real-disaster validation.

### 2.4 Inputs the agent needs from humans (block on these)

| Needed | Why | Where to record |
| --- | --- | --- |
| Official SIH26173 text from the portal (Background, Description, Expected Outcome, evaluation criteria) | Requirements in this plan marked `reported` came from team repos quoting the PS | `docs/PS_OFFICIAL.md`, then a compliance matrix |
| Target phone models (at least two, one mid-range) | All model speed and RAM decisions | `DECISIONS.md` (Device matrix) |
| Team size and demo date | Re-estimate phase effort | `TASKS.md` header |
| Language subset for the demo | Pack build and testing effort | `DECISIONS.md` |
| Commercial or competition-only use | Decides whether non-commercial voices are acceptable | `docs/LICENSES.md` |

---

## 3. Decisions

### 3.1 Why "Next.js" here is the UI layer inside Capacitor, not the whole app

The PS needs on-device speech models, Bluetooth/Wi-Fi Direct device-to-device links, background audio and loud alerts on Android phones. A pure Next.js web app or PWA cannot do this: browsers expose only BLE (Web Bluetooth, limited), no Bluetooth Classic RFCOMM socket, no Wi-Fi Direct, and restrict background audio and volume control. So:

- **UI: Next.js (App Router, TypeScript, static export)** running inside **Capacitor's Android WebView**. The team keeps the Next.js skills and gets a fast, testable UI.
- **Engine: Kotlin native modules** exposed to the UI through one **Capacitor plugin** (`ITantra`).
- **Lab dashboard: same Next.js codebase**, route group `(lab)`, runs on the phone or on a laptop and reads exported CSV/JSON. No server.

If the team later insists on a different shell (React Native, pure native Compose), only `apps/web` changes; the Kotlin core and the bridge contract stay.

Trade-offs to keep visible: a WebView bridge adds a little latency to UI events (irrelevant for text-sized messages; audio never crosses it); Capacitor plugin work is Kotlin either way; static export removes Next.js server features (no API routes, no server components that fetch at runtime, no image optimisation).

### 3.2 Decision table (record actual results in `DECISIONS.md`)

| Area | Choice | Reason | Alternative if it fails |
| --- | --- | --- | --- |
| UI | Next.js App Router, `output: 'export'`, `trailingSlash: true`, TypeScript strict | Static files load reliably in a WebView | Vite + React SPA |
| Shell | Capacitor Android, `webDir: 'out'` | Keeps web UI, allows Kotlin plugins | Native Compose UI |
| Styling | Tailwind CSS (current major) with CSS variable tokens, Radix UI primitives for dialog/tabs/toggle, own components | Accessible primitives, no generic kit look | Plain CSS modules |
| State | Zustand fed by plugin events, events validated with zod | Small, predictable | Redux Toolkit |
| Charts (Lab) | Recharts or hand-rolled SVG | Enough for bars, lines, waterfall | visx |
| Native language | Kotlin, coroutines/Flow, Room | Standard, testable | none |
| Speech runtime | sherpa-onnx (Kotlin/JNI API) for VAD, ASR, TTS; ONNX Runtime directly if per-token probabilities are not exposed | Used by other teams for exactly this pipeline | ONNX Runtime Mobile only |
| ASR | Per-language IndicConformer hybrid CTC-RNNT, int8 CTC ONNX | About 140 MB per language in a third-party export | Smaller model, or edge-laptop mode for accuracy reference only |
| TTS | Piper/VITS int8 per language; MMS-VITS where no other voice exists (non-commercial banner); Android system TTS fallback | Small, offline | AI4Bharat VITS after licence and export check |
| Crypto | Google Tink (Ed25519, X25519, HKDF, ChaCha20-Poly1305) or libsodium binding; keys in Android Keystore | Avoid hand-rolled crypto | Any audited library |
| Package manager | pnpm workspaces (web), Gradle (Android) | Monorepo | npm workspaces |
| Backend | None | Peer-to-peer is enough | none |

### 3.3 Version checks to run on day one (paste output into `DECISIONS.md`)

```bash
node -v && pnpm -v
npm view next version
npm view @capacitor/core version
npm view @capacitor/android version
npm view tailwindcss version
npm view zustand version zod version
java -version
# Android: record compileSdk / targetSdk / minSdk you choose and why
# sherpa-onnx: record the exact release tag and the Kotlin API files you vendored
```

Choose `minSdk` deliberately (recommendation: 26 or higher; record the phone-share reasoning). Set `targetSdk` to the current required level for your distribution route, and re-check foreground-service and Bluetooth permission rules for that level.

---

## 4. Repository layout

```text
itantra/
├─ AGENTS.md                    # short pointer to this plan + the contract (Section 0)
├─ DECISIONS.md                 # dated decision log, device matrix, version results
├─ OPEN_QUESTIONS.md            # blockers for humans
├─ TASKS.md                     # copy of Section 13 as tickable list with evidence
├─ docs/
│  ├─ PS_OFFICIAL.md            # pasted official PS text + compliance matrix
│  ├─ PROTOCOL.md               # Section 7 promoted, versioned
│  ├─ PACKS.md                  # Section 9
│  ├─ METRICS.md                # Section 12
│  ├─ LICENSES.md               # generated table of model/voice licences
│  └─ DEMO.md                   # Section 14
├─ apps/
│  ├─ web/                      # Next.js (field UI + lab)
│  │  ├─ app/
│  │  │  ├─ (field)/            # phone UI: talk, peers, thread, alerts, link, packs, settings
│  │  │  └─ (lab)/              # dashboard: benchmarks, emulator sweeps, corpus size
│  │  ├─ components/
│  │  ├─ lib/{bridge,store,i18n,format}
│  │  └─ styles/tokens.css
│  └─ android/                  # Capacitor Android project
│     ├─ app/                   # shell, manifest, permissions
│     ├─ core-protocol/         # pure Kotlin/JVM: codec, script coding, framing, crypto framing, dedupe, reorder
│     ├─ core-store/            # Room entities, DAOs
│     ├─ core-transport/        # Transport/Link interfaces, Bluetooth, WifiDirect, Nearby (optional), Emulator
│     ├─ core-speech/           # capture, VAD, ASR, confidence, TTS, playback
│     ├─ core-packs/            # manifest parsing, install, verify, peer share
│     ├─ engine-service/        # foreground service, orchestrator, metrics
│     └─ capacitor-plugin/      # @CapacitorPlugin ITantra bridge
├─ packages/
│  ├─ bridge/                   # TS types, zod schemas, CapacitorBridge, MockBridge
│  ├─ protocol-ts/              # TS port of codec used by mock + lab (validated by vectors)
│  └─ vectors/                  # golden test vectors (JSON) generated by Kotlin
└─ tools/
   ├─ bench/                    # Python: size, wer, semantic, link, noise mixing (calls Kotlin CLI jar)
   ├─ packs/                    # model conversion, quantisation, manifest + checksum builder
   └─ corpus/                   # transcripts and phrase lists (with provenance files)
```

Rules: `core-protocol` has no Android imports so it runs in plain JVM tests. `packages/vectors` is the contract between Kotlin and TypeScript: both test suites must pass against the same files.

---

## 5. Definition of done (every task)

- Code compiles; `pnpm lint`, `pnpm typecheck`, `pnpm test` and `./gradlew test` pass.
- New behaviour has a test, or an explicit `manual-test` entry in `TASKS.md` with steps.
- UI changes have a Playwright screenshot in `docs/shots/` for phone width (390 px) in light and night themes.
- No new permission, dependency or model without a line in `DECISIONS.md` and, for models, `docs/LICENSES.md`.
- Evidence pasted into the task line.

---

## 6. Architecture

```text
┌────────────────────────────── Android app (one process, one foreground service) ───────────────────────────────┐
│                                                                                                                │
│  WebView (Capacitor)                    Kotlin engine (engine-service)                                         │
│  ┌──────────────────────┐   events ▲    ┌────────────────────────────────────────────────────────────────┐    │
│  │ Next.js static UI    │───────────────│ Orchestrator                                                   │    │
│  │ (field + lab)        │  commands ▼   │  ├─ core-speech    capture → VAD → ASR → confidence            │    │
│  │ Zustand store        │   (ITantra    │  │                 TTS → playback queue (alerts pre-empt)      │    │
│  │ MockBridge in dev    │    plugin)    │  ├─ core-protocol  encode/decode, script coding, framing, AEAD │    │
│  └──────────────────────┘               │  ├─ core-store     Room: outbox, inbox, peers, packs, metrics  │    │
│                                         │  ├─ core-transport Link interface: Bluetooth | Wi-Fi Direct    │    │
│                                         │  │                 + EmulatedLink decorator                    │    │
│                                         │  └─ core-packs     manifests, checksums, peer share            │    │
│                                         └────────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Principles:

- **One direction of authority.** Commands go UI → engine; state comes back as events and by querying Room. The UI keeps only view state.
- **Everything time-critical is native.** Capture, VAD, ASR, TTS, playback, retry timers and the alert player never wait on the WebView.
- **Swappable edges.** `AsrEngine`, `TtsEngine`, `Transport` and `Link` are interfaces with fake implementations for tests.
- **Deterministic core.** `core-protocol` is pure functions plus small state machines (dedupe window, reorder buffer, retry scheduler taking an injected clock). All unit-testable on the JVM with a fake clock.

### 6.1 Runtime flows

**Send (routine text):**
`capture → VAD endpoint → ASR → words+confidence → readback event → user accepts (or edits/redoes) → normalise (NFC) → script encode → header+payload → AEAD → outbox row QUEUED → link send → SENT → ACK → ACKED`.

**Receive:**
`frame → length check → decode header → AEAD verify (reject on failure) → replay/dedupe check → ACK back → reorder buffer → TTS synth → playback queue → PLAYED`. Stale routine messages (older than the stale limit) are stored as `SHOWN_ONLY`.

**Alert:**
`sendAlert → priority 2 → outbox front → link` and on receive `AlertPlayer` takes the audio stream, raises alarm volume, repeats until human ACK or timeout, restores volume.

---

## 7. Wire protocol v1 (freeze at Gate 3)

All integers big-endian. Streams (RFCOMM, TCP) carry frames as `[len:uint16][frame]`; maximum frame 2048 bytes. Datagram-like links (LoRa stretch) carry the frame alone.

### 7.1 Frame = header (12 bytes) + payload (0–255 bytes) + tag (16 bytes)

| Byte | Bits | Field | Notes |
| --- | --- | --- | --- |
| 0 | 7–4 | version | 1 |
| 0 | 3–0 | type | see 7.2 |
| 1 | 7–6 | priority | 0 routine, 1 urgent, 2 alert |
| 1 | 5 | needAck | receiver must ACK |
| 1 | 4 | hasConf | payload ends with confidence bitmap |
| 1 | 3 | fragment | payload starts with 1 byte `index(4)|count(4)` |
| 1 | 2 | codebook | payload is a phrase reference |
| 1 | 1–0 | reserved | 0 |
| 2 | 7–0 | language | index in `languages.json` (0 en, 1 hi, 2 mr, 3 gu, 4 bn, 5 ta, 6 te, 7 kn, 8 ml, 9 or, 10 pa; 11–31 reserved) |
| 3–4 |  | senderId | uint16, assigned at pairing |
| 5–6 |  | seq | uint16 per sender; every frame (including ACK, PING) consumes one |
| 7–8 |  | ageSeconds | seconds since the message was created, set at each transmission attempt, saturating; clock-independent |
| 9 |  | hops | remaining hops (0 for direct links; stretch relay only) |
| 10 |  | payloadLen | 0–255 |
| 11 |  | reserved | 0 |

Note on time: the research doc sketched a "minutes since session epoch" field. This plan replaces it with a clock-independent age so staleness works without synchronised clocks. Record it in `DECISIONS.md`.

The 16-byte tag is ChaCha20-Poly1305 (or the AEAD your crypto library provides consistently on both ends) over the payload, with the 12 header bytes as associated data. `HELLO` frames carry no tag (they are signed instead).

### 7.2 Types and payloads

| Type | Code | Payload |
| --- | --- | --- |
| TEXT | 0x1 | `textLen(1) | textBytes | [confBitmap]` |
| PHRASE | 0x2 | `phraseId(2) | codebookVersion(1)` (priority 2 = preset alert) |
| ALERT_TEXT | 0x3 | same as TEXT, priority 2 |
| ACK | 0x4 | `kind(1: 0 transport, 1 human) | ackSeq(2) | bitmap(4)` bit k = received `ackSeq-1-k` |
| HELLO | 0x5 | `identityPub(32) | ephemeralPub(32) | signature(64) | protoMin(1) | protoMax(1)` |
| PACK_OFFER | 0x6 | `langIndex(1) | version(2) | sizeBytes(4) | sha256(32)` |
| PING / PONG | 0x7 / 0x8 | `nonce(4)`; PONG adds `responderMonotonicMs(4)` (metrics only) |
| LOCATION | 0x9 | stretch: `lat(4) | lon(4)` fixed-point, alert-only |

### 7.3 Script-aware text coding (contribution C1)

Input is Unicode NFC. The language registry gives a **script window base** (Devanagari U+0900, Bengali U+0980, Gurmukhi U+0A00, Gujarati U+0A80, Odia U+0B00, Tamil U+0B80, Telugu U+0C00, Kannada U+0C80, Malayalam U+0D00; English has none).

| Output byte(s) | Meaning |
| --- | --- |
| `0x0A`, `0x20`–`0x7E` | Same ASCII character |
| `0x80`–`0xFF` | Code point `windowBase + (byte - 0x80)` |
| `0x03` / `0x04` | U+200D zero-width joiner / U+200C non-joiner (needed for correct Indic shaping) |
| `0x06` / `0x07` | U+0964 danda / U+0965 double danda (used across scripts) |
| `0x05, idx` | Switch window: `windowBase = 0x0900 + idx * 0x80` (for mixed-script text) |
| `0x01, hi, lo` | Any other BMP code point |
| `0x02, b2, b1, b0` | Any supplementary code point |

Requirements:

- `decode(encode(s, lang), lang) == NFC(s)` for every string in every corpus and in a property test with random Indic strings (control characters other than newline are normalised to a space on both sides).
- Golden vectors in `packages/vectors/script_coding.json` cover: pure Hindi, pure Tamil, Hindi with English words, joiner and non-joiner cases, danda inside a Bengali sentence, an emoji, empty string, and a 255-byte payload.
- Expected size is about one byte per character. Do not state a ratio in any document until `tools/bench size` reports it on real transcripts.

Confidence bitmap: words are the segments between `0x20` bytes of the decoded text. Bit `i` (most significant bit first within each byte) is 1 when word `i` is low confidence. Length is `ceil(words/8)` bytes.

### 7.4 Security handshake and pairing

1. **Pairing (first meeting).** Each phone has a long-term Ed25519 identity key in Android Keystore (or Tink keyset encrypted by a Keystore key). Devices exchange `HELLO` and show a 6-digit short authentication string derived from both identity keys and ephemerals; both users confirm it matches. A QR code carrying the identity public key is an optional faster path. The peer identity key is then pinned.
2. **Each connection.** New `HELLO` with fresh X25519 ephemerals, signed by the identity key. Session keys and per-direction 4-byte salts come from HKDF over the shared secret and the transcript hash.
3. **Nonce.** `salt(4) | counter(8)` where `counter = epoch << 16 | seq`; a reconnect starts a new epoch. Re-run the handshake before `seq` wraps.
4. **Replay.** Reject frames whose `(senderId, seq)` is in the dedupe window or is more than 32,768 behind the highest seen.
5. **At rest.** Messages are stored as text in Room. Provide a setting "Do not keep message history" (default off for the demo, and documented).
6. **Do not claim** forward secrecy beyond a session, an external audit, or protection against a malicious paired peer.

### 7.5 Reliability defaults (all in `EngineConfig`, all starting values to tune)

| Setting | Default | Note |
| --- | --- | --- |
| Retry backoff | 1 s, doubling, cap 30 s, jitter ±20% | Until ACK or expiry |
| TTL | routine 600 s, urgent 1800 s, alert 3600 s | Sender-side expiry |
| Dedupe window | last 256 `(senderId, seq)` per peer, persisted | Room table |
| Reorder wait | 5 s | Then play later message with a "previous message missing" cue |
| Stale-speech limit | 300 s | Older routine messages are shown, not spoken |
| Heartbeat | PING every 5 s idle; link down after 3 misses | |
| Alert repeat | every 10 s until human ACK, max 5 min | Then restore volume |

---

## 8. Data model (Room, version 1)

```sql
CREATE TABLE peer (
  peerId TEXT PRIMARY KEY,          -- hex of identity public key hash
  displayName TEXT NOT NULL,
  identityPub BLOB NOT NULL,        -- pinned at pairing
  senderId INTEGER NOT NULL,        -- uint16 we assigned or they announced
  trust TEXT NOT NULL,              -- 'paired' | 'blocked'
  lastSeenAt INTEGER, lastTransport TEXT
);
CREATE TABLE message (
  messageId TEXT PRIMARY KEY,       -- uuid, local only
  peerId TEXT NOT NULL REFERENCES peer(peerId),
  direction TEXT NOT NULL,          -- 'out' | 'in'
  senderId INTEGER NOT NULL, seq INTEGER NOT NULL,
  type INTEGER NOT NULL, priority INTEGER NOT NULL, lang INTEGER NOT NULL,
  text TEXT,                        -- recognised or received text
  confBits BLOB,                    -- bitmap or NULL
  phraseId INTEGER, codebookVersion INTEGER,
  createdAt INTEGER NOT NULL, expiresAt INTEGER,
  state TEXT NOT NULL,              -- out: QUEUED SENDING SENT ACKED EXPIRED CANCELLED
                                    -- in: RECEIVED PLAYING PLAYED SHOWN_ONLY MISSED_PREV
  attempts INTEGER NOT NULL DEFAULT 0, nextRetryAt INTEGER,
  ackedAt INTEGER, playedAt INTEGER,
  UNIQUE(peerId, direction, senderId, seq)
);
CREATE TABLE dedupe (peerId TEXT, senderId INTEGER, seq INTEGER, seenAt INTEGER,
  PRIMARY KEY(peerId, senderId, seq));
CREATE TABLE language_pack (
  langIndex INTEGER PRIMARY KEY, packId TEXT NOT NULL, version INTEGER NOT NULL,
  status TEXT NOT NULL,             -- 'verified' | 'experimental' | 'disabled'
  asrLicenseClass TEXT, ttsLicenseClass TEXT, sizeBytes INTEGER, installedAt INTEGER
);
CREATE TABLE metric (
  runId TEXT, messageId TEXT, name TEXT, tMillis INTEGER, value REAL, PRIMARY KEY(runId, messageId, name)
);
```

Migrations are explicit; never use destructive fallback in release builds.

---

## 9. Speech, languages and packs

### 9.1 Capture and voice-activity detection

- `AudioRecord`, source `VOICE_RECOGNITION`, 16 kHz mono PCM16, ring buffer for 30 s, 300 ms pre-roll so the first syllable is not clipped.
- VAD: Silero VAD (as used by other teams) through sherpa-onnx. Verify its required frame size from the release you vendor. Starting values: endpoint after 700 ms of silence, minimum speech 250 ms, forced endpoint at 15 s. All in `EngineConfig`, all to be tuned in noise tests.
- Push-to-talk ends on release; hands-free mode uses VAD endpointing. Both write the same `utterance` events.
- Keep a DC blocker and, only if the noise benchmark shows a gain, a noise-suppression stage. Do not add one on assumption.

### 9.2 ASR and confidence (contribution C2)

`AsrEngine.transcribe(pcm) -> AsrResult(text, words[{text, conf, startMs, endMs}], rtf)`.

- Implementation A: sherpa-onnx `OfflineRecognizer` with a NeMo CTC model. Implementation B (needed if A does not expose per-token probabilities): ONNX Runtime with your own greedy CTC decoder. Check A's result fields in the release you vendor before writing B.
- If you write feature extraction yourself, use an FFT (not a naive DFT), build the mel filterbank once, and match the model's config exactly (window, hop, mel bins, normalisation). One team measured a 43× slowdown from a naive DFT before the neural network even ran.
- Word confidence: greedy CTC decode; each token's probability is the maximum posterior over its frames; word confidence is the minimum over its tokens.
- Threshold `tau` per language is **calibrated**, not guessed: `tools/bench calibrate` picks the value that flags a target share of wrong words on a dev set and writes it into the pack manifest with the precision it achieved. Until calibrated, mark the language `experimental` and disable the confidence UI.
- Vocabulary restriction: test pruning the decoder vocabulary to the target script (one team reports it stopped foreign-script characters); adopt only if the benchmark shows a gain.
- Critical tokens: `critical.<lang>.json` lists number words and a small lexicon (place, water, medicine, injury, fire, road), reviewed by a native speaker. Digits always count as critical. If any critical word is low confidence, read-back is mandatory even in hands-free mode.

### 9.3 TTS and playback

- `TtsEngine.synthesize(text, lang, speed) -> Flow<PcmChunk>`, sentence-by-sentence so the first audio starts early. Split on danda, full stop and question mark.
- Text for TTS is normalised per language (digits to words if the voice cannot read digits; check each voice, and record the result in the pack manifest).
- Receiver cue for unclear words: a short earcon before the sentence and a wavy underline on screen. Do not alter or drop the words.
- `PlaybackQueue`: priorities alert > urgent > routine, one `AudioTrack` at a time, audio focus requested, alerts use the alarm usage.
- Resample TTS output with a proper filter if the voice rate differs from the device output rate.
- Fallback chain per language: pack voice → Android system TTS voice if installed → text only with a visible notice.

### 9.4 Language qualification (week one, before promising any language)

For each of the ten languages, on each target phone, record:

| Test | Data | Measures |
| --- | --- | --- |
| ASR | 20 read sentences from a public benchmark (verify licence; FLEURS is reported as CC-BY-4.0) plus 10 emergency sentences read by a native speaker | WER and CER (both, NFC-normalised, punctuation stripped), real-time factor, load time, peak PSS memory |
| TTS | 10 emergency sentences | Native-speaker intelligibility rating 1–5, machine read-back error (labelled as machine, not human), synthesis time to first audio |

Write the pass thresholds into `DECISIONS.md` **before** running the tests. A language that passes is `verified` in the UI; the rest are `experimental` with a visible label. Suggested order to try: Hindi and English, then Marathi, Telugu, Bengali, Malayalam (Piper voices exist), then Tamil, Kannada, Odia, Gujarati (may need MMS or AI4Bharat voices; check licences).

### 9.5 Pack manifest (`files/packs/<lang>/pack.json`)

```json
{
  "id": "hi",
  "langIndex": 1,
  "displayName": "हिन्दी",
  "script": "Devanagari",
  "scriptWindowBase": "0x0900",
  "version": 1,
  "status": "experimental",
  "asr": {
    "engine": "sherpa-nemo-ctc",
    "files": [{"name": "model.int8.onnx", "sha256": "…", "bytes": 0}, {"name": "tokens.txt", "sha256": "…", "bytes": 0}],
    "sampleRate": 16000,
    "confidence": {"tau": null, "calibratedOn": null, "precision": null},
    "license": "MIT", "licenseClass": "permissive", "source": "URL of the exact file"
  },
  "tts": {
    "engine": "sherpa-vits-piper",
    "files": [{"name": "voice.onnx", "sha256": "…", "bytes": 0}, {"name": "tokens.txt", "sha256": "…", "bytes": 0}],
    "sampleRate": 22050, "digitsNeedExpansion": null,
    "license": "…", "licenseClass": "permissive | share-alike | non-commercial", "source": "URL"
  },
  "codebook": "codebook.hi.json",
  "critical": "critical.hi.json",
  "selfTest": {"text": "…", "maxWer": null}
}
```

Rules: `tools/packs` builds packs and fills checksums and byte sizes; the app verifies checksums on install and on first load; a tokens file is validated in Kotlin before any native call (every symbol must be exactly what the runtime expects); an invalid pack disables only that language. Adding a language must need no rebuild of the app.

Packs install from: file picker or `adb push`; peer share over Wi-Fi Direct as a bulk transfer with resume by offset (Gate 8, not before).

### 9.6 Phrase codebook (alerts)

`codebook.<lang>.json` holds numbered preset alerts (need help, injured, need water, need boat, fire, road blocked, location shared, all safe). Every entry has a native-speaker review flag; unreviewed entries are excluded from release builds. A message carries only the id plus the codebook version; the receiver looks up its own language text, so a preset alert works even if recognition is poor. A version mismatch shows "codebook mismatch" and speaks nothing.

---

## 10. Transport, link management and emulator

### 10.1 Interfaces (Kotlin)

```kotlin
enum class TransportId { BLUETOOTH, WIFI_DIRECT, NEARBY, LORA_MESHTASTIC, LOOPBACK }

interface Transport {
    val id: TransportId
    val state: StateFlow<TransportState>
    fun discover(): Flow<PeerRef>                 // nearby candidates
    suspend fun listen()                          // accept incoming links
    suspend fun connect(peer: PeerRef): Result<Link>
    fun incomingLinks(): Flow<Link>
    suspend fun shutdown()
}

interface Link {
    val peer: PeerRef
    val transport: TransportId
    val mtu: Int?                                 // null for streams
    val incoming: Flow<ByteArray>                 // whole frames
    suspend fun send(frame: ByteArray)            // throws LinkClosed
    val closed: StateFlow<Boolean>
    suspend fun close()
}
```

Stream links add/strip the 2-byte length prefix inside the link implementation, so protocol code only sees frames.

### 10.2 Implementations

- **BluetoothTransport:** RFCOMM secure socket on an app UUID, accept loop plus connect with timeout; paired-device list for known peers; runtime permission handling for the Android level in use.
- **WifiDirectTransport:** `WifiP2pManager` peer and service discovery, connect, group-owner accept loop, TCP port fixed in `EngineConfig`; treat OEM inconsistencies as expected and log each stage to metrics.
- **LoopbackTransport:** two engines in one process for tests.
- **Nearby (optional fallback)** and **LoRa via Meshtastic** are stretch; keep the interface stable so they drop in.

### 10.3 LinkManager

Keeps the best live link per peer (prefer Wi-Fi Direct, fall back to Bluetooth, hysteresis 10 s), sends heartbeats, reconnects with backoff, and publishes `link` events (`transport`, `state`, `rttMs`, `bytesTx`, `bytesRx`). On link-up it triggers the outbox flush.

### 10.4 EmulatedLink (decorator over any Link)

```kotlin
data class EmulatorConfig(
    val rateBps: Int? = null,                     // serialisation rate
    val airtimeModel: AirtimeModel? = null,       // e.g. LoRa SF/BW/CR; overrides rateBps when set
    val perFrameOverheadMs: Int = 0,
    val lossPercent: Double = 0.0,                // per frame, both directions
    val jitterMs: Int = 0,                        // uniform ± jitter
    val disconnects: List<Window> = emptyList(),  // (startMs, durationMs) from enable time
    val seed: Long = 1L                           // reproducible runs
)
```

- Token-bucket serialisation, per-frame delay = `bits / rate + overhead`, silent drops for loss, forced `closed` during disconnect windows.
- `LoraAirtime(sf, bwHz, cr, preambleSymbols, explicitHeader, crc)` implements the Semtech time-on-air formula. **Unit test:** for SF11, 250 kHz, CR 4/5, 16-symbol preamble, explicit header, CRC on, the airtime of a 100-byte payload is about 1.01 s and of a 237-byte payload about 2.03 s (values computed in the research doc; recheck against a LoRa airtime calculator and record the source in the test).
- Presets in the UI: `Unthrottled`, `300 bps satellite-message-like`, `LoRa LongFast model`, `Custom`.
- The emulator is visible in a clearly marked "Demo and test tools" area, never enabled silently, and every metric row records the emulator config in effect.

---

## 11. Bridge contract (`packages/bridge`)

One Capacitor plugin `ITantra`. TypeScript is the contract; Kotlin implements it. Validate every event with zod at the boundary.

```ts
export type TransportId = 'bluetooth' | 'wifiDirect' | 'nearby' | 'loraMeshtastic' | 'loopback';
export type Priority = 'routine' | 'urgent' | 'alert';

export interface ITantraPlugin {
  // lifecycle and permissions
  start(o: { deviceName: string }): Promise<void>;
  stop(): Promise<void>;
  getState(): Promise<EngineState>;
  checkPermissions(): Promise<PermissionState>;
  requestPermissions(o: { groups: PermissionGroup[] }): Promise<PermissionState>;

  // peers, pairing, link
  startDiscovery(o: { transports: TransportId[] }): Promise<void>;
  stopDiscovery(): Promise<void>;
  listPeers(): Promise<{ peers: Peer[] }>;
  beginPairing(o: { peerRef: string; method: 'sas' | 'qr' }): Promise<{ sessionId: string; sas?: string }>;
  confirmPairing(o: { sessionId: string; accepted: boolean }): Promise<void>;
  connect(o: { peerId: string; prefer?: TransportId }): Promise<void>;
  disconnect(o: { peerId: string }): Promise<void>;

  // talking
  beginTalk(o: { peerId: string; mode: 'ptt' | 'handsfree'; confirmBeforeSend: boolean; lang: string }): Promise<{ utteranceId: string }>;
  endTalk(o: { utteranceId: string }): Promise<void>;
  acceptReadback(o: { utteranceId: string; editedText?: string }): Promise<{ messageId: string }>;
  redoUtterance(o: { utteranceId: string }): Promise<void>;
  sendPresetAlert(o: { peerId?: string; presetId: number }): Promise<{ messageId: string }>;
  sendSpokenAlert(o: { peerId?: string }): Promise<{ utteranceId: string }>;
  acknowledgeAlert(o: { messageId: string }): Promise<void>;

  // data
  listMessages(o: { peerId: string; beforeMillis?: number; limit: number }): Promise<{ messages: Message[] }>;
  cancelMessage(o: { messageId: string }): Promise<void>;

  // packs
  listPacks(): Promise<{ packs: PackInfo[] }>;
  installPackFromFile(o: { uri: string }): Promise<void>;
  removePack(o: { packId: string }): Promise<void>;
  setActiveLanguage(o: { lang: string }): Promise<void>;

  // tools
  setEmulator(o: { config: EmulatorConfig | null }): Promise<void>;
  runSelfTest(o: { lang: string }): Promise<SelfTestResult>;
  exportMetrics(): Promise<{ uri: string }>;

  addListener(name: 'engineState', fn: (e: EngineState) => void): Promise<PluginListenerHandle>;
  addListener(name: 'peers', fn: (e: { peers: Peer[] }) => void): Promise<PluginListenerHandle>;
  addListener(name: 'link', fn: (e: LinkEvent) => void): Promise<PluginListenerHandle>;
  addListener(name: 'utterance', fn: (e: UtteranceEvent) => void): Promise<PluginListenerHandle>; // listening, transcribing
  addListener(name: 'readback', fn: (e: ReadbackEvent) => void): Promise<PluginListenerHandle>;   // text, words[{text, conf, low}], mustConfirm
  addListener(name: 'message', fn: (e: Message) => void): Promise<PluginListenerHandle>;
  addListener(name: 'alert', fn: (e: AlertEvent) => void): Promise<PluginListenerHandle>;
  addListener(name: 'packProgress', fn: (e: PackProgress) => void): Promise<PluginListenerHandle>;
}
```

`MockBridge` implements the same interface in the browser with seeded, scripted behaviour: fake peers, a readback with two low-confidence words, an incoming alert, a slow link, pack progress. The whole field UI and the Lab must run and be screenshot-tested against `MockBridge` with no device. `CapacitorBridge` is selected at runtime when `Capacitor.isNativePlatform()`.

---

## 12. Metrics and benchmarks

### 12.1 Per-message timeline (recorded natively, exported as CSV)

| Column | Meaning |
| --- | --- |
| `t_speech_end` | VAD endpoint or button release on A |
| `t_asr_done` | Recognition finished |
| `t_accept` | User accepted read-back (or auto for alerts) |
| `t_link_write` | First byte written to the link |
| `t_link_recv` | Frame fully received on B (B's clock) |
| `t_tts_first_audio` | First audio sample played on B (B's clock) |
| `t_ack` | ACK received on A |
| `bytes_frame`, `bytes_text`, `chars`, `words`, `lang`, `priority` | Sizes |
| `attempts`, `emulator_config` | Reliability and test conditions |

Cross-phone latency needs a clock offset. Estimate it with PING/PONG (assume symmetric delay, state that assumption) **and** validate on at least one run by recording both phones' audio on a laptop. The UI labels a single-device figure "round trip" and a two-device figure "estimated end to end".

### 12.2 Device metrics

Cold model load time, real-time factor per utterance, peak PSS memory (`Debug.getMemoryInfo`, not Java heap alone), thermal state over a ten-minute run, battery drain over a fixed 30-minute scenario measured on the device (adb battery stats), APK and pack sizes. Always report with the phone model and Android version.

### 12.3 Benchmark tools (`tools/bench`, Python, calls the Kotlin CLI for encoding)

| Command | Purpose | Output |
| --- | --- | --- |
| `bench size` | Bytes per sentence for UTF-8, script-aware, deflate, preset dictionary, codebook, on real transcripts (start with the research doc's corpus, then IndicVoices/FLEURS transcripts) | `results/size.csv` |
| `bench wer` | WER and CER per language and per condition, NFC-normalised, punctuation stripped (use `jiwer` or equivalent; also report script-normalised WER if useful) | `results/wer.csv` |
| `bench noise` | Mix clean speech with noise at 30, 20, 15, 10, 5, 0 dB SNR (check the noise dataset's licence) and rerun `wer` | `results/noise.csv` |
| `bench calibrate` | Choose confidence `tau` per language, report precision and share of wrong words flagged | pack manifest patch |
| `bench semantic` | C2 experiment: simulate a user who fixes only flagged words; compare policy A (no confidence) and B (confidence at several `tau`) on critical-word errors reaching the listener and on read-back burden | `results/semantic.csv` |
| `bench link` | C3 experiment: presets × loss {0, 5, 10, 20, 30}% × disconnect patterns, 100 messages each, compared with `reliability=off` | `results/link.csv` |

State in every result file: date, phone or machine, data set, sample count, and that noise is synthetic and speakers are not disaster-stressed. The C2 simulation uses an idealised user; a small human check is optional and must be described as such.

---

## 13. Phased task list (ordered by dependency; sizes are rough for one developer: S under a day, M one to three days, L three to seven; re-estimate after Phase 0)

Gates are hard stops: do not start the next phase until the gate's evidence is pasted in `TASKS.md`.

### Phase 0: Foundations

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T01 | Create monorepo (Section 4), pnpm workspace, Gradle project, CI running lint, typecheck, unit tests | CI green on an empty commit | S |
| T02 | Run version checks (3.3); choose min/target SDK; write device matrix | `DECISIONS.md` has outputs and phone models | S |
| T03 | **Human input:** paste official PS into `docs/PS_OFFICIAL.md`; build compliance matrix (requirement, source line, feature, status) | Every reported requirement in the research doc is confirmed, corrected or dropped | S |
| T04 | Create `AGENTS.md` (pointer + Section 0), `DECISIONS.md`, `OPEN_QUESTIONS.md`, `TASKS.md` | Files exist and are linked from README | S |
| T05 | Skeleton `docs/LICENSES.md` generator reading pack manifests | Runs on an empty pack list | S |

### Phase 1: Protocol core (pure Kotlin, no device)

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T10 | `core-protocol` module with JVM tests and a CLI jar (`encode`, `decode`, `size`) | `./gradlew :core-protocol:test` passes; CLI runs | S |
| T11 | Header codec (7.1) | Round-trip and bit-position tests | S |
| T12 | Script-aware coding (7.3) + golden vectors | Property test on random Indic strings passes; vectors file generated | M |
| T13 | Confidence bitmap (7.3) | Tests for 0, 1, 8, 9, 64 words | S |
| T14 | Stream framing (`FrameReader`) | Fuzz test: random and truncated bytes never throw uncaught exceptions | S |
| T15 | Handshake, AEAD, replay window with a fake key store | Tamper, replay and wrong-key tests reject; two in-memory peers exchange frames | M |
| T16 | Dedupe window, reorder buffer, retry scheduler with injected clock | Deterministic tests for loss, duplicate, out-of-order | M |
| T17 | Export vectors to `packages/vectors` | JSON committed with a checksum | S |
| T18 | `tools/bench size` on the research corpus, then on real transcripts | `results/size.csv` with corpus provenance | M |
| T19 | `packages/protocol-ts` port | Vitest passes on the same vectors | M |

**Gate G1:** T10–T19 done; size results exist and are described honestly (which corpus, how many sentences).

### Phase 2: UI, bridge contract, Capacitor shell

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T20 | Next.js app: static export, tokens (16.2), fonts (16.3), i18n dictionary hook, route groups | `pnpm build` produces `out/`; a token demo page renders in Day and Night | M |
| T21 | `packages/bridge`: types, zod schemas, `MockBridge`, `CapacitorBridge` selector | Type-checks; mock emits a scripted session | M |
| T22 | Components (16.5) with stories or a `/dev/components` page | Each renders every state in both themes | L |
| T23 | Screens S1–S9 (16.4) against `MockBridge` | Playwright walks Setup → Pair → Talk → Read-back → Send → Thread → Alert → Packs | L |
| T24 | Playwright screenshots (390 px, Day and Night) and axe checks | No serious axe violations; screenshots saved to `docs/shots/` | M |
| T25 | Capacitor Android shell loads `out/` on a phone; safe areas, back button, keep-awake | Screenshot from the phone in `docs/shots/device/` | M |
| T26 | Indic script test page `/dev/scripts` covering all ten scripts with conjunct-heavy samples | No clipped or missing glyphs on the target phones | S |

**Gate G2:** UI works in a browser with the mock and on a phone inside Capacitor.

### Phase 3: Transport and first real message

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T30 | `core-store` Room schema (Section 8) with migration tests | Instrumented or Robolectric test passes | M |
| T31 | Transport/Link interfaces, `LoopbackTransport` | Two engines exchange frames in a test | S |
| T32 | `BluetoothTransport` (pairing, RFCOMM, permissions) | Two phones connect and exchange bytes | L |
| T33 | `LinkManager` with heartbeat and reconnect | Kill Bluetooth on one phone; link recovers with backoff | M |
| T34 | Foreground service (microphone and connected-device types as required by the target SDK), notification, permission flow | Service survives screen off for 10 minutes | M |
| T35 | Capacitor plugin: start, discovery, pairing, connect, send test text, `message` and `link` events | Thread screen shows an encrypted message from the other phone | L |
| T36 | Manual two-phone protocol test written in `docs/DEMO.md` (steps, expected result) | Run and evidence pasted | S |

**Gate G3:** two phones exchange an authenticated TEXT frame and an ACK over Bluetooth. **Freeze protocol v1 now.**

### Phase 4: Speech on device

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T40 | Capture, pre-roll, VAD, endpointing | Log shows speech segments; no dropped frames in a 5-minute run | M |
| T41 | `AsrEngine` (sherpa-onnx, Hindi first) with RTF and PSS metrics | Transcribes a recorded Hindi sentence on the phone; numbers logged | L |
| T42 | Per-token confidence (implementation A or B, 9.2) | Words come back with confidence; dev-set dump written | L |
| T43 | `TtsEngine`, `PlaybackQueue`, fallback chain | Hindi and English sentences play; alert usage verified | M |
| T44 | Pack manifest loader, checksum verification, tokens validator | Corrupt pack disables one language and the app keeps running | M |
| T45 | Language qualification runs for Hindi and English (9.4) | Result tables committed; thresholds were set beforehand | M |

**Gate G4:** on-device recognition and speech output work for at least Hindi, with measured speed and memory.

### Phase 5: End to end with read-back

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T50 | Orchestrator: utterance → read-back → accept → encode → send | Spoken sentence appears as text on the other phone | L |
| T51 | Receive path → TTS → playback | Other phone speaks it | M |
| T52 | Read-back UI wiring, edit-word sheet, "say again" | Playwright (mock) and manual device pass | M |
| T53 | Critical-token guard (digits + lexicon) | Digit sentence forces confirmation in hands-free mode | M |
| T54 | Unclear-word cue at receiver | Flagged words show wavy underline and earcon plays | S |
| T55 | Metrics timeline (12.1) and CSV export | File opens with all columns filled for 20 messages | M |
| T56 | PING/PONG RTT and clock-offset estimate | UI labels "round trip" or "estimated end to end" correctly | S |

**Gate G5:** push-to-talk A → B works end to end with read-back and confidence, and a metrics CSV exists.

### Phase 6: Reliability, alerts, emulator

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T60 | Outbox state machine, retry, TTL | Airplane-mode receiver: message waits, then delivers on return | L |
| T61 | ACK with selective bitmap | Lost ACK causes retry but no duplicate playback | M |
| T62 | Dedupe, reorder wait, missed-message cue, stale limit | Test scenarios from 7.5 pass | M |
| T63 | Alert player: alarm usage, volume raise and restore, repeat until human ACK | Verified on two phone models; document any OEM that blocks it | M |
| T64 | Preset codebook alerts with native-speaker review flags | Alert plays in receiver's language with no recognition step | M |
| T65 | `EmulatedLink`, `LoraAirtime` unit tests (10.4) | Airtime tests match the recorded values; emulator UI works | M |
| T66 | `bench link` sweeps with invariants | 0 duplicate deliveries and 0 order violations across all runs; results file committed | M |

**Gate G6:** invariants hold under loss and disconnection; alerts behave as specified.

### Phase 7: Wi-Fi Direct

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T70 | `WifiDirectTransport` | Two phones exchange frames without a router | L |
| T71 | Link switching Wi-Fi Direct ↔ Bluetooth | Unplug one; traffic continues on the other | M |
| T72 | Repeat T36, T60–T62 on Wi-Fi Direct | Same results | M |
| T73 | Document OEM quirks found | `DECISIONS.md` section | S |

### Phase 8: Packs and languages

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T80 | `tools/packs` builder (convert, quantise, checksum, manifest, licence class) | One pack built from scratch and installed | L |
| T81 | Install from file | Pack installed without rebuilding the app | M |
| T82 | Peer pack share over Wi-Fi Direct with resume | Interrupted transfer resumes from offset | L |
| T83 | Qualify remaining languages (9.4) | Every language marked verified or experimental with evidence | L |
| T84 | Status labels and licence banners in UI | Non-commercial voice shows a banner | S |

**Gate G8:** at least three languages qualified and documented.

### Phase 9: Lab and benchmarks

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T90 | Lab routes with CSV/JSON import | Loads all files in `results/` | M |
| T91 | Charts (16.6): size bars with audio comparison, accuracy tables and SNR curves, latency waterfall, link delivery | Screenshots for slides | L |
| T92 | Run `size`, `wer`, `noise`, commit results with provenance | Files present with date, device, dataset, n | L |
| T93 | `calibrate` and `semantic` (C2) | `semantic.csv` shows the trade-off curve | L |
| T94 | Device metrics runs: load time, RTF, PSS, thermal, 30-minute battery | Table per phone model | M |

**Gate G9:** every number planned for the slides exists in a results file.

### Phase 10: Demo and hardening

| ID | Task | Acceptance | Size |
| --- | --- | --- | --- |
| T100 | Demo mode script and rehearsal (Section 14) | Full run recorded, no manual fixes | M |
| T101 | Export chart SVG/PNG for PPT | Files in `docs/slides/` | S |
| T102 | Failure paths: permission denied, Bluetooth off, low storage, model load failure, airplane mode | Each shows a specific message (16.7) | M |
| T103 | README, generated `LICENSES.md`, known limitations page | Reviewed by a human | S |

Stretch (only after G9): T110 LoRa bridge through Meshtastic AIDL with two boards; T111 multi-hop relay with hop limit and dedupe; T112 automatic language ID; T113 translation; T114 Hindi UI strings.

---

## 14. Demo plan (scenarios to show, each with evidence)

| # | Scenario | Setup | Show | Evidence to capture |
| --- | --- | --- | --- | --- |
| 1 | Normal | Two phones, Bluetooth | Speak, read-back, send, hear it | Screen recording, metrics row |
| 2 | Very low bandwidth | Emulator: 300 bps and LoRa LongFast model | Same message; Packet strip beside the equivalent audio size; time on the emulated link | `link.csv` row, screenshot of strip |
| 3 | No internet | Airplane mode with Bluetooth or Wi-Fi Direct enabled | Everything still works | Screenshot of airplane mode |
| 4 | Device to device | Bluetooth, then Wi-Fi Direct | Link chip shows the transport; switch between them | Recording |
| 5 | Receiver unavailable | Turn receiver's Bluetooth off | Sender shows "Waiting for link" | Screenshot |
| 6 | Store and forward | Send three messages while receiver is away | Outbox holds them; states visible | Thread screenshot |
| 7 | Connection restored | Turn receiver back on | Delivered in priority then age order, no duplicates | Recording, dedupe count |
| 8 | Multiple languages | Verified languages only | Switch language mid-session; receiver voice follows | Recording |
| 9 | Emergency | Preset SOS, then spoken alert | Full-screen takeover, loud repeat until "I've seen this", volume restored | Recording; note any phone that blocked the override |
| 10 | Uncertain recognition | Speak a sentence with a digit in noise | Wavy-underlined words, forced confirmation, correction | Recording, readback log |

---

## 15. Claims we must not make (enforced in UI copy, README and slides)

- "Improves accuracy" or any WER/CER without a `wer.csv` row for that language, device and condition.
- "Supports all ten languages" unless all ten are `verified`; otherwise say how many are verified and which are experimental.
- "98% smaller than audio" without saying the baseline; against Codec2 700C the measured reduction is lower (see research doc, section 6).
- "Works without internet" if the Wi-Fi socket path needs the INTERNET permission declared: say "makes no internet connections" only after verifying in airplane mode.
- Zero latency, real-time voice, or "as fast as a call". Report measured, labelled latency.
- Range in metres, mesh, or multi-hop, unless tested.
- Perfect or human-level recognition, or that errors cannot happen.
- Universal offline translation. The core has no translation.
- Security beyond what Section 7.4 states; never "military-grade" or "unhackable".
- That Google, WhatsApp, Bhashini or existing apps lack a feature they have (Pixel offline Live Translate exists; Briar and Meshtastic work offline).
- Battery life or thermal figures not measured on the named phone.
- Real-disaster or field validation.
- That an alert always overrides silent mode on every phone.
- That synthetic-noise results represent real noisy environments.

---

## 16. UI and design system

### 16.1 Design brief

- **Subject:** an emergency and field voice link for people who may be stressed, wearing gloves, in bright sun or at night, and who may not read easily. Voice is the point; text is the safety net.
- **Primary job:** speak, confirm what will be sent, and know it arrived.
- **Direction:** an instrument, not an app. Calm, high-contrast, large, plain. Boldness is spent in exactly one place: the **read-back line**, a large sentence whose words carry their confidence. Everything else stays quiet.
- **Avoid:** cream-and-terracotta, black with a neon accent, identical rounded cards with soft shadows, all-caps labels above everything, gradient washes, entrance animations, decorative numbering.

### 16.2 Tokens (`styles/tokens.css`, exposed to Tailwind through CSS variables)

Contrast ratios below are rough hand calculations; verify every pair with a contrast tool and adjust before shipping.

| Token | Day | Night | Use |
| --- | --- | --- | --- |
| `--chalk` (background) | `#EEF1F0` | `#0F1A22` | Page |
| `--vellum` (surface) | `#FAFBFA` | `#172631` | Sheets, bubbles |
| `--ink` | `#13232F` | `#E6EDF0` | Text |
| `--slate` | `#566571` | `#9AAAB4` | Secondary text (about 5:1 on Chalk in Day) |
| `--rule` | `#C9D1D5` | `#2B3B47` | Borders, 1.5 px |
| `--ultramarine` | `#2A3FD0` | `#8FA0FF` | Primary actions, focus ring (about 7.7:1 on white in Day) |
| `--ultramarine-tint` | `#E1E5FB` | `#232F6B` | Selected, active |
| `--beacon` | `#D42A1F` | `#FF6B5E` | Alerts and destructive actions only |
| `--beacon-tint` | `#FBE3E1` | `#4A1F1C` | Alert backgrounds |
| `--amber-ink` / `--amber` | `#8A5A00` / `#F3B43F` | `#F3B43F` / `#6B4A10` | Uncertain words, emulator ribbon |
| `--lichen` | `#2C7548` | `#6FD08F` | Delivered, verified |

Shape and spacing: 4-pt grid; radius 12 for controls, 20 for sheets, full circle for the talk button; borders 1.5 px `--rule`; no drop shadows (sheets are separated by border and scrim); minimum touch target 48 px, primary controls 56 px or larger, talk button 112 px.

Themes: Day, Night, Auto (follows system). Night is a real requirement for field use, not a novelty.

### 16.3 Typography

- **Interface:** Atkinson Hyperlegible Next (confirm it is available through `next/font/google`; otherwise Atkinson Hyperlegible), self-hosted at build so nothing loads from the network at runtime. One family, weights 400 and 700.
- **Indian scripts:** Noto Sans for each script used (Devanagari for Hindi and Marathi, Bengali, Gujarati, Kannada, Malayalam, Odia, Tamil, Telugu), subsetted and self-hosted. Apply by `lang` attribute so the right face and line height are used.
- **Scale (px):** 13 / 15 / 17 / 20 / 26 / 34 / 48. Read-back text 28–34. Latin line height 1.45; Indic scripts 1.7 or more (tall stacked conjuncts clip at tighter values).
- Tabular figures for every counter. No all-caps. Sentence case everywhere. Monospace only for the hex byte view in the Lab.
- Text size follows the system font scale; the layout must survive 200%.

### 16.4 Screens

Use route groups `app/(field)/…` and `app/(lab)/…`. No dynamic segments (static export): pass the peer as `?peer=<id>`.

| ID | Screen | Purpose and behaviour |
| --- | --- | --- |
| S1 | Setup | A real sequence of three steps: permissions (microphone, nearby devices/Bluetooth, notifications, optional Do Not Disturb access for alerts), language packs, device name. Each step explains why in one sentence and can be resumed. |
| S2 | Peers and pairing | Nearby and paired phones with state text. Pairing sheet shows the 6-digit code in large type, "Both phones show the same code" and two buttons: "Codes match" / "Codes differ". Optional QR path. |
| S3 | Talk (home) | Link chip, language selector, last two messages, read-back area, talk button, SOS. Details in 16.5. |
| S4 | Read-back sheet | States: listening (level bar), reading (progress), ready (read-back line + Send / Say again), editing a word, sending, sent. Confirmation is skipped for presets; for spoken text it follows the setting, and is forced when a critical word is uncertain. |
| S5 | Thread | Messages with delivery state as icon plus text: Waiting for link, Sent, Delivered, Played, Expired, Cancelled. Incoming: Played, Shown only (older than the stale limit), Missing message before this. Tap a message for the Packet strip and timings. |
| S6 | Alerts | Composer: press and hold SOS for 1.5 s (ring fills, haptic on start and send); preset grid of tiles with icon and local-language text; spoken alert. Receive takeover: full screen in Beacon colours, alert text in the receiver's language, "I've seen this" button at least 72 px, sound repeating until pressed. After acknowledgement, a quiet banner remains in the thread. |
| S7 | Link and test tools | Transport list with state, round-trip time, bytes sent and received. Emulator panel: presets, rate, loss, jitter, "Drop link for 10 seconds". A persistent Amber ribbon reads "Link emulator on: <preset>" whenever active. |
| S8 | Packs | One card per language: status chip (Verified, Experimental, Not installed), size, licence chip (a non-commercial voice is called out in words), actions (Install from file, Get from nearby phone, Remove, Run self-test with the measured result). |
| S9 | Settings and About | Confirm before send, hands-free mode, stale limit, keep history, theme, text size, licences (generated), known limitations page. |
| L1–L4 | Lab: Size, Accuracy, Latency, Link | See 16.6. Responsive up to 1280 px; usable on the phone. |

### 16.5 Components

| Component | Key props and states | Notes |
| --- | --- | --- |
| `PttButton` | `state: idle | listening | processing | disabled`, `level` | 112 px circle; ring follows input level; haptic on press and release; disabled state says why in text beneath |
| `ReadbackLine` | `words: {text, conf, low, critical}[]`, `onEditWord`, `mustConfirm` | The hero. Text 28–34 px in the message's script. Confident words plain; uncertain words get a wavy Amber underline; critical uncertain words also get a solid marker before the word. Never colour alone. Tap a word to edit. |
| `WordToken` | `low`, `critical`, `selected` | Minimum 44 px tap area even for short words |
| `LinkChip` | `transport`, `state`, `peerName`, `rttMs` | Text and icon: "Bluetooth · connected", "Wi-Fi Direct · reconnecting", "No link" |
| `MessageBubble` | `direction`, `state`, `lang`, `priority` | Delivery state icon plus label; alert bubbles carry a Beacon edge and the word "Alert" |
| `PacketStrip` | `headerBytes`, `payloadBytes`, `tagBytes`, `audioEquivalents[]` | Proportional segmented bar for the real frame, with thin comparison bars for equivalent audio sizes on a stated scale; values come only from real messages or result files |
| `AlertTakeover` | `text`, `lang`, `onAcknowledge` | Full screen; keeps screen on; focus trapped |
| `PackCard` | `status`, `licenseClass`, `progress` | Non-commercial banner text is literal, not an icon |
| `EmulatorPanel` | `config`, `onChange`, `onDrop` | Clearly labelled test tool |
| `StatTile` | `label`, `value`, `unit`, `source` | Always shows its source file and sample count; refuses to render a value without one |
| `Sheet`, `Dialog`, `Tabs`, `Toggle` | Radix primitives with own styling | Focus management from the primitives |

### 16.6 Talk screen and Lab wireframes

```text
Talk (390 x 844)
┌────────────────────────────────┐
│ Bluetooth · connected    हिन्दी ▾│  link chip, language
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ पानी बढ़ रहा है, नाव भेजिए  │ │  latest heard message
│ │ Played                     │ │
│ └────────────────────────────┘ │
│                                │
│  नदी का ~~पानी~~ तेजी से बढ़    │  read-back line (hero); wavy = unsure
│  रहा है                         │
│  [    Send    ]  [ Say again ] │
│                                │
│         (   Hold to   )        │  talk button, 112 px
│         (     talk    )        │
│  [ SOS ]                  [⋯]  │
└────────────────────────────────┘

Lab: Size (1024 wide)
┌───────────────────────────────────────────────────────────┐
│ Bytes per sentence   source: results/size.csv  n = …       │
│ Hindi    ▇▇▇▇▇▇▇▇▇▇ UTF-8   ▇▇▇▇ script-aware  ▇▇▇ +dict    │
│ Tamil    ▇▇▇▇▇▇▇▇▇▇▇▇▇▇ …                                  │
│ Same speech as audio: Codec2 700C ▏ Opus 6 kbps ▏▏▏ (log)   │
└───────────────────────────────────────────────────────────┘
```

Lab charts: **Size** (grouped bars per language for each encoding, with an audio comparison on a labelled log axis); **Accuracy** (table of WER and CER per language and condition, line chart over SNR); **Latency** (stacked waterfall of medians per stage plus a p50/p95 table); **Link** (delivery rate against loss for reliable versus fire-and-forget per preset, and time to deliver). Every chart shows its source file and sample size, and a `sample data` ribbon when fixtures are loaded.

### 16.7 Copy rules

Plain verbs, sentence case, no filler. A button says exactly what it does and the same word appears in the confirmation. Errors say what happened and what to do, and never apologise.

| Situation | Text |
| --- | --- |
| Bluetooth off | "Bluetooth is off. Turn it on to reach Ravi's phone." |
| Receiver away | "Waiting for link. This message will send when Ravi's phone is back in range." |
| Expired | "This message expired before it could be delivered. Send it again." |
| Missing voice | "The Tamil voice is not installed. Messages in Tamil will show as text until you install it in Packs." |
| Uncertain words | "Check the underlined words before sending." |
| Emulator on | "Link emulator on: LoRa LongFast model" |
| Alert received | "Alert from Ravi" with the alert text; button "I've seen this" |

### 16.8 Interaction and motion

Motion only answers an action: talk-ring level, sheet slide (150–200 ms), delivery icon change. No entrance animations, no hover flourishes. Respect reduced motion. Haptics on press, on SOS hold start, and on send. Keep the screen awake on Talk and on alert takeover (native keep-awake, verify the plugin).

### 16.9 Accessibility floor

TalkBack labels for every control and state; focus ring 3 px `--ultramarine`; no information by colour alone; text scaling to 200%; contrast verified with a tool; alert takeover announces its text; every gesture has a button alternative (press-and-hold SOS also offers a two-step confirm mode in Settings).

### 16.10 Next.js implementation notes

- `next.config`: `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`. No API routes, no runtime server features.
- Pages that use the bridge are client components; the bridge initialises once in a provider and never during server rendering.
- `Capacitor` imports are guarded so `pnpm dev` in a plain browser uses `MockBridge`.
- Handle `env(safe-area-inset-*)`, `viewport-fit=cover`, and the Android back button (Capacitor App plugin; verify API).
- Fonts through `next/font`, self-hosted; verify the exported build makes no network requests (check with the browser network panel and a device in airplane mode).
- i18n: a small typed dictionary and hook (English first; Hindi as stretch). Do not add a server-dependent i18n router.

---

## 17. Testing strategy

| Layer | Tooling | What it proves |
| --- | --- | --- |
| Protocol | JUnit, property tests, shared JSON vectors, fuzz | Codec, script coding, framing, crypto, dedupe, reorder, retry |
| Native components | JUnit with fakes; instrumented tests on device | Room, transport lifecycle, foreground service |
| TypeScript | Vitest, Testing Library, zod schema tests | Store, bridge validation, components |
| UI flows | Playwright against `MockBridge`, screenshots at 390 px in Day and Night, axe accessibility | Screens, states, copy |
| Two-phone | Written manual protocol in `docs/DEMO.md` with evidence | Gates G3, G5, G6, G7 |
| Benchmarks | `tools/bench` | Contributions C1, C2, C3 |

Invariants to test forever: no duplicate playback, per-sender order preserved, alerts never wait behind routine messages, a corrupt frame never crashes the service, a bad pack disables only its language, volume is restored after an alert.

---

## 18. Risks and first mitigations

| Risk | Impact | First mitigation |
| --- | --- | --- |
| Official PS differs from the reported requirements | Wrong scope | T03 before any feature work |
| Recognition too slow or too large on the target phones | Latency and efficiency criteria | Qualification runs (T41, T45) early; per-language models; measure before promising |
| Per-token probabilities not exposed | C2 blocked | Own ONNX Runtime decoder (implementation B) |
| Native abort from a bad model file | Lost days | Validate tokens in Kotlin; reproduce on desktop first (Section 0, rule 10) |
| TTS coverage or licences for some languages | Fewer languages | Mark experimental; non-commercial banner; fallback chain |
| Wi-Fi Direct behaves differently across phone makers | Flaky demo | Bluetooth first; log every stage; keep a Bluetooth fallback |
| WebView bridge complexity or lag | UI feels slow | Keep audio and timers native; UI only renders events |
| Indic text clipping or missing glyphs in the WebView | Unreadable UI | T26 early on real phones |
| Foreground-service and permission rules on newer Android | Service killed | Declare correct service types; test with screen off (T34) |
| Alert override blocked by a phone's Do Not Disturb policy | Alert not loud | Ask for the policy access in Setup; document per-phone results; never overclaim |
| Overpromising ten languages | Credibility | Verified/experimental labels driven by data |
| Too many stretch goals | Core unfinished | Nothing from the stretch list before Gate G9 |

---

## Appendix A: Android permissions and manifest checklist (verify each against the target SDK)

Microphone; Bluetooth connect, scan, advertise (Android 12 and later); nearby Wi-Fi devices (Android 13 and later, declared not for location if that holds); fine location on older Android where Bluetooth or Wi-Fi Direct discovery still requires it; notifications (Android 13 and later); foreground service with microphone and connected-device types and their matching permissions (Android 14 and later); audio settings modification; notification-policy access as an optional user grant for alerts; full-screen intent for the alert takeover if used. Record each permission, why it is needed and how the app behaves when it is denied.

## Appendix B: Model and data sources to evaluate (licences and exact files must be verified by the agent before use)

| Need | Candidate | Notes from research |
| --- | --- | --- |
| ASR per language | AI4Bharat IndicConformer hybrid CTC-RNNT per-language models; third-party int8 CTC ONNX exports for eight languages | About 140 MB each in one export; MIT on model cards, one team says Apache-2.0: check |
| ASR reference (edge laptop only) | IndicConformer 600M multilingual | About 2.5 GB RAM even in int8 in one third-party build |
| TTS | Piper voices (Hindi, Telugu, Bengali, Marathi, Malayalam, Nepali, Urdu, English); int8 builds around 21 MB reported | Each voice has its own dataset licence |
| TTS for other languages | Meta MMS-TTS (CC-BY-NC 4.0); AI4Bharat VITS (listed MIT; check dataset licence and export) | Non-commercial banner for MMS |
| Runtime | sherpa-onnx | Vendor one release; record tag |
| Test data | FLEURS (reported CC-BY-4.0), IndicVoices (check access terms and test-set availability) | Record provenance per corpus |
| Noise | A public noise corpus with a permissive licence | Check licence before mixing |
| Codec baselines | Codec2, Opus, Lyra V2 | For size comparison only |
