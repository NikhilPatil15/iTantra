package dev.itantra.engine

import dev.itantra.protocol.Priority
import dev.itantra.speech.AsrEngine
import dev.itantra.speech.ScriptedAsrEngine

/**
 * End-to-end engine for one phone with an in-process peer. It runs the real send/receive path
 * (script codec -> AEAD framing -> de-dupe -> reorder -> ACK) and the confidence-aware read-back,
 * with speech supplied by fakes. This is the JVM analogue of the two-phone Gate G5 flow and is what
 * the app exposes while the radio and the real speech models are still pending.
 */
data class ConfWord(val text: String, val conf: Double, val low: Boolean, val critical: Boolean)

data class Readback(
    val lang: String,
    val text: String,
    val words: List<ConfWord>,
    val mustConfirm: Boolean,
    val criticalLow: Boolean,
)

data class EngineMessage(
    val messageId: String,
    val direction: String,
    val text: String,
    val state: String,
    val priority: String,
    val bytes: Int,
)

class InProcessEngine(
    private val asr: AsrEngine = ScriptedAsrEngine(),
    private val criticalWords: Set<String> = setOf("पानी", "नदी", "घायल", "दवा", "आग"),
) {
    private val key = ByteArray(32) { (it + 1).toByte() }
    private val salt = byteArrayOf(9, 8, 7, 6)
    private val local = ProtocolSession(key, salt, senderId = 1)
    private val remote = ProtocolSession(key, salt, senderId = 2)
    private val metrics = MetricsRecorder()
    private val messages = mutableListOf<EngineMessage>()
    private var seq = 0
    private var messageCounter = 0

    val transcript: List<EngineMessage> get() = messages.toList()

    /** Recognise on device and produce the read-back with per-word confidence. */
    suspend fun beginTalk(lang: String, pcm: ShortArray): Readback {
        val result = asr.transcribe(pcm)
        val words = result.words.map { word ->
            ConfWord(word.text, word.conf, word.conf < 0.6, criticalWords.contains(word.text))
        }
        return Readback(
            lang = lang,
            text = words.joinToString(" ") { it.text },
            words = words,
            mustConfirm = words.any { it.low },
            criticalLow = words.any { it.low && it.critical },
        )
    }

    /** Accept the read-back, encode and send it through the real wire path to the in-process peer. */
    fun acceptReadback(readback: Readback, editedText: String? = null): EngineMessage {
        val text = editedText ?: readback.text
        val frame = local.buildText(seq = ++seq, lang = readback.lang, text = text)
        val outcome = remote.receive(frame, now = 0)
        val deliveredText = (outcome as? ReceiveOutcome.Delivered)?.messages?.firstOrNull()?.text ?: ""
        messageCounter += 1
        val message = EngineMessage(
            messageId = "m$messageCounter",
            direction = "out",
            text = deliveredText.ifEmpty { text },
            state = if (outcome is ReceiveOutcome.Delivered) "acked" else "sent",
            priority = "routine",
            bytes = frame.size,
        )
        messages.add(message)
        metrics.record(
            TimelineRecord(
                messageId = message.messageId, lang = readback.lang, priority = 0,
                tSpeechEndMs = 0, tAsrDoneMs = 1200, tAcceptMs = 1800, tLinkWriteMs = 1810,
                tLinkRecvMs = 2100, tTtsFirstAudioMs = 2400, tAckMs = 2600,
                bytesFrame = frame.size, bytesText = text.toByteArray(Charsets.UTF_8).size,
                chars = text.length, words = text.split(" ").size, attempts = 1,
                emulatorConfig = "loopback",
            ),
        )
        return message
    }

    fun sendAlert(presetId: Int, lang: String, text: String): EngineMessage {
        val frame = local.buildText(seq = ++seq, lang = lang, text = text, priority = Priority.ALERT)
        val outcome = remote.receive(frame, now = 0)
        messageCounter += 1
        val message = EngineMessage(
            messageId = "m$messageCounter",
            direction = "in",
            text = text,
            state = if (outcome is ReceiveOutcome.Delivered) "played" else "received",
            priority = "alert",
            bytes = frame.size,
        )
        messages.add(message)
        return message
    }

    fun metricsCsv(): String = metrics.toCsv()
}
