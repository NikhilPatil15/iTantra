# Metrics

Plan Section 12. Every claimed number comes from one of these files.

## Per-message timeline (CSV from the engine)

| Column | Meaning |
| --- | --- |
| `t_speech_end` | VAD endpoint or button release on A |
| `t_asr_done` | recognition finished |
| `t_accept` | user accepted read-back |
| `t_link_write` | first byte written to the link |
| `t_link_recv` | frame fully received on B |
| `t_tts_first_audio` | first audio sample played on B |
| `t_ack` | ACK received on A |
| `bytes_frame`, `bytes_text`, `chars`, `words`, `lang`, `priority` | sizes |
| `attempts`, `emulator_config` | reliability and test conditions |

Cross-phone latency needs a clock offset estimated with PING/PONG (symmetric-delay assumption),
and validated on one run by recording both phones on a laptop. The UI labels a one-device figure
"round trip" and a two-device figure "estimated end to end".

## Device metrics

Cold model load time, real-time factor, peak PSS memory (`Debug.getMemoryInfo`), thermal state over
ten minutes, battery drain over a fixed 30-minute scenario, APK and pack sizes. Always reported
with the phone model and Android version.

## Benchmark tools (`tools/bench`)

| Command | Output |
| --- | --- |
| `size` | `results/size.csv` |
| `wer` | `results/wer.csv` |
| `noise` | `results/noise.csv` |
| `calibrate` | pack manifest patch |
| `semantic` | `results/semantic.csv` |
| `link` | `results/link.csv` |

Every result file states date, machine, dataset, sample count, and that noise is synthetic and
speakers are not disaster-stressed.
