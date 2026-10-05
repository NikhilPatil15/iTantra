# Bench corpus and provenance

Plan Section 12.3 and rule 5: every number must name its data.

## `seed.jsonl`

- **What:** a small hand-authored set of Hindi, English, Bengali, Tamil and Telugu sentences,
  including emergency phrasings.
- **Who:** authored in this repository on 2026-09-28 by the build agent.
- **Not:** a public benchmark, not spoken audio, not disaster-stressed speech.
- **Use:** smoke-testing the size pipeline and the app before a licensed corpus is wired in.
- **Do not** cite results from this file on a slide as a benchmark. Results are marked
  `sample data` until a public, licensed corpus is used.

## Planned licensed corpora (blocked on Q8)

| Corpus | Reported licence | Status |
| --- | --- | --- |
| FLEURS | CC-BY-4.0 (verify) | not downloaded |
| IndicVoices | check access terms | not downloaded |

## Baselines used by `bench size`

| Name | Meaning |
| --- | --- |
| `utf8_bytes` | raw UTF-8 of the NFC text |
| `coded_bytes` | iTantra script-aware coding (contribution C1) |
| `deflate_bytes` | zlib (deflate) over the UTF-8 text |
| `deflate_dict_bytes` | zlib with the preset dictionary in `dictionary.txt` |
| `codebook_bytes` | 3-byte PHRASE payload when the sentence is an exact preset (else blank) |
| `frame_bytes` | `coded_bytes` + 12-byte header + 16-byte tag |
