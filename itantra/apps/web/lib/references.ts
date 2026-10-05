/** Reference catalogue rendered on /references/ and mirrored in docs/REFERENCES.md. */

export interface RefItem {
  title: string;
  url: string;
  note?: string;
}

export interface RefSection {
  heading: string;
  intro?: string;
  items: RefItem[];
}

export const REFERENCE_SECTIONS: RefSection[] = [
  {
    heading: "Research papers",
    intro: "Links verified. Open each before citing it on a slide.",
    items: [
      { title: "Polyak et al., Speech Resynthesis from Discrete Self-Supervised Units (Interspeech 2021)", url: "https://arxiv.org/abs/2104.00355", note: "365 bps semantic codec; comparison point for text bitrate on narrow links." },
      { title: "Pratap et al., Scaling Speech Technology to 1,000+ Languages (MMS, Meta)", url: "https://arxiv.org/abs/2305.13516", note: "Source of MMS-TTS voices (CC-BY-NC 4.0)." },
      { title: "Javed et al., IndicVoices (ACL Findings 2024)", url: "https://arxiv.org/abs/2403.01926", note: "7,348 h, 22 languages, spontaneous speech." },
      { title: "Sankar et al., IndicVoices-R (NeurIPS 2024)", url: "https://arxiv.org/abs/2409.05356", note: "1,704 h TTS-grade Indic speech." },
      { title: "Gala et al., IndicTrans2 (TMLR 2023)", url: "https://arxiv.org/abs/2305.16307", note: "Translation, all 22 scheduled languages; optional stretch." },
      { title: "Leschanowsky et al., SITool codec intelligibility (Interspeech 2025)", url: "https://arxiv.org/abs/2506.01731", note: "Subjective intelligibility benchmark for low-bitrate codecs." },
      { title: "Gulati et al., Conformer", url: "https://arxiv.org/abs/2005.08100", note: "Architecture behind IndicConformer." },
      { title: "Kim et al., VITS", url: "https://arxiv.org/abs/2106.06103", note: "Architecture behind Piper voices." },
      { title: "Radford et al., Whisper", url: "https://arxiv.org/abs/2212.04356", note: "Multilingual ASR baseline." },
      { title: "Conneau et al., FLEURS", url: "https://arxiv.org/abs/2205.12446", note: "Public test set; verify licence." },
      { title: "Hsu et al., HuBERT", url: "https://arxiv.org/abs/2106.07447", note: "Self-supervised units." },
      { title: "Baevski et al., wav2vec 2.0", url: "https://arxiv.org/abs/2006.11477", note: "Pre-training base for MMS/Indic models." },
    ],
  },
  {
    heading: "Papers cited in the research PDF (verify before citing)",
    items: [
      { title: "STCTS — text + sparse prosody ~80 bps", url: "https://arxiv.org/abs/2512.00451" },
      { title: "Collette, Greenwood, Nicoll — semantic compression", url: "https://arxiv.org/abs/2509.15462" },
      { title: "BhasaAnuvaad — read vs spontaneous speech", url: "https://arxiv.org/abs/2411.04699" },
      { title: "Rasmalai / Indic Parler-TTS", url: "https://arxiv.org/abs/2505.18609" },
      { title: "On-device streaming ASR with quantization", url: "https://arxiv.org/abs/2604.14493" },
      { title: "SN-WER — script-normalized WER", url: "https://arxiv.org/abs/2606.02548" },
    ],
  },
  {
    heading: "Models, runtimes and tools",
    items: [
      { title: "AI4Bharat IndicConformer (per language, hybrid CTC-RNNT)", url: "https://huggingface.co/ai4bharat/indicconformer_stt_hi_hybrid_ctc_rnnt_large", note: "MIT on the card; ~120M encoder." },
      { title: "AI4Bharat IndicConformer-600M multilingual", url: "https://huggingface.co/ai4bharat/indic-conformer-600m-multilingual" },
      { title: "Piper (VITS) voices", url: "https://github.com/rhasspy/piper", note: "Per-voice dataset licences differ." },
      { title: "sherpa-onnx (VAD / ASR / TTS runtime, Kotlin JNI)", url: "https://github.com/k2-fsa/sherpa-onnx" },
      { title: "Silero VAD", url: "https://github.com/snakers4/silero-vad" },
      { title: "AI4Bharat models", url: "https://ai4bharat.iitm.ac.in/" },
      { title: "Google Tink", url: "https://github.com/tink-crypto/tink-java" },
      { title: "Protocol Buffers (baseline packet format)", url: "https://protobuf.dev/" },
    ],
  },
  {
    heading: "Datasets",
    items: [
      { title: "FLEURS (reported CC-BY-4.0)", url: "https://arxiv.org/abs/2205.12446" },
      { title: "IndicVoices", url: "https://arxiv.org/abs/2403.01926" },
      { title: "IndicVoices-R", url: "https://arxiv.org/abs/2409.05356" },
      { title: "Mozilla Common Voice", url: "https://commonvoice.mozilla.org/" },
    ],
  },
  {
    heading: "Communication standards",
    items: [
      { title: "Bundle Protocol v7 (RFC 9171)", url: "https://www.rfc-editor.org/rfc/rfc9171.html", note: "Outbox lifetime/custody ideas; not a BPv7 claim." },
      { title: "Opus (RFC 6716)", url: "https://www.rfc-editor.org/rfc/rfc6716.html" },
      { title: "Codec2", url: "https://github.com/drowe67/codec2" },
      { title: "Lyra V2", url: "https://github.com/google/lyra" },
      { title: "ChaCha20-Poly1305 (RFC 8439)", url: "https://www.rfc-editor.org/rfc/rfc8439.html" },
      { title: "Ed25519 (RFC 8032)", url: "https://www.rfc-editor.org/rfc/rfc8032.html" },
      { title: "X25519 (RFC 7748)", url: "https://www.rfc-editor.org/rfc/rfc7748.html" },
      { title: "HKDF (RFC 5869)", url: "https://www.rfc-editor.org/rfc/rfc5869.html" },
      { title: "Bluetooth RFCOMM (Android)", url: "https://developer.android.com/reference/android/bluetooth/BluetoothSocket" },
      { title: "Wi-Fi Direct / Wi-Fi P2P (Android)", url: "https://developer.android.com/develop/connectivity/wifi/wifip2p" },
      { title: "Nearby Connections", url: "https://developers.google.com/nearby/connections/overview" },
      { title: "Foreground service types (Android 14+)", url: "https://developer.android.com/develop/background-work/services/fgs/service-types" },
      { title: "Meshtastic (LoRa)", url: "https://meshtastic.org/" },
    ],
  },
  {
    heading: "Existing systems / prior art",
    items: [
      { title: "Google Translate offline (Live Translate)", url: "https://support.google.com/translate/", note: "Pixel 9–11; Hindi only Indic language; no device-to-device." },
      { title: "Bhashini", url: "https://bhashini.gov.in/", note: "Cloud-first; excluded by the offline requirement." },
      { title: "Briar", url: "https://briarproject.org/", note: "Delivery-layer prior art; no speech." },
      { title: "Meshtastic + ATAK plugin", url: "https://meshtastic.org/", note: "STT over LoRa + TTS on receiver; English only." },
      { title: "SIH official portal", url: "https://sih.gov.in/" },
    ],
  },
];
