package dev.itantra.protocol

import java.text.Normalizer

/** Language registry and script-aware coding, plan Sections 7.2 and 7.3 (contribution C1). */

data class Language(
    val index: Int,
    val code: String,
    val displayName: String,
    val script: String,
    val scriptWindowBase: Int?,
)

object Languages {
    val all: List<Language> = listOf(
        Language(0, "en", "English", "Latin", null),
        Language(1, "hi", "हिन्दी", "Devanagari", 0x0900),
        Language(2, "mr", "मराठी", "Devanagari", 0x0900),
        Language(3, "gu", "ગુજરાતી", "Gujarati", 0x0a80),
        Language(4, "bn", "বাংলা", "Bengali", 0x0980),
        Language(5, "ta", "தமிழ்", "Tamil", 0x0b80),
        Language(6, "te", "తెలుగు", "Telugu", 0x0c00),
        Language(7, "kn", "ಕನ್ನಡ", "Kannada", 0x0c80),
        Language(8, "ml", "മലയാളം", "Malayalam", 0x0d00),
        Language(9, "or", "ଓଡ଼ିଆ", "Odia", 0x0b00),
        Language(10, "pa", "ਪੰਜਾਬੀ", "Gurmukhi", 0x0a00),
    )

    val windowBases = intArrayOf(0x0900, 0x0980, 0x0a00, 0x0a80, 0x0b00, 0x0b80, 0x0c00, 0x0c80, 0x0d00)

    fun byCode(code: String): Language = all.firstOrNull { it.code == code }
        ?: throw IllegalArgumentException("unknown language code $code")

    fun windowIndexForBase(base: Int): Int {
        val idx = Math.round((base - 0x0900) / 128.0).toInt()
        require(idx in windowBases.indices) { "window base out of range" }
        return idx
    }

    fun windowFor(codePoint: Int): Int? {
        for (base in windowBases) if (codePoint in base..base + 0x7f) return base
        return null
    }
}

object ScriptCodec {
    private const val TAG_SWITCH = 0x05
    private const val TAG_BMP = 0x01
    private const val TAG_SUPPLEMENTARY = 0x02
    private const val TAG_ZWJ = 0x03
    private const val TAG_ZWNJ = 0x04
    private const val TAG_DANDA = 0x06
    private const val TAG_DOUBLE_DANDA = 0x07

    private const val ZWJ = 0x200d
    private const val ZWNJ = 0x200c
    private const val DANDA = 0x0964
    private const val DOUBLE_DANDA = 0x0965

    fun normalize(input: String): String {
        val nfc = Normalizer.normalize(input, Normalizer.Form.NFC)
        val sb = StringBuilder(nfc.length)
        for (ch in nfc) {
            val cp = ch.code
            sb.append(if (cp == 0x0a || cp >= 0x20 && cp != 0x7f || cp > 0x7f) ch else ' ')
        }
        return sb.toString()
    }

    fun encode(text: String, langCode: String): ByteArray {
        var window = Languages.byCode(langCode).scriptWindowBase
        val out = ArrayList<Byte>(text.length + 8)
        var i = 0
        val s = normalize(text)
        while (i < s.length) {
            val cp = s.codePointAt(i)
            when (cp) {
                ZWJ -> out.add(TAG_ZWJ.toByte())
                ZWNJ -> out.add(TAG_ZWNJ.toByte())
                DANDA -> out.add(TAG_DANDA.toByte())
                DOUBLE_DANDA -> out.add(TAG_DOUBLE_DANDA.toByte())
                else -> {
                    if (cp == 0x0a || cp in 0x20..0x7e) {
                        out.add(cp.toByte())
                    } else if (window != null && cp in window!!..window!! + 0x7f) {
                        out.add((0x80 + (cp - window!!)).toByte())
                    } else {
                        val target = Languages.windowFor(cp)
                        if (target != null) {
                            out.add(TAG_SWITCH.toByte())
                            out.add(Languages.windowIndexForBase(target).toByte())
                            out.add((0x80 + (cp - target)).toByte())
                            window = target
                        } else if (cp <= 0xffff) {
                            out.add(TAG_BMP.toByte())
                            out.add(((cp shr 8) and 0xff).toByte())
                            out.add((cp and 0xff).toByte())
                        } else {
                            out.add(TAG_SUPPLEMENTARY.toByte())
                            out.add(((cp shr 16) and 0xff).toByte())
                            out.add(((cp shr 8) and 0xff).toByte())
                            out.add((cp and 0xff).toByte())
                        }
                    }
                }
            }
            i += Character.charCount(cp)
        }
        return out.toByteArray()
    }

