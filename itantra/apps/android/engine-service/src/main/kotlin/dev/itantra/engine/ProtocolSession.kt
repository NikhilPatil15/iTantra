package dev.itantra.engine

import dev.itantra.protocol.Aead
import dev.itantra.protocol.ChaCha20Poly1305Aead
import dev.itantra.protocol.DedupeResult
import dev.itantra.protocol.DedupeWindow
import dev.itantra.protocol.FrameCodec
import dev.itantra.protocol.Header
import dev.itantra.protocol.HeaderCodec
import dev.itantra.protocol.Languages
import dev.itantra.protocol.MessageType
import dev.itantra.protocol.Payloads
import dev.itantra.protocol.Priority
import dev.itantra.protocol.ReorderBuffer
import dev.itantra.protocol.ScriptCodec

/**
 * The send/receive core of the engine (plan Sections 6.1 and 7). It ties together the script codec,
 * AEAD framing, de-duplication and reordering; transport and speech sit outside it. Everything
 * here is deterministic and runs in plain JVM tests.
 */
data class InboundMessage(val seq: Int, val lang: String, val text: String)

sealed interface ReceiveOutcome {
    data class Delivered(val messages: List<InboundMessage>) : ReceiveOutcome
    data object Held : ReceiveOutcome
    data object Duplicate : ReceiveOutcome
    data object Stale : ReceiveOutcome
    data object AuthFailed : ReceiveOutcome
}

class ProtocolSession(
    private val key: ByteArray,
    private val salt: ByteArray,
    private val aead: Aead = ChaCha20Poly1305Aead(),
    private val epoch: Int = 1,
    private val senderId: Int = 1,
    reorderWaitMs: Long = 5000,
) {
    private val dedupe = DedupeWindow()
    private val reorder = ReorderBuffer<InboundMessage>(reorderWaitMs)

    fun buildText(seq: Int, lang: String, text: String, priority: Priority = Priority.ROUTINE, ageSeconds: Int = 0): ByteArray {
        val payload = Payloads.encodeText(ScriptCodec.encode(text, lang), null)
        val header = Header(
            type = if (priority == Priority.ALERT) MessageType.ALERT_TEXT else MessageType.TEXT,
            priority = priority,
            needAck = true,
            language = Languages.byCode(lang).index,
            senderId = senderId,
            seq = seq,
            ageSeconds = ageSeconds,
            payloadLen = payload.size,
        )
        return FrameCodec.build(header, payload, key, FrameCodec.deriveNonce(salt, epoch, seq), aead)
    }

    fun buildAck(ackSeq: Int, bitmap: Int): ByteArray {
        val payload = Payloads.encodeAck(0, ackSeq, bitmap)
        val header = Header(
            type = MessageType.ACK,
            language = 0,
            senderId = senderId,
            seq = sequenceForAck(),
            ageSeconds = 0,
            payloadLen = payload.size,
        )
        return FrameCodec.build(header, payload, key, FrameCodec.deriveNonce(salt, epoch, header.seq), aead)
    }

    private var ackSeq = 0
    private fun sequenceForAck(): Int = ++ackSeq

    /** Parse, authenticate, de-duplicate and reorder an inbound frame. */
    fun receive(frame: ByteArray, now: Long): ReceiveOutcome {
        if (frame.size < 12) return ReceiveOutcome.AuthFailed
        val header = HeaderCodec.decode(frame.copyOfRange(0, 12))
        return try {
            val (parsed, payload) = FrameCodec.parse(frame, key, FrameCodec.deriveNonce(salt, epoch, header.seq), aead)
            when (dedupe.accept(parsed.seq)) {
                DedupeResult.Duplicate -> ReceiveOutcome.Duplicate
                DedupeResult.Stale -> ReceiveOutcome.Stale
                DedupeResult.New -> {
                    if (parsed.type != MessageType.TEXT && parsed.type != MessageType.ALERT_TEXT) {
                        return ReceiveOutcome.Held
                    }
                    val (textBytes, _) = Payloads.decodeText(payload)
                    val text = ScriptCodec.decode(textBytes, languageCode(parsed.language))
                    val delivered = reorder.offer(parsed.seq, InboundMessage(parsed.seq, languageCode(parsed.language), text), now)
                    if (delivered.isEmpty()) ReceiveOutcome.Held else ReceiveOutcome.Delivered(delivered.map { it.item })
                }
            }
        } catch (e: Exception) {
            ReceiveOutcome.AuthFailed
        }
    }

    /** Force delivery of anything held longer than the reorder wait. */
    fun expire(now: Long): List<InboundMessage> = reorder.expire(now).map { it.item }

    private fun languageCode(index: Int): String =
        Languages.all.firstOrNull { it.index == index }?.code ?: "en"
}
