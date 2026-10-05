# Official problem statement (SIH26173)

> **Status: awaiting Q1.** The official portal text has not been pasted in yet. Everything below
> is marked `reported`: it comes from third-party team repositories quoting the PS, per plan
> Section 2.4. Do not treat it as confirmed until the official text is pasted above this line.

## Reported problem statement (unverified)

`reported` Design an offline, on-device, device-to-device voice communication system for
Indian-language speakers in areas with no network connectivity, using speech recognition and
speech synthesis locally on the phone with no internet dependency.

## Reported expected outcomes (unverified)

`reported` On-device speech-to-text and text-to-speech for Indian languages; peer-to-peer
transport without internet; works with no SIM; suitable for emergency/disaster communication.

## Compliance matrix

| # | Requirement (reported) | Source | Feature in this repo | Status |
| --- | --- | --- | --- | --- |
| R1 | On-device speech recognition, Indian languages | PS | `core-speech` ASR interfaces, VAD, packs, scripted fake | Interface + fake built; real model blocked (Q7) |
| R2 | On-device speech synthesis | PS | `core-speech` TTS interface + fake, pack model | Interface + fake built; real voice blocked (Q7) |
| R3 | No internet at runtime | PS | offline build strips INTERNET (`tools:node="remove"`) | Verified: release APK has 0 INTERNET; runtime check on phone pending |
| R4 | Device-to-device transport | PS | `BluetoothTransport` (RFCOMM), `WifiDirectTransport` (P2P+TCP) | Implemented, compiled into APK; two-phone run pending |
| R5 | Works without SIM | PS | no telephony permissions used | Confirmed in the manifest |
| R6 | Emergency alerts | inferred | preset codebook + alert player + alert UI | Implemented and tested (codebook, outbox priority, alert UI) |

When Q1 is answered: replace the reported text, re-check every row, and mark each requirement
`confirmed`, `corrected` or `dropped` (plan T03 acceptance).
