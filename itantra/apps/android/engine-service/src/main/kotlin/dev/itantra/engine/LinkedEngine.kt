package dev.itantra.engine

import dev.itantra.protocol.Priority
import dev.itantra.transport.Link
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch

/**
 * Transport-agnostic engine: it sends and receives whole frames over a [Link] and uses
 * [ProtocolSession] for the codec, AEAD, de-duplication and reordering. The same class works with
 * `LoopbackTransport` in tests and with `BluetoothTransport` / `WifiDirectTransport` on device, so
 * the field flow does not change when the radio comes online.
 */
class LinkedEngine(
    private val link: Link,
    private val session: ProtocolSession,
    private val scope: CoroutineScope,
    private val now: () -> Long = { System.currentTimeMillis() },
) {
    private val _messages = MutableSharedFlow<InboundMessage>(extraBufferCapacity = 64)
    val messages: SharedFlow<InboundMessage> = _messages

    private var seq = 0
    private var job: Job? = null
    private var lastFrameBytes = 0

    val lastSentFrameBytes: Int get() = lastFrameBytes

    /** Decode, authenticate, de-duplicate and reorder one inbound frame. */
    fun receiveFrame(frame: ByteArray): List<InboundMessage> {
        val outcome = session.receive(frame, now())
        return (outcome as? ReceiveOutcome.Delivered)?.messages ?: emptyList()
    }

    fun start() {
        if (job != null) return
        job = scope.launch {
            link.incoming.collect { frame ->
                receiveFrame(frame).forEach { _messages.emit(it) }
            }
        }
    }

    /** Encode and send a text frame; returns the frame's byte size. */
    suspend fun send(text: String, lang: String, priority: Priority = Priority.ROUTINE): Int {
        val frame = session.buildText(seq = ++seq, lang = lang, text = text, priority = priority)
        link.send(frame)
        lastFrameBytes = frame.size
        return frame.size
    }

    suspend fun stop() {
        job?.cancel()
        job = null
        link.close()
    }
}