    fun decode(bytes: ByteArray, langCode: String): String {
        var window = Languages.byCode(langCode).scriptWindowBase
        val sb = StringBuilder(bytes.size)
        var i = 0
        while (i < bytes.size) {
            val b = bytes[i].toInt() and 0xff
            when {
                b == TAG_SWITCH -> {
                    require(i + 1 < bytes.size) { "truncated window switch" }
                    val idx = bytes[i + 1].toInt() and 0xff
                    require(idx in Languages.windowBases.indices) { "invalid window index $idx" }
                    window = Languages.windowBases[idx]
                    i += 2
                }
                b == TAG_BMP -> {
                    require(i + 2 < bytes.size) { "truncated BMP escape" }
                    sb.appendCodePoint(((bytes[i + 1].toInt() and 0xff) shl 8) or (bytes[i + 2].toInt() and 0xff))
                    i += 3
                }
                b == TAG_SUPPLEMENTARY -> {
                    require(i + 3 < bytes.size) { "truncated supplementary escape" }
                    val cp = ((bytes[i + 1].toInt() and 0xff) shl 16) or
                        ((bytes[i + 2].toInt() and 0xff) shl 8) or (bytes[i + 3].toInt() and 0xff)
                    sb.appendCodePoint(cp)
                    i += 4
                }
                b == TAG_ZWJ -> { sb.appendCodePoint(ZWJ); i++ }
                b == TAG_ZWNJ -> { sb.appendCodePoint(ZWNJ); i++ }
                b == TAG_DANDA -> { sb.appendCodePoint(DANDA); i++ }
                b == TAG_DOUBLE_DANDA -> { sb.appendCodePoint(DOUBLE_DANDA); i++ }
                b == 0x0a || b in 0x20..0x7e -> { sb.append(b.toChar()); i++ }
                b >= 0x80 -> {
                    require(window != null) { "window byte without a script window" }
                    sb.appendCodePoint(window!! + (b - 0x80))
                    i++
                }
                else -> throw IllegalArgumentException("invalid script-coding byte 0x${b.toString(16)}")
            }
        }
        return sb.toString()
    }
}

/** Confidence bitmap, plan Section 7.3. */
object Confidence {
    fun byteLength(wordCount: Int): Int = (wordCount + 7) / 8

    fun encode(lowByWord: BooleanArray): ByteArray {
        val out = ByteArray(byteLength(lowByWord.size))
        for (i in lowByWord.indices) if (lowByWord[i]) out[i shr 3] = (out[i shr 3].toInt() or (0x80 shr (i and 7))).toByte()
        return out
    }

    fun decode(bytes: ByteArray, wordCount: Int): BooleanArray {
        val out = BooleanArray(wordCount)
        for (i in 0 until wordCount) {
            val b = bytes[i shr 3].toInt() and 0xff
            out[i] = (b and (0x80 shr (i and 7))) != 0
        }
        return out
    }

    fun countWords(text: String): Int = if (text.isEmpty()) 0 else text.split(" ").size
}

/** Stream framing, `[len:uint16][frame]`. push never throws (plan T14). */
class FrameReader {
    private var buf = ByteArray(0)
    var dropped: Int = 0
        private set

    val bufferedBytes: Int get() = buf.size

    fun push(chunk: ByteArray): List<ByteArray> {
        buf += chunk
        val frames = ArrayList<ByteArray>()
        var offset = 0
        while (buf.size - offset >= 2) {
            val len = ((buf[offset].toInt() and 0xff) shl 8) or (buf[offset + 1].toInt() and 0xff)
            if (len == 0 || len > MAX_FRAME_BYTES) {
                buf = ByteArray(0)
                dropped++
                return frames
            }
            if (buf.size - offset < 2 + len) break
            frames.add(buf.copyOfRange(offset + 2, offset + 2 + len))
            offset += 2 + len
        }
        buf = buf.copyOfRange(offset, buf.size)
        return frames
    }
}
