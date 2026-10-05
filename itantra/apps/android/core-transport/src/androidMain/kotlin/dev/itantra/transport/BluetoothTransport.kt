package dev.itantra.transport

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.Context
import java.io.IOException
import java.io.InputStream
import java.util.UUID
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Bluetooth Classic RFCOMM transport, plan Section 10.2. Stream links carry frames as
 * `[len:uint16][frame]`, added and stripped here so protocol code only sees whole frames.
 *
 * Runtime permissions (BLUETOOTH_CONNECT / BLUETOOTH_SCAN on Android 12+) must be granted by the
 * UI before these calls; the app declares them in app.json. This class is Android-only, so it
 * lives in `androidMain` and is compiled into the app, not the pure-JVM test module.
 */
@SuppressLint("MissingPermission")
class BluetoothTransport(
    private val context: Context,
    private val serviceName: String = "iTantra",
    private val uuid: UUID = UUID.fromString("7d9d3c2a-6f4b-4d4e-9c2a-1b2f3e4d5c6b"),
) : Transport {
    override val id: TransportId = TransportId.BLUETOOTH

    private val _state = MutableStateFlow(TransportState.IDLE)
    override val state: StateFlow<TransportState> = _state

    private val links = MutableSharedFlow<Link>(replay = 1, extraBufferCapacity = 15)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var serverSocket: BluetoothServerSocket? = null
    private var acceptJob: Job? = null

    private fun adapter(): BluetoothAdapter? =
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    override fun discover(): Flow<PeerRef> = flow {
        val adapter = adapter() ?: return@flow
        adapter.bondedDevices?.forEach { device ->
            val address = device.address
            val name = device.name ?: address
            emit(PeerRef(address, name, TransportId.BLUETOOTH, address))
        }
    }

    override suspend fun listen() {
        val adapter = adapter()
        if (adapter == null || !adapter.isEnabled) {
            _state.value = TransportState.DISABLED
            return
        }
        serverSocket = adapter.listenUsingRfcommWithServiceRecord(serviceName, uuid)
        _state.value = TransportState.LISTENING
        acceptJob = scope.launch {
            while (isActive) {
                val socket = try {
                    serverSocket?.accept()
                } catch (e: IOException) {
                    null
                } ?: break
                val device = socket.remoteDevice
                val peer = PeerRef(device.address, device.name ?: device.address, TransportId.BLUETOOTH, device.address)
                links.emit(BluetoothLink(peer, socket, scope))
            }
        }
    }

    override suspend fun connect(peer: PeerRef): Result<Link> {
        val adapter = adapter() ?: return Result.failure(LinkClosed("bluetooth not available"))
        if (!adapter.isEnabled) return Result.failure(LinkClosed("bluetooth is off"))
        val address = peer.address ?: return Result.failure(LinkClosed("peer has no bluetooth address"))
        _state.value = TransportState.CONNECTING
        return try {
            val device = withContext(Dispatchers.IO) { adapter.getRemoteDevice(address) }
            val socket = withContext(Dispatchers.IO) {
                device.createRfcommSocketToServiceRecord(uuid).also { it.connect() }
            }
            _state.value = TransportState.CONNECTED
            Result.success(BluetoothLink(peer, socket, scope))
        } catch (e: Exception) {
            _state.value = TransportState.ERROR
            Result.failure(e)
        }
    }

    override fun incomingLinks(): Flow<Link> = links

    override suspend fun shutdown() {
        runCatching { serverSocket?.close() }
        acceptJob?.cancel()
        serverSocket = null
        _state.value = TransportState.IDLE
    }

    fun closeScope() {
        scope.cancel()
    }
}

private class BluetoothLink(
    override val peer: PeerRef,
    private val socket: BluetoothSocket,
    scope: CoroutineScope,
) : Link {
    override val transport: TransportId = TransportId.BLUETOOTH
    override val mtu: Int? = null

    private val _incoming = MutableSharedFlow<ByteArray>(extraBufferCapacity = 32, onBufferOverflow = BufferOverflow.SUSPEND)
    override val incoming: Flow<ByteArray> = _incoming

    private val _closed = MutableStateFlow(false)
    override val closed: StateFlow<Boolean> = _closed

    init {
        scope.launch {
            try {
                val input = socket.inputStream
                while (!_closed.value) {
                    val length = readFully(input, 2)
                    val size = ((length[0].toInt() and 0xff) shl 8) or (length[1].toInt() and 0xff)
                    if (size == 0 || size > 2048) throw IOException("bad frame length $size")
                    _incoming.emit(readFully(input, size))
                }
            } catch (e: IOException) {
                close()
            } catch (e: Exception) {
                close()
            }
        }
    }

    override suspend fun send(frame: ByteArray) {
        if (_closed.value) throw LinkClosed("bluetooth link is closed")
        require(frame.size in 1..2048) { "frame size out of range" }
        val out = socket.outputStream
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
