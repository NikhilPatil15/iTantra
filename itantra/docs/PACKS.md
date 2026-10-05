# Packs

A pack is one language's on-device speech assets plus metadata. Packs install from a file or
from a nearby phone; adding a language never requires rebuilding the app.

## Manifest — `files/packs/<lang>/pack.json`

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
    "files": [{ "name": "model.int8.onnx", "sha256": "…", "bytes": 0 }],
    "sampleRate": 16000,
    "confidence": { "tau": null, "calibratedOn": null, "precision": null },
    "license": "MIT",
    "licenseClass": "permissive",
    "source": "URL of the exact file"
  },
  "tts": {
    "engine": "sherpa-vits-piper",
    "files": [{ "name": "voice.onnx", "sha256": "…", "bytes": 0 }],
    "sampleRate": 22050,
    "digitsNeedExpansion": null,
    "license": "…",
    "licenseClass": "permissive | share-alike | non-commercial",
    "source": "URL"
  },
  "codebook": "codebook.hi.json",
  "critical": "critical.hi.json",
  "selfTest": { "text": "…", "maxWer": null }
}
```

## Rules

- `tools/packs` builds packs and fills checksums and byte sizes.
- The app verifies checksums on install and on first load.
- A `tokens.txt` is validated in Kotlin before any native call (every symbol must match the
  runtime exactly) — plan rule 10.
- An invalid pack disables only that language; the app keeps running.
- A non-commercial licence class must show a banner in the UI and appear in `docs/LICENSES.md`.
- `status` is `verified` only after a language qualification run (plan Section 9.4); the rest are
  `experimental` and the confidence UI is disabled until `confidence.tau` is calibrated.

## Quantization (on-device AI, focus area 1)

- ASR ships as an **int8** ONNX model (`model.int8.onnx`); the manifest records the file's byte
  size and sha256 so the app verifies it on install and first load.
- Quantization happens in `tools/packs` at build time (post-training int8), never on the phone.
  The exact tool and command are recorded in the manifest's `source` and in `DECISIONS.md` when a
  real model is produced (blocked on Q7/Q8).
- A pack declares its own `sampleRate`, `engine` and files, so a more aggressive quantization can
  ship as a new pack version without an app update.
- `critical.<lang>.json` lists number words and a small emergency lexicon; digits are always
  treated as critical. The receiver cue and forced read-back use it (plan 9.2, 9.3).
- `codebook.<lang>.json` holds numbered preset alerts with a `reviewed` flag; unreviewed entries
  are excluded from release builds (plan 9.6).

## Status

The manifest schema, checksum tooling, critical lexicons and codebooks live in `tools/packs` and
`files/packs`. No ASR/TTS model files are vendored yet: their exact files and licences are blocked
on Q7/Q8.
