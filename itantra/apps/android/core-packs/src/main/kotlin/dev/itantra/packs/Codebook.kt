package dev.itantra.packs

import java.io.File
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Preset alert codebooks, plan Section 9.6. A message carries only the id plus the codebook
 * version; the receiver looks up its own language text, so a preset alert works even if
 * recognition is poor. A version mismatch speaks nothing and shows "codebook mismatch".
 */
@Serializable
data class CodebookPhrase(val id: Int, val text: String, val en: String? = null, val reviewed: Boolean = false)

@Serializable
data class Codebook(
    val version: Int,
    val lang: String,
    val note: String? = null,
    val phrases: List<CodebookPhrase>,
)

sealed interface PhraseLookup {
    data class Found(val text: String, val reviewed: Boolean) : PhraseLookup
    data object NotFound : PhraseLookup
    data object VersionMismatch : PhraseLookup
}

object CodebookLoader {
    private val json = Json { ignoreUnknownKeys = true }

    fun parse(text: String): Codebook = json.decodeFromString(text)
    fun load(file: File): Codebook = parse(file.readText())
}

fun Codebook.lookup(id: Int, expectedVersion: Int): PhraseLookup {
    if (version != expectedVersion) return PhraseLookup.VersionMismatch
    val phrase = phrases.firstOrNull { it.id == id } ?: return PhraseLookup.NotFound
    return PhraseLookup.Found(phrase.text, phrase.reviewed)
}
