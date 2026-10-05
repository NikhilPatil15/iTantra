package dev.itantra.engine

import dev.itantra.protocol.Priority
import dev.itantra.transport.Link
import dev.itantra.transport.LoopbackTransport
import dev.itantra.transport.PeerRef
import dev.itantra.transport.TransportId
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout

class LinkedEngineTest {
    private val key = ByteArray(32) { (it + 1).toByte() }
    private val salt = byteArrayOf(9, 8, 7, 6)

    private suspend fun pair(scope: CoroutineScope): Triple<LinkedEngine, LinkedEngine, Link> {
        val transport = LoopbackTransport()
        val remoteDeferred = scope.async { transport.incomingLinks().first() }
        val local = transport.connect(PeerRef("peer-b", "B", TransportId.LOOPBACK)).getOrThrow()
        val remote = remoteDeferred.await()
        val alice = LinkedEngine(local, ProtocolSession(key, salt, senderId = 1), scope)
        val bob = LinkedEngine(remote, ProtocolSession(key, salt, senderId = 2), scope)
        return Triple(alice, bob, remote)
    }

    @Test
    fun sendWritesARealFrameThatThePeerDecodes() = runBlocking {
        val (alice, bob, remote) = pair(this)
        val frameDeferred = async { remote.incoming.first() }
        val bytes = alice.send("नदी का पानी बढ़ रहा है", "hi")
        assertTrue(bytes > 12 + 16)
        val frame = withTimeout(2000) { frameDeferred.await() }
        assertEquals(bytes, frame.size)

        val messages = bob.receiveFrame(frame)
        assertEquals(1, messages.size)
        assertEquals("नदी का पानी बढ़ रहा है", messages[0].text)
        assertEquals("hi", messages[0].lang)
    }

    @Test
    fun alertFrameReachesThePeer() = runBlocking {
        val (alice, bob, remote) = pair(this)
        val frameDeferred = async { remote.incoming.first() }
        alice.send("मदद चाहिए", "hi", Priority.ALERT)
        val frame = withTimeout(2000) { frameDeferred.await() }
        assertEquals("मदद चाहिए", bob.receiveFrame(frame).single().text)
    }

    @Test
    fun duplicateFrameIsIgnoredByTheReceiver() = runBlocking {
        val (alice, bob, remote) = pair(this)
        val frameDeferred = async { remote.incoming.first() }
        alice.send("पानी", "hi")
        val frame = withTimeout(2000) { frameDeferred.await() }
        assertEquals(1, bob.receiveFrame(frame).size)
        assertEquals(0, bob.receiveFrame(frame).size) // same frame again is a duplicate
    }
}
