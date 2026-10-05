package dev.itantra.protocol

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ProtocolTest {
    @Test
    fun headerRoundTrips() {
        val header = Header(
            type = MessageType.TEXT, priority = Priority.ALERT, needAck = true, hasConf = true,
            language = 4, senderId = 0x1234, seq = 0xabcd, ageSeconds = 0x0f0f, hops = 7, payloadLen = 42,
        )
        assertEquals(header, HeaderCodec.decode(HeaderCodec.encode(header)))
    }

    @Test
    fun headerBitsMatchTheSpec() {
        val bytes = HeaderCodec.encode(
            Header(type = MessageType.ACK, priority = Priority.URGENT, language = 1, senderId = 0x12, seq = 0, ageSeconds = 0, payloadLen = 0),
        )
        assertEquals(0x14, bytes[0].toInt() and 0xff)
        assertEquals(0x40, bytes[1].toInt() and 0xff)
    }

    @Test
    fun scriptRoundTripsPerLanguage() {
        val samples = mapOf(
            "en" to "Send a boat, now.\nSecond line",
            "hi" to "नदी का पानी तेजी से बढ़ रहा है, नाव भेजिए।",
            "ta" to "ஆற்று நீர் வேகமாக உயர்கிறது.",
            "bn" to "নদীর জল দ্রুত বাড়ছে।",
            "ml" to "നദിയിലെ വെള്ളം വേഗത്തിൽ ഉയരുന്നു.",
        )
        for ((lang, text) in samples) {
            val encoded = ScriptCodec.encode(text, lang)
            assertEquals(ScriptCodec.normalize(text), ScriptCodec.decode(encoded, lang), lang)
        }
    }

    @Test
    fun joinersDandaAndEmojiRoundTrip() {
        val text = "क्\u200dष\u200c।। 😀"
        assertEquals(ScriptCodec.normalize(text), ScriptCodec.decode(ScriptCodec.encode(text, "hi"), "hi"))
    }

    @Test
    fun propertyRandomIndicStringsRoundTrip() {
        val rng = Random(20260928)
        val pools = Languages.windowBases.map { base -> (0 until 0x80).map { base + it } } +
            listOf((0x20..0x7e).toList(), listOf(0x200d, 0x200c, 0x0964, 0x0965, 0x1f600))
        repeat(500) {
            val lang = Languages.all[rng.nextInt(Languages.all.size)]
            val len = rng.nextInt(20)
            val source = buildString {
                repeat(len) {
                    val pool = pools[rng.nextInt(pools.size)]
                    appendCodePoint(pool[rng.nextInt(pool.size)])
                }
            }
            assertEquals(ScriptCodec.normalize(source), ScriptCodec.decode(ScriptCodec.encode(source, lang.code), lang.code))
        }
    }

    @Test
    fun confidenceRoundTrips() {
        for (n in intArrayOf(0, 1, 8, 9, 64)) {
            val flags = BooleanArray(n) { it % 3 == 0 }
            assertContentEquals(flags.toList().toBooleanArray(), Confidence.decode(Confidence.encode(flags), n))
            assertEquals((n + 7) / 8, Confidence.encode(flags).size)
        }
    }

    @Test
    fun frameReaderFuzzNeverThrows() {
        val rng = Random(12345)
        repeat(2000) {
            val reader = FrameReader()
            val chunk = ByteArray(rng.nextInt(64)) { rng.nextInt(256).toByte() }
            reader.push(chunk)
            assertTrue(reader.bufferedBytes <= MAX_FRAME_BYTES + 2)
        }
    }

    @Test
    fun frameReaderReadsSplitStream() {
        val reader = FrameReader()
        val payload = byteArrayOf(1, 2, 3, 4)
        val stream = byteArrayOf(0, payload.size.toByte()) + payload
        val frames = ArrayList<ByteArray>()
        for (b in stream) frames += reader.push(byteArrayOf(b))
        assertEquals(1, frames.size)
        assertContentEquals(payload, frames[0])
    }

    @Test
    fun dedupeRejectsReplay() {
        val window = DedupeWindow(256)
        assertEquals(DedupeResult.New, window.accept(1))
        assertEquals(DedupeResult.Duplicate, window.accept(1))
        assertEquals(DedupeResult.New, window.accept(2))
        assertEquals(DedupeResult.New, window.accept(40000))
        assertEquals(DedupeResult.Stale, window.inspect(40000 - 33000))
    }

    @Test
    fun reorderForcesAfterWait() {
        val buffer = ReorderBuffer<String>(5000)
        buffer.offer(1, "a", 0)
        buffer.offer(3, "c", 0)
        assertTrue(buffer.expire(4999).isEmpty())
        val delivered = buffer.expire(5000)
        assertEquals(1, delivered.size)
        assertEquals(listOf(2), delivered[0].skipped)
    }

    @Test
    fun retryBacksOffAndClears() {
        var now = 0L
        val scheduler = RetryScheduler(RetryConfig(jitterFraction = 0.0), { now })
        scheduler.schedule("m1")
        assertEquals(listOf("m1"), scheduler.due(0))
        assertTrue(scheduler.due(999).isEmpty())
        assertEquals(listOf("m1"), scheduler.due(1000))
        scheduler.acknowledge("m1")
        assertTrue(scheduler.due(99999).isEmpty())
    }

    @Test
    fun tamperedFrameIsRejected() {
        val aead = ChaCha20Poly1305Aead()
        val key = ByteArray(32) { (it + 1).toByte() }
        val salt = byteArrayOf(9, 8, 7, 6)
        val payload = Payloads.encodeText(ScriptCodec.encode("hello", "en"), null)
        val header = Header(type = MessageType.TEXT, language = 0, senderId = 5, seq = 1, ageSeconds = 0, payloadLen = payload.size)
        val frame = FrameCodec.build(header, payload, key, FrameCodec.deriveNonce(salt, 1, 1), aead)
        frame[frame.size - 1] = (frame[frame.size - 1].toInt() xor 0xff).toByte()
        assertFailsWith<SecurityException> { FrameCodec.parse(frame, key, FrameCodec.deriveNonce(salt, 1, 1), aead) }
    }
}
