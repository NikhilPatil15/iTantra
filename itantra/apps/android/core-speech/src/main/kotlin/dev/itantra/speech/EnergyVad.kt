package dev.itantra.speech

import kotlin.math.sqrt

/**
 * Lightweight energy VAD, plan Section 9.1. This is the deterministic fallback used in tests and
 * on the desktop; the shipping voice-activity detector is Silero VAD through sherpa-onnx, and both
 * implement [VadEngine]. Defaults match the plan: endpoint after 700 ms of silence, minimum speech
 * 250 ms, forced endpoint at 15 s.
 *
 * Frame size defaults to 512 samples (Silero's 16 kHz frame); callers may feed any chunk length and
 * frames are buffered internally.
 */
class EnergyVad(
    private val threshold: Int = 500,
    private val sampleRateHz: Int = 16_000,
    private val frameLen: Int = 512,
    private val endpointSilenceMs: Int = 700,
    private val minSpeechMs: Int = 250,
    private val maxSpeechMs: Int = 15_000,
) : VadEngine {
    private val buffer = ShortArray(frameLen)
    private var filled = 0
    private var inSpeech = false
    private var speechMs = 0
    private var voicedMs = 0
    private var silenceMs = 0

    override fun accept(pcm: ShortArray): List<VadEvent> {
        val events = ArrayList<VadEvent>()
        var i = 0
        while (i < pcm.size) {
            val n = minOf(frameLen - filled, pcm.size - i)
            System.arraycopy(pcm, i, buffer, filled, n)
            filled += n
            i += n
            if (filled == frameLen) {
                processFrame(events)
                filled = 0
            }
        }
        return events
    }

    private fun processFrame(events: MutableList<VadEvent>) {
        val frameMs = frameLen * 1000 / sampleRateHz
        val speaking = rms(buffer) > threshold
        if (!inSpeech) {
            if (speaking) {
                inSpeech = true
                speechMs = frameMs
                voicedMs = frameMs
                silenceMs = 0
                events.add(VadEvent.SPEECH_START)
            }
            return
        }
        speechMs += frameMs
        if (speaking) {
            voicedMs += frameMs
            silenceMs = 0
        } else {
            silenceMs += frameMs
        }
        when {
            silenceMs >= endpointSilenceMs && voicedMs >= minSpeechMs -> {
                inSpeech = false
                events.add(VadEvent.SPEECH_END)
            }
            // Too short to be speech: drop it without emitting an endpoint.
            silenceMs >= endpointSilenceMs -> {
                inSpeech = false
            }
            speechMs >= maxSpeechMs -> {
                inSpeech = false
                events.add(VadEvent.FORCED_END)
            }
        }
    }

    override fun reset() {
        filled = 0
        inSpeech = false
        speechMs = 0
        voicedMs = 0
        silenceMs = 0
    }

    companion object {
        fun rms(frame: ShortArray): Int {
            var sum = 0.0
            for (x in frame) {
                val v = x.toInt().toDouble()
                sum += v * v
            }
            return sqrt(sum / frame.size).toInt()
        }
    }
}
