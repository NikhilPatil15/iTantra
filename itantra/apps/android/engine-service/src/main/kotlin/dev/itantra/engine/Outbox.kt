package dev.itantra.engine

import dev.itantra.protocol.Priority
import dev.itantra.protocol.RetryScheduler

/**
 * Outbox state machine, plan Sections 6.1 and 7.5. Sender-side states:
 * QUEUED -> SENDING -> SENT -> ACKED, or EXPIRED / CANCELLED.
 */
enum class OutboxState { QUEUED, SENDING, SENT, ACKED, EXPIRED, CANCELLED }

data class OutboxEntry(
    val messageId: String,
    val peerId: String,
    val seq: Int,
    val priority: Priority,
    val createdAtMs: Long,
    var state: OutboxState = OutboxState.QUEUED,
    var attempts: Int = 0,
    var nextRetryAtMs: Long = 0,
)

/**
 * Sender-side outbox. TTLs: routine 600 s, urgent 1800 s, alert 3600 s (plan 7.5). Retry uses the
 * shared RetryScheduler with an injected clock so the state machine is deterministic in tests.
 */
class Outbox(
    private val now: () -> Long,
    private val scheduler: RetryScheduler,
) {
    private val entries = LinkedHashMap<String, OutboxEntry>()

    fun enqueue(peerId: String, seq: Int, priority: Priority, messageId: String) {
        val entry = OutboxEntry(messageId, peerId, seq, priority, now())
        entry.nextRetryAtMs = now()
        entries[messageId] = entry
        scheduler.schedule(messageId)
    }

    fun markSending(messageId: String) {
        entries[messageId]?.let { it.state = OutboxState.SENDING; it.attempts += 1 }
    }

    fun markSent(messageId: String) {
        entries[messageId]?.let { it.state = OutboxState.SENT }
    }

    fun acknowledge(messageId: String) {
        entries[messageId]?.state = OutboxState.ACKED
        scheduler.acknowledge(messageId)
        entries.remove(messageId)
    }

    fun cancel(messageId: String) {
        entries[messageId]?.state = OutboxState.CANCELLED
        scheduler.cancel(messageId)
        entries.remove(messageId)
    }

    fun ttlMs(priority: Priority): Long = when (priority) {
        Priority.ROUTINE -> 600_000
        Priority.URGENT -> 1_800_000
        Priority.ALERT -> 3_600_000
    }

    /** Expire anything past its TTL, then return the entries due for (re)transmission, ordered. */
    fun dueForSend(): List<OutboxEntry> {
        val at = now()
        val it = entries.values.iterator()
        while (it.hasNext()) {
            val entry = it.next()
            if (at - entry.createdAtMs > ttlMs(entry.priority)) {
                entry.state = OutboxState.EXPIRED
                scheduler.cancel(entry.messageId)
                it.remove()
            }
        }
        val dueIds = scheduler.due(at).toHashSet()
        return entries.values
            .filter { dueIds.contains(it.messageId) }
            .sortedWith(compareByDescending<OutboxEntry> { it.priority.code }.thenBy { it.createdAtMs })
    }

    val size: Int get() = entries.size
}
