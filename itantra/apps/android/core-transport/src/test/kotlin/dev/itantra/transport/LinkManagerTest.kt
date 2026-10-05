package dev.itantra.transport

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow

private class FakeLink(override val peer: PeerRef, override val transport: TransportId) : Link {
    override val mtu: Int? = null
    override val incoming: Flow<ByteArray> = emptyFlow()
    private val _closed = MutableStateFlow(false)
    override val closed: StateFlow<Boolean> = _closed
    override suspend fun send(frame: ByteArray) {}
    override suspend fun close() {
        _closed.value = true
    }
}

class LinkManagerTest {
    private fun peer(id: String) = PeerRef(id, id, TransportId.BLUETOOTH)

    @Test
    fun prefersWifiDirectOverBluetooth() {
        val manager = LinkManager()
        val peer = peer("ravi")
        manager.onLinkUp(FakeLink(peer, TransportId.BLUETOOTH))
        manager.onLinkUp(FakeLink(peer, TransportId.WIFI_DIRECT))
        assertEquals(TransportId.WIFI_DIRECT, manager.bestFor("ravi")?.transport)
    }

    @Test
    fun keepsThePreferredLinkWhenAWorseOneAppears() {
        val manager = LinkManager()
        val peer = peer("ravi")
        manager.onLinkUp(FakeLink(peer, TransportId.WIFI_DIRECT))
        manager.onLinkUp(FakeLink(peer, TransportId.BLUETOOTH))
        assertEquals(TransportId.WIFI_DIRECT, manager.bestFor("ravi")?.transport)
    }

    @Test
    fun linkDownRemovesThePeer() {
        val manager = LinkManager()
        val peer = peer("ravi")
        manager.onLinkUp(FakeLink(peer, TransportId.BLUETOOTH))
        manager.onLinkDown("ravi")
        assertNull(manager.bestFor("ravi"))
    }
}
