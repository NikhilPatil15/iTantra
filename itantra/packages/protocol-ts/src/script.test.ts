import { describe, expect, it } from "vitest";

import { LANGUAGES, WINDOW_BASES } from "./languages.js";
import { decodeText, encodeText, fragmentText, normalizeText } from "./script.js";
import { seededRng } from "./reliability.js";

const SAMPLE_TEXT: Record<string, string> = {
  en: "Water is rising near the bridge, send a boat.",
  hi: "नदी का पानी तेजी से बढ़ रहा है, नाव भेजिए।",
  mr: "नदीचे पाणी वेगाने वाढत आहे, होडी पाठवा.",
  gu: "નદીનું પાણી ઝડપથી વધી રહ્યું છે, હોડી મોકલો.",
  bn: "নদীর জল দ্রুত বাড়ছে, একটি নৌকা পাঠান।",
  ta: "ஆற்று நீர் வேகமாக உயர்கிறது, படகு அனுப்புங்கள்.",
  te: "నది నీరు వేగంగా పెరుగుతోంది, పడవ పంపండి.",
  kn: "ನದಿಯ ನೀರು ವೇಗವಾಗಿ ಏರುತ್ತಿದೆ, ದೋಣಿ ಕಳುಹಿಸಿ.",
  ml: "നദിയിലെ വെള്ളം വേഗത്തിൽ ഉയരുന്നു, ബോട്ട് അയക്കൂ.",
  or: "ନଦୀର ପାଣି ଶୀଘ୍ର ବଢ଼ୁଛି, ଏକ ଡଙ୍ଗା ପଠାନ୍ତୁ।",
  pa: "ਨਦੀ ਦਾ ਪਾਣੀ ਤੇਜ਼ੀ ਨਾਲ ਵੱਧ ਰਿਹਾ ਹੈ, ਕਿਸ਼ਤੀ ਭੇਜੋ।",
};

describe("script-aware coding", () => {
  it("round-trips a sentence in every language", () => {
    for (const lang of LANGUAGES) {
      const source = SAMPLE_TEXT[lang.code]!;
      const encoded = encodeText(source, lang.code);
      expect(decodeText(encoded, lang.code)).toBe(normalizeText(source));
    }
  });

  it("round-trips mixed Hindi and English", () => {
    const source = "पानी rising है at the bridge";
    expect(decodeText(encodeText(source, "hi"), "hi")).toBe(normalizeText(source));
  });

  it("round-trips joiners, danda and an emoji", () => {
    const source = "क्‍षत्रिय‌।। 😀";
    expect(decodeText(encodeText(source, "hi"), "hi")).toBe(normalizeText(source));
  });

  it("round-trips the empty string", () => {
    expect(decodeText(encodeText("", "hi"), "hi")).toBe("");
  });

  it("normalises control characters but keeps newline", () => {
    expect(normalizeText("a\tb\u0000c\nd")).toBe("a b c\nd");
    expect(decodeText(encodeText("a\tb\nd", "en"), "en")).toBe("a b\nd");
  });

  it("fragments text so every chunk fits the byte budget", () => {
    const long = SAMPLE_TEXT.hi!.repeat(20);
    const chunks = fragmentText(long, "hi", 200);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(encodeText(chunk, "hi").length).toBeLessThanOrEqual(200);
    expect(chunks.join("")).toBe(normalizeText(long));
  });

  it("property: random Indic strings round-trip", () => {
    const rng = seededRng(20260928);
    const pools = [
      ...WINDOW_BASES.map((base) => Array.from({ length: 0x80 }, (_, i) => base + i)),
      Array.from({ length: 0x5f }, (_, i) => 0x20 + i),
      [0x200d, 0x200c, 0x0964, 0x0965, 0x1f600, 0x0900 + 0x7f],
    ];
    for (let trial = 0; trial < 500; trial++) {
      const lang = LANGUAGES[Math.floor(rng() * LANGUAGES.length)]!;
      let source = "";
      const len = Math.floor(rng() * 20);
      for (let i = 0; i < len; i++) {
        const pool = pools[Math.floor(rng() * pools.length)]!;
        source += String.fromCodePoint(pool[Math.floor(rng() * pool.length)]!);
      }
      const encoded = encodeText(source, lang.code);
      expect(decodeText(encoded, lang.code)).toBe(normalizeText(source));
    }
  });
});
