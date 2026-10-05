package dev.itantra.speech

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EnergyVadTest {
    private fun run(levels: List<Pair<Int, Int>>, vad: EnergyVad): List<VadEvent> {
        val events = ArrayList<VadEvent>()
        for ((level, frames) in levels) {
            repeat(frames) {
                events.addAll(vad.accept(ShortArray(512) { level.toShort() }))
            }
        }
        return events
    }

    @Test
    fun detectsSpeechThenEndpoint() {
        val vad = EnergyVad()
        val events = run(listOf(0 to 20, 5000 to 10, 0 to 25), vad) // 640 ms silence, 320 ms speech, 800 ms silence
        assertEquals(VadEvent.SPEECH_START, events.first())
        assertEquals(VadEvent.SPEECH_END, events.last())
    }

    @Test
    fun ignoresTooShortBlips() {
        val vad = EnergyVad()
        val events = run(listOf(5000 to 3, 0 to 25), vad) // 96 ms of sound, below the 250 ms minimum
        assertTrue(events.none { it == VadEvent.SPEECH_END }, "short blip should not end speech: $events")
    }

    @Test
    fun forcesEndpointOnLongSpeech() {
        val vad = EnergyVad(maxSpeechMs = 320)
        val events = run(listOf(5000 to 30), vad) // 960 ms of continuous speech
        assertTrue(events.contains(VadEvent.FORCED_END), "expected forced endpoint: $events")
    }

    @Test
    fun resetClearsState() {
        val vad = EnergyVad()
        run(listOf(5000 to 10), vad)
        vad.reset()
        val events = run(listOf(0 to 30), vad)
        assertTrue(events.isEmpty(), "silence after reset should not emit: $events")
    }
}
