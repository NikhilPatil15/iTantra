import { Card, ScreenHeader } from "@/components/ui";

const SCRIPTS = [
  { lang: "hi", name: "Devanagari (Hindi)", sample: "क्षत्रिय ज्ञान दृष्टि क्रम श्रद्धा — नदी का पानी तेजी से बढ़ रहा है।" },
  { lang: "mr", name: "Devanagari (Marathi)", sample: "क्षत्रिय ज्ञान दृष्टी क्रम श्रद्धा — नदीचे पाणी वेगाने वाढत आहे." },
  { lang: "bn", name: "Bengali", sample: "ক্ষত্রিয় জ্ঞান দৃষ্টি শ্রদ্ধা — নদীর জল দ্রুত বাড়ছে।" },
  { lang: "gu", name: "Gujarati", sample: "ક્ષત્રિય જ્ઞાન દૃષ્ટિ શ્રદ્ધા — નદીનું પાણી ઝડપથી વધી રહ્યું છે." },
  { lang: "or", name: "Odia", sample: "କ୍ଷତ୍ରିୟ ଜ୍ଞାନ ଦୃଷ୍ଟି ଶ୍ରଦ୍ଧା — ନଦୀର ପାଣି ଶୀଘ୍ର ବଢ଼ୁଛି।" },
  { lang: "pa", name: "Gurmukhi", sample: "ਖ਼ਤਰਾ ਗਿਆਨ ਦ੍ਰਿਸ਼ਟੀ ਸ਼ਰਧਾ — ਨਦੀ ਦਾ ਪਾਣੀ ਤੇਜ਼ੀ ਨਾਲ ਵੱਧ ਰਿਹਾ ਹੈ।" },
  { lang: "ta", name: "Tamil", sample: "க்ஷத்திரிய ஞானம் திருஷ்டி ஸ்ரீ — ஆற்று நீர் வேகமாக உயர்கிறது." },
  { lang: "te", name: "Telugu", sample: "క్షత్రియ జ్ఞానం దృష్టి శ్రద్ధ — నది నీరు వేగంగా పెరుగుతోంది." },
  { lang: "kn", name: "Kannada", sample: "ಕ್ಷತ್ರಿಯ ಜ್ಞಾನ ದೃಷ್ಟಿ ಶ್ರದ್ಧೆ — ನದಿಯ ನೀರು ವೇಗವಾಗಿ ಏರುತ್ತಿದೆ." },
  { lang: "ml", name: "Malayalam", sample: "ക്ഷത്രിയ ജ്ഞാനം ദൃഷ്ടി ശ്രദ്ധ — നദിയിലെ വെള്ളം ഉയരുന്നു." },
];

export default function ScriptsPage() {
  return (
    <div className="mx-auto max-w-2xl p-4">
      <ScreenHeader title="Scripts" subtitle="All ten scripts with conjunct-heavy samples. Check for clipped or missing glyphs." />
      <ul className="flex flex-col gap-3">
        {SCRIPTS.map((script) => (
          <li key={script.lang}>
            <Card className="p-4">
              <p className="text-[13px] text-[var(--slate)]">
                {script.name} · lang={script.lang}
              </p>
              <p lang={script.lang} className="mt-1 text-[26px] leading-[1.6]">
                {script.sample}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
