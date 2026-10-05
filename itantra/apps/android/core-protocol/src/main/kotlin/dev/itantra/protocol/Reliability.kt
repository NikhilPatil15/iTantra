package dev.itantra.protocol

/** Deterministic reliability primitives, plan Sections 7.5 and 10.3. Injected clocks everywhere. */

private const val REPLAY_LOOKBACK = 32768

sealed class DedupeResult {
    data object New : DedupeResult()
    data object Duplicate : DedupeResult()
    data object Stale : DedupeResult()
}

class DedupeWindow(private val capacity: Int = 256) {
    private val order = ArrayDeque<Int>()
    private val set = HashSet<Int>()
    private var highest: Int? = null

    val highestSeen: Int? get() = highest

    fun inspect(seq: Int): DedupeResult = when {
        set.contains(seq) -> DedupeResult.Duplicate
        highest != null && highest!! - seq > REPLAY_LOOKBACK -> DedupeResult.Stale
        else -> DedupeResult.New
    }

    fun accept(seq: Int): DedupeResult {
        val verdict = inspect(seq)
        if (verdict != DedupeResult.New) return verdict
        set.add(seq)
        order.addLast(seq)
        if (order.size > capacity) set.remove(order.removeFirst())
        if (highest == null || seq > highest!!) highest = seq
        return DedupeResult.New
    }
}

class ReorderBuffer<T>(private val waitMs: Long) {
    private var nextSeq: Int? = null
    private val held = LinkedHashMap<Int, Pair<T, Long>>()

    val buffered: Int get() = held.size

    data class Delivery<T>(val item: T, val skipped: List<Int>)

    fun offer(seq: Int, item: T, now: Long): List<Delivery<T>> {
        val next = nextSeq
        if (next == null) {
            nextSeq = seq + 1
            val out = ArrayList<Delivery<T>>()
            out.add(Delivery(item, emptyList()))
            drain(out)
            return out
        }
        if (seq < next) return emptyList()
        held[seq] = item to now
        val out = ArrayList<Delivery<T>>()
        drain(out)
        return out
    }

    fun expire(now: Long): List<Delivery<T>> {
        val next = nextSeq ?: return emptyList()
        val oldest = held.entries.filter { it.key >= next }.minByOrNull { it.value.second } ?: return emptyList()
        if (oldest.value.second + waitMs > now) return emptyList()
        val skipped = (next until oldest.key).toList()
        held.remove(oldest.key)
        nextSeq = oldest.key + 1
        val out = ArrayList<Delivery<T>>()
        out.add(Delivery(oldest.value.first, skipped))
        drain(out)
        return out
    }

    private fun drain(out: MutableList<Delivery<T>>) {
        while (true) {
            val next = nextSeq ?: return
            val entry = held.remove(next) ?: return
            out.add(Delivery(entry.first, emptyList()))
            nextSeq = next + 1
        }
    }
}

data class RetryConfig(
    val initialMs: Long = 1000,
    val factor: Double = 2.0,
    val maxMs: Long = 30_000,
    val jitterFraction: Double = 0.2,
)

class RetryScheduler(
    private val config: RetryConfig = RetryConfig(),
    private val now: () -> Long,
    private val rng: () -> Double = { 0.5 },
) {
    private data class Entry(var attempts: Int, var nextAt: Long)
    private val entries = HashMap<String, Entry>()

    fun schedule(id: String) { entries[id] = Entry(0, now()) }
    fun acknowledge(id: String) { entries.remove(id) }
    fun cancel(id: String) { entries.remove(id) }
    fun attempts(id: String): Int = entries[id]?.attempts ?: 0
    fun nextRetryAt(id: String): Long? = entries[id]?.nextAt

    fun due(at: Long): List<String> {
        val out = ArrayList<String>()
        for ((id, entry) in entries) {
            if (entry.nextAt > at) continue
            out.add(id)
            entry.attempts += 1
            val base = minOf((config.initialMs * Math.pow(config.factor, (entry.attempts - 1).toDouble())).toLong(), config.maxMs)
            val jitter = (rng() * 2 - 1) * config.jitterFraction
            entry.nextAt = at + maxOf(1, Math.round(base * (1 + jitter)))
        }
        return out
    }
}

data class OutboxMessage(val seq: Int, val priority: Int, val ageSeconds: Int)

/** Priority first, then oldest first (plan Section 7.5, demo scenario 7). */
fun orderForDelivery(messages: List<OutboxMessage>): List<OutboxMessage> =
    messages.sortedWith(compareByDescending<OutboxMessage> { it.priority }.thenByDescending { it.ageSeconds }.thenBy { it.seq })
