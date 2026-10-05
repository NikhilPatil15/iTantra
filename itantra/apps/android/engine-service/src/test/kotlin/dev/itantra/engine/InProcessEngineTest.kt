package dev.itantra.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

class InProcessEngineTest {
    @Test
    fun readbackCarriesWordConfidenceAndFlagsCriticalLowWords() = runTest {
        val engine = InProcessEngine()
        val readback = engine.beginTalk("hi", ShortArray(16_000) { 1200 })
        assertEquals(9, readback.words.size)
        assertTrue(readback.words.count { it.low } >= 2, "expected at least two low-confidence words")
        assertTrue(readback.mustConfirm)
        // पानी (0.42) and बढ़ (0.31) are low; नदी is critical but confident, पानी is critical and low.
        assertTrue(readback.criticalLow)
    }

    @Test
    fun acceptingTheReadbackSendsItThroughTheRealWirePath() = runTest {
        val engine = InProcessEngine()
        val readback = engine.beginTalk("hi", ShortArray(16_000) { 1200 })
        val message = engine.acceptReadback(readback)
        assertEquals("out", message.direction)
        assertEquals("acked", message.state)
        assertEquals(readback.text, message.text)
        assertTrue(message.bytes > 12 + 16, "frame should exceed header + tag")
        assertEquals(1, engine.transcript.size)
    }

    @Test
    fun editedTextIsWhatTravels() = runTest {
        val engine = InProcessEngine()
        val readback = engine.beginTalk("hi", ShortArray(16_000) { 1200 })
        val message = engine.acceptReadback(readback, editedText = "पानी बढ़ रहा है")
        assertEquals("पानी बढ़ रहा है", message.text)
    }

    @Test
    fun metricsRowIsProducedForEachSentMessage() = runTest {
        val engine = InProcessEngine()
        val readback = engine.beginTalk("hi", ShortArray(16_000) { 1200 })
        engine.acceptReadback(readback)
        val csv = engine.metricsCsv().trim().split("\n")
        assertEquals(2, csv.size)
        assertTrue(csv[0].startsWith("message_id,"))
        assertTrue(csv[1].contains("loopback"))
    }

    @Test
    fun alertIsDeliveredWithAlertPriority() = runTest {
        val engine = InProcessEngine()
        val message = engine.sendAlert(1, "hi", "मदद चाहिए")
        assertEquals("alert", message.priority)
        assertEquals("played", message.state)
        assertFalse(message.text.isEmpty())
    }
}
