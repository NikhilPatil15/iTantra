# Open questions (blockers for humans)

Plan Section 0 rule 1 and Section 2.4. Do not invent answers. Each entry lists what is needed,
why it blocks, and where the answer will be recorded.

## Blocking

| # | Needed | Why it blocks | Status |
| --- | --- | --- | --- |
| Q1 | Official SIH26173 text from the portal (Background, Description, Expected Outcome, evaluation criteria) | Scope compliance; T03. Requirements marked `reported` come from third-party repos. | OPEN |
| Q2 | Target phone models (>= 2, one mid-range) and Android versions | Model speed, RAM, min/target SDK, device matrix; T02/T41/T45. | OPEN |
| Q3 | Team size and demo date | Re-estimate phase effort; TASKS.md header. | OPEN |
| Q4 | Language subset for the demo | Pack build and test effort; DECISIONS.md. | OPEN — provisional: hi + en first. |
| Q5 | Commercial or competition-only use | Decides whether non-commercial voices (MMS-TTS) are acceptable; LICENSES.md. | OPEN |
| Q6 | JDK + Android SDK availability on the build machine | Blocks Gradle builds and Kotlin unit tests. See DECISIONS.md 2026-09-28. | OPEN |
| Q7 | Which ASR model export to license (IndicConformer int8 CTC ONNX third-party export) and its true licence | LICENSES.md, pack manifests; contribution C2. | OPEN |
| Q8 | FLEURS / IndicVoices access terms and the noise corpus licence | `bench wer`/`bench noise` data provenance. | OPEN |
| Q9 | Must the shipping build remove `android.permission.INTERNET`? | Plan rule 6: we may only claim "makes no internet connections" after verifying. | RESOLVED 2026-09-29: the offline release build has zero INTERNET entries (config plugin `plugins/withOfflineManifest.js`, `ITANTRA_OFFLINE=1`). See DECISIONS.md. |

## Non-blocking (assumptions recorded)

- The plan's "reported" requirements are treated as provisional scope until Q1 is answered.
- English and Hindi are implemented first per plan Section 9.4 ordering; all other languages
  remain `experimental` and uninstalled until qualified.
