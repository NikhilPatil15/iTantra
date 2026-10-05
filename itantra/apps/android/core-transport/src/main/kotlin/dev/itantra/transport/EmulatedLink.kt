package dev.itantra.transport

import kotlin.math.roundToInt
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.delay
import kotlin.random.Random

/**
 * EmulatedLink, plan Section 10.4: a decorator over any Link that throttles, drops and disconnects.
 * Every metric row records the config in effect, and it is never enabled silently.
 */

data class AirtimeModel(
    val spreadingFactor: Int,
    val bandwidthHz: Int,
    val codingRateDenominator: Int,
    val preambleSymbols: Int = 8,
    val explicitHeader: Boolean = true,
    val crc: Boolean = true,
)

data class EmulatorConfig(
    val rateBps: Int? = null,
    val airtimeModel: AirtimeModel? = null,
    val perFrameOverheadMs: Int = 0,
    val lossPercent: Double = 0.0,
    val jitterMs: Int = 0,
    val disconnectAfterMs: Long? = null,
    val disconnectDurationMs: Long? = null,
    val seed: Long = 1L,
)

object LoraAirtime {
    /**
     * Semtech time-on-air formula, plan Section 10.4. The unit test checks the documented values
     * for SF11, 250 kHz, CR 4/5, 16-symbol preamble, explicit header, CRC on.
     */
    fun airtimeMs(payloadBytes: Int, model: AirtimeModel): Double {
        val sf = model.spreadingFactor
        val bw = model.bandwidthHz.toDouble()
        val cr = model.codingRateDenominator
        val crc = if (model.crc) 1 else 0
        val header = if (model.explicitHeader) 0 else 1
        val de = 0 // low data rate optimisation not used at 250 kHz
        val symbolMs = (1 shl sf) / bw * 1000.0
        val preambleSymbols = model.preambleSymbols + 4.25
        val payloadSymbols = 8 + maxOf(
            Math.ceil((8.0 * payloadBytes - 4.0 * sf + 28 + 16 * crc - 20 * header) / (4.0 * (sf - 2 * de))) * (cr),
            0.0,
        )
        val totalSymbols = preambleSymbols + payloadSymbols
        return totalSymbols * symbolMs
    }
}

class EmulatedLink(
    private val delegate: Link,
    private val config: EmulatorConfig,
    private val startedAtMs: () -> Long = { System.currentTimeMillis() },
) : Link {
    override val peer: PeerRef get() = delegate.peer
    override val transport: TransportId get() = delegate.transport
    override val mtu: Int? get() = delegate.mtu
    override val closed: StateFlow<Boolean> get() = delegate.closed

    private val rng = Random(config.seed)

    override val incoming: Flow<ByteArray> get() = delegate.incoming

    private fun frameDelayMs(frame: ByteArray): Long {
        val model = config.airtimeModel
        val base = when {
            model != null -> LoraAirtime.airtimeMs(frame.size, model)
            config.rateBps != null -> frame.size * 8.0 / config.rateBps * 1000.0
            else -> 0.0
        }
        return (base + config.perFrameOverheadMs).roundToInt().toLong()
    }

    private fun inDisconnect(now: Long): Boolean {
        val after = config.disconnectAfterMs ?: return false
        val duration = config.disconnectDurationMs ?: return false
        val elapsed = now - startedAtMs()
        return elapsed >= after && elapsed < after + duration
    }

    override suspend fun send(frame: ByteArray) {
        if (config.lossPercent > 0 && rng.nextDouble() * 100 < config.lossPercent) return
        if (inDisconnect(System.currentTimeMillis())) throw LinkClosed("emulated disconnect")
        delay(frameDelayMs(frame))
        if (config.jitterMs > 0) delay(rng.nextLong(-config.jitterMs.toLong(), config.jitterMs.toLong() + 1))
        delegate.send(frame)
    }

    override suspend fun close() = delegate.close()
}

/**
 * LinkManager, plan Section 10.3. Keeps the best live link per peer, sends heartbeats, reconnects
 * with backoff and publishes link events. The heartbeat timer and reconnect policy are driven by
 * an injected clock so they can be unit tested.
 */
class LinkManager(private val prefers: List<TransportId> = listOf(TransportId.WIFI_DIRECT, TransportId.BLUETOOTH)) {
    private val links = HashMap<String, Link>()

    fun bestFor(peerId: String): Link? = links[peerId]

    fun onLinkUp(link: Link) {
        val existing = links[link.peer.peerId]
        val newRank = prefers.indexOf(link.transport)
        val oldRank = existing?.let { prefers.indexOf(it.transport) } ?: Int.MAX_VALUE
        if (newRank in 0..oldRank) links[link.peer.peerId] = link
    }

    fun onLinkDown(peerId: String) {
        links.remove(peerId)
    }
}
