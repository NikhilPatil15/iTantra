package dev.itantra.packs

import java.io.File
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Critical-token guard, plan Section 9.2. Digits and a small emergency lexicon must be confirmed
 * before sending whenever their confidence is low, even in hands-free mode.
 */
@Serializable
data class CriticalEntry(val word: String, val category: String)

@Serializable
data class CriticalLexicon(
    val version: Int,
    val lang: String,
    val note: String? = null,
    val reviewed: Boolean = false,
    val numberWords: List<String> = emptyList(),
    val lexicon: List<CriticalEntry> = emptyList(),
)

data class GuardToken(val text: String, val conf: Double, val low: Boolean)

data class GuardResult(
    val criticalFlags: List<Boolean>,
    val forcedConfirm: Boolean,
    val criticalWords: List<String>,
)

class CriticalGuard(private val critical: Set<String>) {
    fun isCritical(text: String): Boolean = text.any { it.isDigit() } || critical.contains(text)

    fun evaluate(tokens: List<GuardToken>): GuardResult {
        val flags = tokens.map { isCritical(it.text) }
        val forced = tokens.indices.any { flags[it] && tokens[it].low }
        val words = tokens.filterIndexed { index, _ -> flags[index] }.map { it.text }
        return GuardResult(flags, forced, words)
    }

    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun from(lexicon: CriticalLexicon): CriticalGuard =
            CriticalGuard((lexicon.numberWords + lexicon.lexicon.map { it.word }).toSet())

        fun load(file: File): CriticalGuard = from(json.decodeFromString(file.readText()))
    }
}
