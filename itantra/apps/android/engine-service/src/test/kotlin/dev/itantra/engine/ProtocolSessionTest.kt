package dev.itantra.engine

import dev.itantra.protocol.ChaCha20Poly1305Aead
import dev.itantra.protocol.FrameCodec
import dev.itantra.protocol.HeaderCodec
import dev.itantra.protocol.MessageType
import dev.itantra.protocol.Priority
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class ProtocolSessionTest {
    private val key = ByteArray(32) { (it + 1).toByte() }
    private val salt = byteArrayOf(9, 8, 7, 6)
    private val sender = ProtocolSession(key, salt, senderId = 1)
    private val receiver = ProtocolSession(key, salt, senderId = 2)

    @Test
    fun textRoundTripsThroughTheWire() {
        val frame = sender.buildText(seq = 1, lang = "hi", text = "नदी का पानी बढ़ रहा है")
        val outcome = receiver.receive(frame, now = 0)
        val delivered = assertIs<ReceiveOutcome.Delivered>(outcome)
        assertEquals("नदी का पानी बढ़ रहा है", delivered.messages.single().text)
        assertEquals("hi", delivered.messages.single().lang)
    }

    @Test
    fun duplicatesAreRejected() {
        val frame = sender.buildText(1, "hi", "मदद चाहिए")
        assertIs<ReceiveOutcome.Delivered>(receiver.receive(frame, 0))
        assertIs<ReceiveOutcome.Duplicate>(receiver.receive(frame, 0))
    }

    @Test
    fun staleSequencesAreRejected() {
        val newer = sender.buildText(40_000, "hi", "नया संदेश")
        val older = sender.buildText(1, "hi", "पुराना संदेश")
        assertIs<ReceiveOutcome.Delivered>(receiver.receive(newer, 0))
        assertIs<ReceiveOutcome.Stale>(receiver.receive(older, 0))
    }

    @Test
    fun tamperedFrameFailsAuthentication() {
        val frame = sender.buildText(1, "hi", "मदद चाहिए")
        frame[frame.size - 1] = (frame[frame.size - 1].toInt() xor 0xff).toByte()
        assertIs<ReceiveOutcome.AuthFailed>(receiver.receive(frame, 0))
    }

    @Test
    fun outOfOrderMessagesAreHeldThenDeliveredInOrder() {
        // The first frame received establishes the baseline sequence.
        assertIs<ReceiveOutcome.Delivered>(receiver.receive(sender.buildText(1, "hi", "पहला"), 0))
        assertIs<ReceiveOutcome.Held>(receiver.receive(sender.buildText(3, "hi", "तीसरा"), 0))
        val delivered = assertIs<ReceiveOutcome.Delivered>(receiver.receive(sender.buildText(2, "hi", "दूसरा"), 0))
        assertEquals(listOf("दूसरा", "तीसरा"), delivered.messages.map { it.text })
    }

    @Test
    fun heldMessageIsForcedAfterTheWait() {
        assertIs<ReceiveOutcome.Delivered>(receiver.receive(sender.buildText(1, "hi", "पहला"), 0))
        assertIs<ReceiveOutcome.Held>(receiver.receive(sender.buildText(3, "hi", "तीसरा"), now = 0))
        val delivered = receiver.expire(now = 5000)
        assertEquals(listOf("तीसरा"), delivered.map { it.text })
    }

    @Test
    fun ackRoundTrips() {
        val ack = sender.buildAck(ackSeq = 1, bitmap = 0b1000_0000_0000_0000_0000_0000_0000_0000.toInt())
        val header = HeaderCodec.decode(ack.copyOfRange(0, 12))
        val aead = ChaCha20Poly1305Aead()
        val (_, payload) = FrameCodec.parse(ack, key, FrameCodec.deriveNonce(salt, 1, header.seq), aead)
        assertEquals(7, payload.size)
    }

    @Test
    fun alertTextCarriesAlertPriority() {
        val frame = sender.buildText(1, "hi", "दो लोग घायल हैं", priority = Priority.ALERT)
        val header = HeaderCodec.decode(frame.copyOfRange(0, 12))
        assertEquals(Priority.ALERT, header.priority)
        assertEquals(MessageType.ALERT_TEXT, header.type)
        val delivered = assertIs<ReceiveOutcome.Delivered>(receiver.receive(frame, 0))
        assertEquals("दो लोग घायल हैं", delivered.messages.single().text)
    }
}
