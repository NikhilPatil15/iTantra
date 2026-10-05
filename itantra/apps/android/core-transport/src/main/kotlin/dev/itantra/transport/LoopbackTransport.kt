package dev.itantra.transport

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.receiveAsFlow

/**
 * In-process transport (plan Section 10.2). `connect` returns the local end of a pair and publishes
 * the remote end on `incomingLinks`, so two engines in one process can exchange whole frames in
 * tests without any radio.
 */
class LoopbackTransport(private val localName: String = "loopback-local") : Transport {
    override val id: TransportId = TransportId.LOOPBACK

    private val _state = MutableStateFlow(TransportState.IDLE)
    override val state: StateFlow<TransportState> = _state

    private val links = MutableSharedFlow<Link>(replay = 1, extraBufferCapacity = 15)
    private val localPeer = PeerRef("loopback-local", localName, TransportId.LOOPBACK)

    override fun discover(): Flow<PeerRef> = emptyFlow()

    override suspend fun listen() {
        _state.value = TransportState.LISTENING
    }

    override suspend fun connect(peer: PeerRef): Result<Link> {
        _state.value = TransportState.CONNECTING
        val toPeer = Channel<ByteArray>(Channel.BUFFERED)
        val toLocal = Channel<ByteArray>(Channel.BUFFERED)
        val local = LoopbackLink(localPeer, toPeer, toLocal)
        val remote = LoopbackLink(peer, toLocal, toPeer)
        links.emit(remote)
        _state.value = TransportState.CONNECTED
        return Result.success(local)
    }

    override fun incomingLinks(): Flow<Link> = links

    override suspend fun shutdown() {
        _state.value = TransportState.IDLE
    }
}

private class LoopbackLink(
    override val peer: PeerRef,
    private val outgoing: Channel<ByteArray>,
    private val incomingChannel: Channel<ByteArray>,
) : Link {
    override val transport: TransportId = TransportId.LOOPBACK
    override val mtu: Int? = null
    override val incoming: Flow<ByteArray> = incomingChannel.receiveAsFlow()

    private val _closed = MutableStateFlow(false)
    override val closed: StateFlow<Boolean> = _closed

    override suspend fun send(frame: ByteArray) {
        if (_closed.value) throw LinkClosed("loopback link is closed")
        outgoing.send(frame)
    }

    override suspend fun close() {
        _closed.value = true
        outgoing.close()
        incomingChannel.close()
    }
}
