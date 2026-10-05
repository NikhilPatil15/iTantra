# Demo plan

Ten scenarios from plan Section 14, each with the evidence to capture. None of the device
scenarios can be rehearsed until target phones exist (Q2) and the APK is built (Q6).

| # | Scenario | Setup | Show | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Normal | Two phones, Bluetooth | speak, read-back, send, hear it | recording + metrics row |
| 2 | Very low bandwidth | emulator 300 bps and LoRa LongFast | packet strip vs audio size, time on link | `link.csv` row, screenshot |
| 3 | No internet | airplane mode + Bluetooth/Wi-Fi Direct | everything still works | airplane-mode screenshot |
| 4 | Device to device | Bluetooth then Wi-Fi Direct | link chip transport switch | recording |
| 5 | Receiver unavailable | receiver Bluetooth off | "Waiting for link" | screenshot |
| 6 | Store and forward | send three while receiver away | outbox holds them | thread screenshot |
| 7 | Connection restored | receiver back on | delivered by priority then age, no duplicates | recording + dedupe count |
| 8 | Multiple languages | verified languages only | switch language mid-session | recording |
| 9 | Emergency | preset SOS then spoken alert | full-screen takeover, loud repeat until "I've seen this", volume restored | recording + per-phone notes |
| 10 | Uncertain recognition | digit in noise | wavy underline, forced confirmation, correction | recording + readback log |

## Manual two-phone protocol test (plan T36, Gates G3/G5)

Run this when two Android phones are available. It produces the evidence for Gate G3 (authenticated
TEXT + ACK) and G5 (push-to-talk with read-back).

### Build and install

```bash
cd apps/mobile
ITANTRA_OFFLINE=1 npx expo prebuild --clean --platform android --no-install
cd android
JAVA_HOME=<jdk17> ANDROID_HOME=$HOME/android-sdk ./gradlew :app:assembleRelease \
  -PreactNativeArchitectures=arm64-v8a -x lintVitalRelease
adb install -r app/build/outputs/apk/release/app-release.apk   # on each phone
```

### Quick smoke test before the full flow

Open **More → Native module spike** (`/dev`) on both phones. On A tap **Start server**. On B tap
**Connect to &lt;first paired device&gt;** (pair the phones in Android Settings first), then **Send
test frame over Bluetooth**. A should log an inbound `message` event / show it in Thread. This
proves the RFCOMM link and the engine wiring before the full demo.

### Steps (record the screen on each phone)

1. **Setup** — grant microphone, Bluetooth, nearby-devices and notifications on both phones. Give
   each a device name. Confirm the engine reports *running*.
2. **Pair** — on phone A open Peers, scan, tap Pair on phone B. Both show the same 6-digit code;
   tap "Codes match" on both. Repeat so both phones have the other pinned.
3. **Connect** — tap Connect. The Talk screen link chip must read `Bluetooth · connected` with an
   RTT. (If Wi-Fi Direct connects instead, the chip reads `Wi-Fi Direct`.)
4. **Talk** — hold the talk button on A and say "नदी का पानी बढ़ रहा है". Release. The read-back
   appears with amber-underlined low-confidence words and "Check the underlined words before
   sending." Tap **Send**.
5. **Receive** — on B the message appears in Thread as *Played*; the phone speaks it. The link chip
   on A flips to *Delivered* when the ACK returns.
6. **Alert** — on A send SOS. B takes over the full screen in beacon colours and repeats until
   "I've seen this" is tapped; volume returns after acknowledgement.
7. **Store and forward** — turn B's Bluetooth off, send three messages from A (they read *Waiting
   for link*), then turn B on. They deliver in priority-then-age order with no duplicate playback.
8. **Narrow link** — in More enable the `1 kbps` emulator and repeat step 4. The message still
   arrives; the timestamp gap is the serialised airtime.
9. **Offline** — enable airplane mode on both, then Bluetooth only, and repeat step 4. It must
   still work.

### Evidence to paste here

- `adb shell dumpsys package dev.itantra.app | grep -A2 permission` showing no INTERNET.
- A metrics CSV exported from the app (per-message timeline).
- The screen recordings and a note of any phone that blocked the alert override.

Paste the date, both phone models, Android versions, and the observed result. If a step fails,
record it here rather than on a slide.
