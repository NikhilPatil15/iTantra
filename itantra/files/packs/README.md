# Language packs

Each language lives in `files/packs/<lang>/`:

```
files/packs/hi/
├─ pack.json          # manifest, see docs/PACKS.md
├─ asr/
│  ├─ model.int8.onnx
│  └─ tokens.txt
├─ tts/
│  ├─ voice.onnx
│  └─ tokens.txt
├─ codebook.hi.json   # numbered preset alerts
└─ critical.hi.json   # number words and a small critical lexicon
```

No model files are committed to this repository: they are large and each has its own licence.
Build a pack from downloaded, licence-checked files with:

```bash
python3 tools/packs/build_pack.py --dir /path/to/pack-dir --id hi --lang-index 1 \
  --display-name "हिन्दी" --script Devanagari --window-base 0x0900 \
  --asr-engine sherpa-nemo-ctc --asr-license MIT --asr-class permissive --asr-source "<url>" \
  --tts-engine sherpa-vits-piper --tts-license "<license>" --tts-class permissive --tts-source "<url>"
```

Then verify and install via the app's Packs screen (install from file) or `adb push`.
After adding packs, regenerate the licence table:

```bash
python3 tools/packs/gen_licenses.py
```

Licence classes: `permissive`, `share-alike`, `non-commercial`. A `non-commercial` component
shows a banner in the app (plan Section 0 rule 9).
