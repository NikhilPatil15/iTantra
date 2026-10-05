package dev.itantra.transport

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.test.runTest

private class RecordingLink : Link {
    val sent = mutableListOf<ByteArray>()
    override val peer = PeerRef("peer", "Peer", TransportId.LOOPBACK)
    override val transport = TransportId.LOOPBACK
    override val mtu: Int? = null
    override val incoming: Flow<ByteArray> = emptyFlow()
    private val _closed = MutableStateFlow(false)
    override val closed: StateFlow<Boolean> = _closed
    override suspend fun send(frame: ByteArray) {
        sent.add(frame)
    }
    override suspend fun close() {
        _closed.value = true
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class EmulatedLinkTest {
    @Test
    fun totalLossDropsTheFrame() = runTest {
        val delegate = RecordingLink()
        val link = EmulatedLink(delegate, EmulatorConfig(lossPercent = 100.0))
        link.send(ByteArray(40))
        assertEquals(0, delegate.sent.size)
    }

    @Test
    fun zeroLossForwardsAfterSerialisation() = runTest {
        val delegate = RecordingLink()
        val link = EmulatedLink(delegate, EmulatorConfig(rateBps = 8000, lossPercent = 0.0))
        link.send(ByteArray(100)) // 100 B * 8 / 8000 bps = 100 ms
        assertEquals(1, delegate.sent.size)
        assertTrue(testScheduler.currentTime >= 90, "expected a serialisation delay, time=${testScheduler.currentTime}")
    }

    @Test
    fun loraModelDelaysAboutOneSecondForHundredBytes() = runTest {
        val delegate = RecordingLink()
        val model = AirtimeModel(spreadingFactor = 11, bandwidthHz = 250_000, codingRateDenominator = 5, preambleSymbols = 16)
        val link = EmulatedLink(delegate, EmulatorConfig(airtimeModel = model))
        link.send(ByteArray(100))
        assertEquals(1, delegate.sent.size)
        assertTrue(testScheduler.currentTime in 900..1150, "LoRa SF11 100 B airtime was ${testScheduler.currentTime} ms")
    }
}
