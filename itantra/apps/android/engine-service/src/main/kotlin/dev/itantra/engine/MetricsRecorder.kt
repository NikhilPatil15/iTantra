package dev.itantra.engine

/**
 * Per-message timeline, plan Section 12.1. Recorded natively and exported as CSV. A one-device
 * figure is a round trip; a two-device figure uses the PING/PONG clock offset and is labelled
 * "estimated end to end".
 */
data class TimelineRecord(
    val messageId: String,
    val lang: String,
    val priority: Int,
    val tSpeechEndMs: Long? = null,
    val tAsrDoneMs: Long? = null,
    val tAcceptMs: Long? = null,
    val tLinkWriteMs: Long? = null,
    val tLinkRecvMs: Long? = null,
    val tTtsFirstAudioMs: Long? = null,
    val tAckMs: Long? = null,
    val bytesFrame: Int? = null,
    val bytesText: Int? = null,
    val chars: Int? = null,
    val words: Int? = null,
    val attempts: Int = 0,
    val emulatorConfig: String? = null,
    val clockOffsetMs: Long? = null,
) {
    /** Round trip on one device: link write to ACK. */
    val roundTripMs: Long? get() = if (tLinkWriteMs != null && tAckMs != null) tAckMs - tLinkWriteMs else null

    /** Estimated end to end across devices, using the PING/PONG clock offset. */
    val estimatedEndToEndMs: Long?
        get() = if (tSpeechEndMs != null && tTtsFirstAudioMs != null && clockOffsetMs != null) {
            tTtsFirstAudioMs - clockOffsetMs - tSpeechEndMs
        } else {
            null
        }
}

class MetricsRecorder {
    private val rows = mutableListOf<TimelineRecord>()

    val size: Int get() = rows.size

    fun record(record: TimelineRecord) {
        rows.add(record)
    }

    fun toCsv(): String {
        val sb = StringBuilder()
        sb.append(COLUMNS.joinToString(",")).append('\n')
        for (row in rows) {
            sb.append(
                listOf(
                    row.messageId, row.tSpeechEndMs, row.tAsrDoneMs, row.tAcceptMs, row.tLinkWriteMs,
                    row.tLinkRecvMs, row.tTtsFirstAudioMs, row.tAckMs, row.bytesFrame, row.bytesText,
                    row.chars, row.words, row.lang, row.priority, row.attempts,
                    row.emulatorConfig ?: "", row.clockOffsetMs, row.roundTripMs, row.estimatedEndToEndMs,
                ).joinToString(",") { it?.toString() ?: "" },
            ).append('\n')
        }
        return sb.toString()
    }

    companion object {
        val COLUMNS = listOf(
            "message_id", "t_speech_end", "t_asr_done", "t_accept", "t_link_write", "t_link_recv",
            "t_tts_first_audio", "t_ack", "bytes_frame", "bytes_text", "chars", "words", "lang",
            "priority", "attempts", "emulator_config", "clock_offset_ms", "round_trip_ms",
            "estimated_end_to_end_ms",
        )
    }
}
