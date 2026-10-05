package dev.itantra.transport

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

/**
 * Transport and link interfaces, plan Section 10.1. Implementation modules: BluetoothTransport,
 * WifiDirectTransport (Android); LoopbackTransport and EmulatedLink (pure, testable).
 */

enum class TransportId { BLUETOOTH, WIFI_DIRECT, NEARBY, LORA_MESHTASTIC, LOOPBACK }

enum class TransportState { IDLE, DISCOVERING, LISTENING, CONNECTING, CONNECTED, ERROR, DISABLED }

data class PeerRef(
    val peerId: String,
    val displayName: String,
    val transport: TransportId,
    val address: String? = null,
)

class LinkClosed(message: String) : Exception(message)

interface Link {
    val peer: PeerRef
    val transport: TransportId

    /** null for stream links. */
    val mtu: Int?

    /** Whole frames. Stream links add and strip the 2-byte length prefix themselves. */
    val incoming: Flow<ByteArray>

    suspend fun send(frame: ByteArray)
    val closed: StateFlow<Boolean>
    suspend fun close()
}

interface Transport {
    val id: TransportId
    val state: StateFlow<TransportState>

    /** Nearby candidates. */
    fun discover(): Flow<PeerRef>

    suspend fun listen()
    suspend fun connect(peer: PeerRef): Result<Link>
    fun incomingLinks(): Flow<Link>
    suspend fun shutdown()
}
