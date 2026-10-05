# References

Primary sources, research papers, models, datasets and standards behind iTantra (SIH26173).
A Word/PDF version with clickable links is at `docs/iTantra_References_and_Research.docx` and
`docs/iTantra_References_and_Research.pdf` (and in the workspace root). Open every link before
citing it on a slide.

## Local source documents

| Document | Location |
| --- | --- |
| Research, gap analysis and build plan | `SIH26173 iTantra research, gap analysis and build plan-1.pdf` (workspace root) |
| Agent development plan | `ITANTRA_AGENT_PLAN.md` (workspace root) |
| Implementation status / decisions / blockers | `README.md`, `TASKS.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md` |
| Protocol / packs / metrics / licences / demo | `docs/PROTOCOL.md`, `docs/PACKS.md`, `docs/METRICS.md`, `docs/LICENSES.md`, `docs/DEMO.md` |
| Measured results | `tools/bench/results/*.csv` |

## Research papers (links verified)

| Paper | Link |
| --- | --- |
| Polyak et al., Speech Resynthesis from Discrete Disentangled Self-Supervised Representations (Interspeech 2021) | https://arxiv.org/abs/2104.00355 |
| Pratap et al., Scaling Speech Technology to 1,000+ Languages (MMS) | https://arxiv.org/abs/2305.13516 |
| Javed et al., IndicVoices (ACL Findings 2024) | https://arxiv.org/abs/2403.01926 |
| Sankar et al., IndicVoices-R (NeurIPS 2024) | https://arxiv.org/abs/2409.05356 |
| Gala et al., IndicTrans2 (TMLR 2023) | https://arxiv.org/abs/2305.16307 |
| Leschanowsky et al., SITool codec intelligibility (Interspeech 2025) | https://arxiv.org/abs/2506.01731 |
| Gulati et al., Conformer | https://arxiv.org/abs/2005.08100 |
| Kim et al., VITS | https://arxiv.org/abs/2106.06103 |
| Radford et al., Whisper | https://arxiv.org/abs/2212.04356 |
| Conneau et al., FLEURS | https://arxiv.org/abs/2205.12446 |
| Hsu et al., HuBERT | https://arxiv.org/abs/2106.07447 |
| Baevski et al., wav2vec 2.0 | https://arxiv.org/abs/2006.11477 |

## Papers cited inside the research PDF (verify before citing)

| Work | Link |
| --- | --- |
| STCTS (text + sparse prosody ~80 bps) | https://arxiv.org/abs/2512.00451 |
| Collette, Greenwood, Nicoll (semantic compression) | https://arxiv.org/abs/2509.15462 |
| LMCodec2 (sub-1 kbps, Beidou short messages) | ScienceDirect 2024 |
| BhasaAnuvaad | https://arxiv.org/abs/2411.04699 |
| Rasmalai / Indic Parler-TTS | https://arxiv.org/abs/2505.18609 |
| On-device streaming ASR with quantization | https://arxiv.org/abs/2604.14493 |
| SN-WER (script-normalized WER) | https://arxiv.org/abs/2606.02548 |

## Models, runtimes and tools

| Item | Link |
| --- | --- |
| AI4Bharat IndicConformer (per language) | https://huggingface.co/ai4bharat/indicconformer_stt_hi_hybrid_ctc_rnnt_large |
| AI4Bharat IndicConformer-600M multilingual | https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual |
| Piper (VITS) voices | https://github.com/rhasspy/piper |
| sherpa-onnx (VAD/ASR/TTS runtime) | https://github.com/k2-fsa/sherpa-onnx |
| Silero VAD | https://github.com/snakers4/silero-vad |
| Meta MMS-TTS | https://arxiv.org/abs/2305.13516 |
| AI4Bharat models | https://ai4bharat.iitm.ac.in/ |
| Google Tink | https://github.com/tink-crypto/tink-java |
| Protocol Buffers | https://protobuf.dev/ |

## Datasets

| Dataset | Link |
| --- | --- |
| FLEURS (reported CC-BY-4.0) | https://arxiv.org/abs/2205.12446 |
| IndicVoices | https://arxiv.org/abs/2403.01926 |
| IndicVoices-R | https://arxiv.org/abs/2409.05356 |
| Mozilla Common Voice | https://commonvoice.mozilla.org/ |

## Communication standards

| Topic | Link |
| --- | --- |
| Bundle Protocol v7 (RFC 9171) | https://www.rfc-editor.org/rfc/rfc9171.html |
| Opus (RFC 6716) | https://www.rfc-editor.org/rfc/rfc6716.html |
| Codec2 | https://github.com/drowe67/codec2 |
| Lyra V2 | https://github.com/google/lyra |
| ChaCha20-Poly1305 (RFC 8439) | https://www.rfc-editor.org/rfc/rfc8439.html |
| Ed25519 (RFC 8032) | https://www.rfc-editor.org/rfc/rfc8032.html |
| X25519 (RFC 7748) | https://www.rfc-editor.org/rfc/rfc7748.html |
| HKDF (RFC 5869) | https://www.rfc-editor.org/rfc/rfc5869.html |
| Bluetooth RFCOMM (Android) | https://developer.android.com/reference/android/bluetooth/BluetoothSocket |
| Wi-Fi Direct / Wi-Fi P2P (Android) | https://developer.android.com/develop/connectivity/wifi/wifip2p |
| Nearby Connections | https://developers.google.com/nearby/connections/overview |
| Foreground service types (Android 14+) | https://developer.android.com/develop/background-work/services/fgs/service-types |
| Meshtastic (LoRa) | https://meshtastic.org/ |

## Existing systems / prior art

| System | Link |
| --- | --- |
| Google Translate offline (Live Translate) | https://support.google.com/translate/ |
| Bhashini | https://bhashini.gov.in/ |
| Briar | https://briarproject.org/ |
| Meshtastic + ATAK plugin | https://meshtastic.org/ |
| Codec 2 / FreeDV | https://github.com/drowe67/codec2 |
| SIH official portal | https://sih.gov.in/ |

## What not to claim

See the research PDF section 16 and `docs/PS_OFFICIAL.md`. In short: no WER/CER without a results
row, no "all ten languages" unless verified, no "no internet" until the release manifest is
checked, no range/mesh/multi-hop claims, no perfect recognition, no translation, no security
beyond the stated handshake, no real-disaster validation.
