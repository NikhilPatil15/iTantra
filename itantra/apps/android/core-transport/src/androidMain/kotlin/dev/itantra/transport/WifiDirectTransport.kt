package dev.itantra.transport

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.os.Build
import java.io.IOException
import java.io.InputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/**
 * Wi-Fi Direct transport, plan Section 10.2. Device discovery and group formation use
 * `WifiP2pManager`; the actual bytes move over a TCP socket on a fixed port inside the P2P group.
 * The group owner runs the server; the client connects to the group owner address. OEM behaviour
 * varies, so every stage is expected to be logged to metrics.
 *
 * Android-only: compiled into the app, not the pure-JVM test module.
 */
@SuppressLint("MissingPermission")
class WifiDirectTransport(
    private val context: Context,
    private val port: Int = 8988,
) : Transport {
    override val id: TransportId = TransportId.WIFI_DIRECT

    private val _state = MutableStateFlow(TransportState.IDLE)
    override val state: StateFlow<TransportState> = _state

    private val links = MutableSharedFlow<Link>(replay = 1, extraBufferCapacity = 15)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val manager: WifiP2pManager? = context.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
    private val channel: WifiP2pManager.Channel? = manager?.initialize(context, context.mainLooper) {}
    private var serverSocket: ServerSocket? = null
    private var receiverRegistered = false
    private var pending: CompletableDeferred<Link>? = null

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(ctx: Context?, intent: Intent?) {
            when (intent?.action) {
                WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                    val info = parcelableInfo(intent) ?: return
                    if (!info.groupFormed) return
                    scope.launch {
                        if (info.isGroupOwner) {
                            startServer()
                        } else {
                            val link = connectToOwner(info.groupOwnerAddress?.hostAddress)
                            if (link != null) pending?.complete(link)
                        }
                    }
                }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun parcelableInfo(intent: Intent): WifiP2pInfo? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_INFO, WifiP2pInfo::class.java)
        } else {
            intent.getParcelableExtra(WifiP2pManager.EXTRA_WIFI_P2P_INFO)
        }

    override fun discover(): Flow<PeerRef> = flow {
        val manager = manager ?: return@flow
        val channel = channel ?: return@flow
        ensureReceiver()
        manager.discoverPeers(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() {}
            override fun onFailure(reason: Int) {}
        })
        val peers = CompletableDeferred<List<WifiP2pDevice>>()
        manager.requestPeers(channel) { list -> peers.complete(list.deviceList.toList()) }
        val list = try {
            withTimeout(5000) { peers.await() }
        } catch (e: Exception) {
            emptyList()
        }
        list.forEach { emit(PeerRef(it.deviceAddress, it.deviceName ?: it.deviceAddress, TransportId.WIFI_DIRECT, it.deviceAddress)) }
    }

    override suspend fun listen() {
        ensureReceiver()
        startServer()
    }

    override suspend fun connect(peer: PeerRef): Result<Link> {
        val manager = manager ?: return Result.failure(LinkClosed("wifi direct not available"))
        val channel = channel ?: return Result.failure(LinkClosed("wifi direct channel missing"))
        val address = peer.address ?: return Result.failure(LinkClosed("peer has no address"))
        ensureReceiver()
        _state.value = TransportState.CONNECTING
        val deferred = CompletableDeferred<Link>()
        pending = deferred
        val config = WifiP2pConfig().apply { deviceAddress = address }
        manager.connect(
            channel,
            config,
            object : WifiP2pManager.ActionListener {
                override fun onSuccess() {}
                override fun onFailure(reason: Int) {
                    deferred.completeExceptionally(LinkClosed("wifi direct connect failed ($reason)"))
                }
            },
        )
        return try {
            val link = withTimeout(15_000) { deferred.await() }
            _state.value = TransportState.CONNECTED
            Result.success(link)
        } catch (e: Exception) {
            _state.value = TransportState.ERROR
            Result.failure(e)
        }
    }

    private suspend fun startServer() {
        if (serverSocket != null) return
        serverSocket = ServerSocket(port)
        _state.value = TransportState.LISTENING
        scope.launch {
            while (isActive) {
                val socket = try {
                    serverSocket?.accept()
                } catch (e: IOException) {
                    null
                } ?: break
                val host = socket.inetAddress?.hostAddress ?: "peer"
                links.emit(TcpLink(PeerRef(host, host, TransportId.WIFI_DIRECT, host), socket, scope))
            }
        }
    }

    private suspend fun connectToOwner(host: String?): Link? {
        if (host == null) return null
        return try {
            val socket = Socket()
            socket.connect(InetSocketAddress(host, port), 10_000)
            TcpLink(PeerRef(host, host, TransportId.WIFI_DIRECT, host), socket, scope)
        } catch (e: IOException) {
            null
        }
    }

    override fun incomingLinks(): Flow<Link> = links

    override suspend fun shutdown() {
        runCatching { serverSocket?.close() }
        serverSocket = null
        if (receiverRegistered) {
            runCatching { context.unregisterReceiver(receiver) }
            receiverRegistered = false
        }
        _state.value = TransportState.IDLE
    }

    private fun ensureReceiver() {
        if (receiverRegistered) return
        context.registerReceiver(receiver, IntentFilter(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION))
        receiverRegistered = true
    }
}

private class TcpLink(
    override val peer: PeerRef,
    private val socket: Socket,
    scope: CoroutineScope,
) : Link {
    override val transport: TransportId = TransportId.WIFI_DIRECT
    override val mtu: Int? = null

    private val _incoming = MutableSharedFlow<ByteArray>(extraBufferCapacity = 32, onBufferOverflow = BufferOverflow.SUSPEND)
    override val incoming: Flow<ByteArray> = _incoming

    private val _closed = MutableStateFlow(false)
    override val closed: StateFlow<Boolean> = _closed

    init {
        scope.launch {
            try {
                val input = socket.getInputStream()
                while (!_closed.value) {
                    val length = readFully(input, 2)
                    val size = ((length[0].toInt() and 0xff) shl 8) or (length[1].toInt() and 0xff)
                    if (size == 0 || size > 2048) throw IOException("bad frame length $size")
                    _incoming.emit(readFully(input, size))
                }
            } catch (e: Exception) {
                close()
            }
        }
    }

    override suspend fun send(frame: ByteArray) {
        if (_closed.value) throw LinkClosed("wifi direct link is closed")
        require(frame.size in 1..2048) { "frame size out of range" }
        val out = socket.getOutputStream()
        synchronized(out) {
            out.write(byteArrayOf(((frame.size shr 8) and 0xff).toByte(), (frame.size and 0xff).toByte()))
            out.write(frame)
            out.flush()
        }
    }

    override suspend fun close() {
        if (_closed.value) return
        _closed.value = true
        runCatching { socket.close() }
    }

    private fun readFully(input: InputStream, count: Int): ByteArray {
        val buffer = ByteArray(count)
        var read = 0
        while (read < count) {
            val n = input.read(buffer, read, count - read)
            if (n < 0) throw IOException("stream closed")
            read += n
        }
        return buffer
    }
}
