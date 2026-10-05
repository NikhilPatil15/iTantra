package dev.itantra.engine

import dev.itantra.protocol.Priority
import dev.itantra.protocol.RetryConfig
import dev.itantra.protocol.RetryScheduler
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class OutboxTest {
    private var now = 0L
    private fun outbox() = Outbox({ now }, RetryScheduler(RetryConfig(jitterFraction = 0.0), { now }))

    @Test
    fun dueThenAckRemovesTheEntry() {
        val outbox = outbox()
        outbox.enqueue("ravi", 1, Priority.ROUTINE, "m1")
        assertEquals(listOf("m1"), outbox.dueForSend().map { it.messageId })
        outbox.markSent("m1")
        outbox.acknowledge("m1")
        assertEquals(0, outbox.size)
        assertTrue(outbox.dueForSend().isEmpty())
    }

    @Test
    fun routineMessageExpiresAfterItsTtl() {
        val outbox = outbox()
        outbox.enqueue("ravi", 1, Priority.ROUTINE, "m1")
        now = 700_000 // > routine TTL of 600 s
        assertTrue(outbox.dueForSend().isEmpty())
        assertEquals(0, outbox.size)
    }

    @Test
    fun alertIsSentBeforeRoutine() {
        val outbox = outbox()
        outbox.enqueue("ravi", 1, Priority.ROUTINE, "m-routine")
        outbox.enqueue("ravi", 2, Priority.ALERT, "m-alert")
        val order = outbox.dueForSend().map { it.messageId }
        assertEquals("m-alert", order.first())
    }

    @Test
    fun retryKeepsResendingUntilAcked() {
        val outbox = outbox()
        outbox.enqueue("ravi", 1, Priority.URGENT, "m1")
        assertEquals(listOf("m1"), outbox.dueForSend().map { it.messageId })
        now = 1000 // first backoff is 1 s
        assertEquals(listOf("m1"), outbox.dueForSend().map { it.messageId })
        outbox.acknowledge("m1")
        assertTrue(outbox.dueForSend().isEmpty())
    }
}
