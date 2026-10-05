package dev.itantra.engine

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class MetricsTest {
    @Test
    fun csvHasThePlannedColumnsAndRows() {
        val recorder = MetricsRecorder()
        recorder.record(
            TimelineRecord(
                messageId = "m1", lang = "hi", priority = 0,
                tSpeechEndMs = 0, tAsrDoneMs = 1200, tAcceptMs = 1800, tLinkWriteMs = 1810,
                tLinkRecvMs = 2100, tTtsFirstAudioMs = 2400, tAckMs = 2600,
                bytesFrame = 42, bytesText = 24, chars = 22, words = 4, attempts = 1,
                emulatorConfig = "1 kbps",
            ),
        )
        val csv = recorder.toCsv()
        val lines = csv.trim().split("\n")
        assertEquals(MetricsRecorder.COLUMNS.joinToString(","), lines[0])
        assertEquals(2, lines.size)
        assertTrue(lines[0].contains("emulator_config"))
        assertTrue(csv.contains("1 kbps"))
    }

    @Test
    fun roundTripAndEndToEndAreDerived() {
        val record = TimelineRecord(
            messageId = "m1", lang = "hi", priority = 2,
            tSpeechEndMs = 1000, tLinkWriteMs = 2000, tTtsFirstAudioMs = 5000, tAckMs = 3000,
            clockOffsetMs = 200,
        )
        assertEquals(1000, record.roundTripMs)
        assertEquals(3800, record.estimatedEndToEndMs)
    }

    @Test
    fun missingTimesBecomeEmptyCells() {
        val recorder = MetricsRecorder()
        recorder.record(TimelineRecord(messageId = "m2", lang = "en", priority = 0))
        val cells = recorder.toCsv().trim().split("\n")[1].split(",")
        assertEquals(MetricsRecorder.COLUMNS.size, cells.size)
        assertEquals("m2", cells[0])
        assertEquals("", cells[1])
    }
}
