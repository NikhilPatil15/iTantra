package dev.itantra.packs

import java.security.MessageDigest
import java.io.File

/** Pack manifest, plan Section 9.5. */

enum class LicenseClass { PERMISSIVE, SHARE_ALIKE, NON_COMMERCIAL }

enum class PackStatus { VERIFIED, EXPERIMENTAL, DISABLED }

data class PackFileRef(val name: String, val sha256: String, val bytes: Long)

data class ConfidenceConfig(val tau: Double?, val calibratedOn: String?, val precision: Double?)

data class PackComponent(
    val engine: String,
    val files: List<PackFileRef>,
    val sampleRate: Int,
    val license: String,
    val licenseClass: LicenseClass,
    val source: String,
)

data class PackManifest(
    val id: String,
    val langIndex: Int,
    val displayName: String,
    val script: String,
    val scriptWindowBase: Int?,
    val version: Int,
    val status: PackStatus,
    val asr: PackComponent,
    val asrConfidence: ConfidenceConfig,
    val tts: PackComponent,
    val ttsDigitsNeedExpansion: Boolean?,
    val codebook: String,
    val critical: String,
    val selfTestText: String,
    val selfTestMaxWer: Double?,
)

sealed class PackValidation {
    data class Valid(val totalBytes: Long) : PackValidation()
    data class Invalid(val errors: List<String>) : PackValidation()
}

object PackValidator {
    fun validate(manifest: PackManifest, packDir: File): PackValidation {
        val errors = ArrayList<String>()
        if (manifest.id.isEmpty()) errors.add("id must not be empty")
        if (manifest.langIndex !in 0..255) errors.add("langIndex must be 0..255")
        var total = 0L
        for ((label, component) in listOf("asr" to manifest.asr, "tts" to manifest.tts)) {
            if (component.files.isEmpty()) errors.add("$label.files must not be empty")
            for (file in component.files) {
                total += file.bytes
                val f = File(packDir, file.name)
                if (!f.exists()) {
                    errors.add("$label/${file.name} is missing")
                } else if (!file.sha256.matches(Regex("^[0-9a-f]{64}$")) || sha256(f) != file.sha256) {
                    errors.add("$label/${file.name} failed its checksum")
                }
            }
        }
        return if (errors.isEmpty()) PackValidation.Valid(total) else PackValidation.Invalid(errors)
    }

    fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { stream ->
            val buffer = ByteArray(64 * 1024)
            while (true) {
                val read = stream.read(buffer)
                if (read <= 0) break
                digest.update(buffer, 0, read)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}
