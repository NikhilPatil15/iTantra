package dev.itantra.speech

import kotlinx.coroutines.flow.Flow

/**
 * Speech interfaces, plan Sections 9.1–9.3. Concrete engines wrap sherpa-onnx (VAD, ASR, TTS);
 * fakes implement these interfaces so the orchestrator can be tested without a device.
 */

enum class VadEvent { SPEECH_START, SPEECH_END, FORCED_END }

data class AsrWord(
    val text: String,
    val conf: Double,
    val startMs: Int,
    val endMs: Int,
)

data class AsrResult(
    val text: String,
    val words: List<AsrWord>,
    /** Real-time factor: processing time divided by audio duration. */
    val rtf: Double,
)

interface VadEngine {
    /** Feed 16 kHz mono PCM16; emits endpoint events. Frame size is fixed by the model. */
    fun accept(pcm: ShortArray): List<VadEvent>
    fun reset()
}

interface AsrEngine {
    /** Cold-load the model; returns load time in milliseconds. */
    suspend fun load(packDir: String): Long
    /** Returns text and per-word confidence. Never blocks the caller's thread on the WebView. */
    suspend fun transcribe(pcm: ShortArray): AsrResult
    fun close()
}

interface TtsEngine {
    /** Sentence-by-sentence so first audio starts early. */
    fun synthesize(text: String, lang: String, speed: Float = 1.0f): Flow<ShortArray>
    suspend fun load(packDir: String): Long
    fun close()
}

/**
 * Capture, plan Section 9.1: AudioRecord source VOICE_RECOGNITION, 16 kHz mono PCM16, a 30 s ring
 * buffer and 300 ms pre-roll so the first syllable is not clipped.
 */
interface AudioCapture {
    val sampleRateHz: Int
    fun preRollMs(): Int
    fun start()
    fun stop(): ShortArray
}
