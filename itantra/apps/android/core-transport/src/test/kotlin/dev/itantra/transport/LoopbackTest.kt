package dev.itantra.transport

import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout

class LoopbackTest {
    @Test
    fun twoEndsExchangeWholeFrames() = runTest {
        val transport = LoopbackTransport()
        val remoteDeferred = async { transport.incomingLinks().first() }
        val local = transport.connect(PeerRef("peer-b", "B", TransportId.LOOPBACK)).getOrThrow()
        val remote = remoteDeferred.await()

        local.send("नदी".toByteArray(Charsets.UTF_8))
        assertContentEquals("नदी".toByteArray(Charsets.UTF_8), withTimeout(1000) { remote.incoming.first() })

        remote.send(byteArrayOf(1, 2, 3))
        assertContentEquals(byteArrayOf(1, 2, 3), withTimeout(1000) { local.incoming.first() })
    }

    @Test
    fun sendingOnAClosedLinkThrows() = runTest {
        val transport = LoopbackTransport()
        val remoteDeferred = async { transport.incomingLinks().first() }
        val local = transport.connect(PeerRef("peer-b", "B", TransportId.LOOPBACK)).getOrThrow()
        remoteDeferred.await()
        local.close()
        var threw = false
        try {
            local.send(byteArrayOf(9))
        } catch (e: LinkClosed) {
            threw = true
        }
        assertEquals(true, threw)
        assertEquals(true, local.closed.value)
    }
}
