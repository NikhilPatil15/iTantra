# iTantra wire protocol v1

Promoted from plan Section 7. Frozen at Gate G3. All integers are big-endian.
Stream links (RFCOMM, TCP) carry frames as `[len:uint16][frame]`, maximum frame 2048 bytes.
Datagram links (LoRa stretch) carry the frame alone.

## Frame

`frame = header(12) + payload(0..255) + tag(16)`

| Byte | Bits | Field | Notes |
| --- | --- | --- | --- |
| 0 | 7–4 | version | 1 |
| 0 | 3–0 | type | see types table |
| 1 | 7–6 | priority | 0 routine, 1 urgent, 2 alert |
| 1 | 5 | needAck | receiver must ACK |
| 1 | 4 | hasConf | payload ends with a confidence bitmap |
| 1 | 3 | fragment | payload starts with `index(4)|count(4)` |
| 1 | 2 | codebook | payload is a phrase reference |
| 1 | 1–0 | reserved | 0 |
| 2 | 7–0 | language | index in `languages.json` (0 en, 1 hi, 2 mr, 3 gu, 4 bn, 5 ta, 6 te, 7 kn, 8 ml, 9 or, 10 pa) |
| 3–4 | | senderId | uint16, assigned at pairing |
| 5–6 | | seq | uint16 per sender; every frame consumes one |
| 7–8 | | ageSeconds | seconds since creation, set at each attempt, saturating |
| 9 | | hops | remaining hops (0 direct; stretch relay only) |
| 10 | | payloadLen | 0–255 |
| 11 | | reserved | 0 |

The 16-byte tag is an AEAD over the payload with the 12 header bytes as associated data.
`HELLO` carries no tag (it is signed instead).

## Types

| Type | Code | Payload |
| --- | --- | --- |
| TEXT | 0x1 | `textLen(1) | textBytes | [confBitmap]` |
| PHRASE | 0x2 | `phraseId(2) | codebookVersion(1)` (priority 2 = preset alert) |
| ALERT_TEXT | 0x3 | same as TEXT, priority 2 |
| ACK | 0x4 | `kind(1) | ackSeq(2) | bitmap(4)` |
| HELLO | 0x5 | `identityPub(32) | ephemeralPub(32) | signature(64) | protoMin(1) | protoMax(1)` |
| PACK_OFFER | 0x6 | `langIndex(1) | version(2) | sizeBytes(4) | sha256(32)` |
| PING / PONG | 0x7 / 0x8 | `nonce(4)`; PONG adds `responderMonotonicMs(4)` |
| LOCATION | 0x9 | stretch: `lat(4) | lon(4)` fixed-point, alert-only |

## Script-aware text coding (contribution C1)

Input is Unicode NFC. A language registry gives a script-window base (Devanagari 0x0900,
Bengali 0x0980, Gurmukhi 0x0A00, Gujarati 0x0A80, Odia 0x0B00, Tamil 0x0B80, Telugu 0x0C00,
Kannada 0x0C80, Malayalam 0x0D00; English has none).

| Output byte(s) | Meaning |
| --- | --- |
| `0x0A`, `0x20`–`0x7E` | same ASCII character |
| `0x80`–`0xFF` | code point `windowBase + (byte - 0x80)` |
| `0x03` / `0x04` | U+200D ZWJ / U+200C ZWNJ |
| `0x06` / `0x07` | U+0964 danda / U+0965 double danda |
| `0x05, idx` | switch window: `windowBase = 0x0900 + idx * 0x80` |
| `0x01, hi, lo` | other BMP code point |
| `0x02, b2, b1, b0` | supplementary code point |

Control characters other than newline are normalised to a space on both encode and decode.

Confidence bitmap: words are segments between `0x20` bytes of decoded text. Bit `i` (MSB first)
is 1 when word `i` is low confidence; length `ceil(words/8)`.

## Security handshake

Pairing pins an Ed25519 identity key and confirms a 6-digit SAS. Each connection uses fresh
X25519 ephemerals signed by the identity key; session keys and 4-byte salts come from HKDF over
the shared secret and transcript hash. Nonce is `salt(4) | counter(8)` with
`counter = epoch << 16 | seq`; a reconnect starts a new epoch. Replay is rejected by a dedupe
window and a 32,768 look-back. We do **not** claim forward secrecy beyond a session, external
audit, or protection from a malicious paired peer.

## Reliability defaults (all in `EngineConfig`)

| Setting | Default |
| --- | --- |
| Retry backoff | 1 s doubling, cap 30 s, jitter ±20% |
| TTL | routine 600 s, urgent 1800 s, alert 3600 s |
| Dedupe window | last 256 `(senderId, seq)` per peer, persisted |
| Reorder wait | 5 s, then play with a "previous message missing" cue |
| Stale-speech limit | 300 s (older routine shown, not spoken) |
| Heartbeat | PING every 5 s idle, link down after 3 misses |
| Alert repeat | every 10 s until human ACK, max 5 min |
