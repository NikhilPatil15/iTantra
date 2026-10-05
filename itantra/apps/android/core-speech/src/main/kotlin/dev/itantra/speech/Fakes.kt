package dev.itantra.speech

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

/**
 * Deterministic speech fakes. They let the orchestrator, the wire path and the UI be built and
 * tested without a device or an ASR model; the real engines wrap sherpa-onnx behind the same
 * interfaces. Marked clearly as fakes so no one mistakes them for recognition quality.
 */

class ScriptedAsrEngine(
    private val script: List<AsrWord> = DEFAULT,
) : AsrEngine {
    override suspend fun load(packDir: String): Long = 0

    override suspend fun transcribe(pcm: ShortArray): AsrResult {
        require(pcm.isNotEmpty()) { "empty audio" }
        return AsrResult(text = script.joinToString(" ") { it.text }, words = script, rtf = 0.4)
    }

    override fun close() {}

    companion object {
        val DEFAULT = listOf(
            AsrWord("नदी", 0.97, 0, 300),
            AsrWord("का", 0.99, 300, 400),
            AsrWord("पानी", 0.42, 400, 800),
            AsrWord("तेजी", 0.88, 800, 1100),
            AsrWord("से", 0.95, 1100, 1200),
            AsrWord("बढ़", 0.31, 1200, 1500),
            AsrWord("रहा", 0.90, 1500, 1800),
            AsrWord("है", 0.98, 1800, 1900),
            AsrWord("नदी", 0.94, 1900, 2200),
        )
    }
}

/** Emits one short silent PCM chunk per sentence; enough to make the playback queue real. */
class SilentTtsEngine(private val chunkSamples: Int = 1600) : TtsEngine {
    override fun synthesize(text: String, lang: String, speed: Float): Flow<ShortArray> = flow {
        val sentences = text.split('.', '।', '?', '!').filter { it.isNotBlank() }
        for (sentence in sentences) {
            emit(ShortArray(chunkSamples))
            emit(ShortArray(chunkSamples))
            require(sentence.isNotEmpty())
        }
    }

    override suspend fun load(packDir: String): Long = 0
    override fun close() {}
}
