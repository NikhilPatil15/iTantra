package dev.itantra.protocol

import java.nio.ByteBuffer
import java.nio.ByteOrder

// Wire protocol v1, plan Section 7. Pure Kotlin, no Android imports: this module runs in plain
// JVM tests. The TypeScript port in packages/protocol-ts must agree with this file byte for byte,
// enforced by the shared golden vectors in packages/vectors.

const val HEADER_BYTES = 12
const val TAG_BYTES = 16
const val MAX_PAYLOAD_BYTES = 255
const val MAX_FRAME_BYTES = 2048
const val PROTOCOL_VERSION = 1

enum class MessageType(val code: Int) {
    TEXT(0x1), PHRASE(0x2), ALERT_TEXT(0x3), ACK(0x4), HELLO(0x5),
    PACK_OFFER(0x6), PING(0x7), PONG(0x8), LOCATION(0x9);

    companion object {
        fun from(code: Int): MessageType = entries.firstOrNull { it.code == code }
            ?: throw IllegalArgumentException("unknown message type $code")
    }
}

enum class Priority(val code: Int) { ROUTINE(0), URGENT(1), ALERT(2) }

data class Header(
    val type: MessageType,
    val priority: Priority = Priority.ROUTINE,
    val needAck: Boolean = false,
    val hasConf: Boolean = false,
    val fragment: Boolean = false,
    val codebook: Boolean = false,
    val language: Int,
    val senderId: Int,
    val seq: Int,
    val ageSeconds: Int,
    val hops: Int = 0,
    val payloadLen: Int,
    val version: Int = PROTOCOL_VERSION,
    val reserved: Int = 0,
)

object HeaderCodec {
    fun encode(header: Header): ByteArray {
        require(header.version in 0..0xf) { "version out of range" }
        require(header.priority.code in 0..3) { "priority out of range" }
        require(header.reserved in 0..3) { "reserved out of range" }
        require(header.language in 0..0xff) { "language out of range" }
        require(header.payloadLen in 0..MAX_PAYLOAD_BYTES) { "payloadLen out of range" }
        val out = ByteArray(HEADER_BYTES)
        out[0] = ((header.version shl 4) or (header.type.code and 0x0f)).toByte()
        out[1] = (((header.priority.code and 0x03) shl 6) or
            (if (header.needAck) 0x20 else 0) or
            (if (header.hasConf) 0x10 else 0) or
            (if (header.fragment) 0x08 else 0) or
            (if (header.codebook) 0x04 else 0) or
            (header.reserved and 0x03)).toByte()
        out[2] = (header.language and 0xff).toByte()
        out[3] = ((header.senderId shr 8) and 0xff).toByte()
        out[4] = (header.senderId and 0xff).toByte()
        out[5] = ((header.seq shr 8) and 0xff).toByte()
        out[6] = (header.seq and 0xff).toByte()
        out[7] = ((header.ageSeconds shr 8) and 0xff).toByte()
        out[8] = (header.ageSeconds and 0xff).toByte()
        out[9] = (header.hops and 0xff).toByte()
        out[10] = (header.payloadLen and 0xff).toByte()
        out[11] = 0
        return out
    }

    fun decode(bytes: ByteArray): Header {
        require(bytes.size >= HEADER_BYTES) { "short header" }
        val b0 = bytes[0].toInt() and 0xff
        val b1 = bytes[1].toInt() and 0xff
        return Header(
            type = MessageType.from(b0 and 0x0f),
            priority = Priority.entries[b1 ushr 6],
            needAck = (b1 and 0x20) != 0,
            hasConf = (b1 and 0x10) != 0,
            fragment = (b1 and 0x08) != 0,
            codebook = (b1 and 0x04) != 0,
            reserved = b1 and 0x03,
            language = bytes[2].toInt() and 0xff,
            senderId = ((bytes[3].toInt() and 0xff) shl 8) or (bytes[4].toInt() and 0xff),
            seq = ((bytes[5].toInt() and 0xff) shl 8) or (bytes[6].toInt() and 0xff),
            ageSeconds = ((bytes[7].toInt() and 0xff) shl 8) or (bytes[8].toInt() and 0xff),
            hops = bytes[9].toInt() and 0xff,
            payloadLen = bytes[10].toInt() and 0xff,
            version = b0 ushr 4,
        )
    }
}

/** Payload codecs, plan Section 7.2. */
object Payloads {
    fun encodeText(textBytes: ByteArray, conf: ByteArray?): ByteArray {
        val confBytes = conf ?: ByteArray(0)
        require(textBytes.size <= 255 - confBytes.size) { "text payload exceeds 255 bytes" }
        val out = ByteArray(1 + textBytes.size + confBytes.size)
        out[0] = textBytes.size.toByte()
        textBytes.copyInto(out, 1)
        confBytes.copyInto(out, 1 + textBytes.size)
        return out
    }

    fun decodeText(payload: ByteArray): Pair<ByteArray, ByteArray> {
        require(payload.isNotEmpty()) { "empty text payload" }
        val len = payload[0].toInt() and 0xff
        require(1 + len <= payload.size) { "text length exceeds payload" }
        return payload.copyOfRange(1, 1 + len) to payload.copyOfRange(1 + len, payload.size)
    }

    fun encodePhrase(phraseId: Int, codebookVersion: Int): ByteArray = byteArrayOf(
        ((phraseId shr 8) and 0xff).toByte(), (phraseId and 0xff).toByte(), (codebookVersion and 0xff).toByte(),
    )

    fun encodeAck(kind: Int, ackSeq: Int, bitmap: Int): ByteArray = ByteBuffer.allocate(7)
        .order(ByteOrder.BIG_ENDIAN)
        .put(kind.toByte()).putShort(ackSeq.toShort()).putInt(bitmap).array()

    fun encodePing(nonce: Int): ByteArray = ByteBuffer.allocate(4).order(ByteOrder.BIG_ENDIAN).putInt(nonce).array()

    fun encodePong(nonce: Int, responderMonotonicMs: Int): ByteArray = ByteBuffer.allocate(8)
        .order(ByteOrder.BIG_ENDIAN).putInt(nonce).putInt(responderMonotonicMs).array()
}

/** AEAD over the payload with the 12 header bytes as associated data, plan Section 7.1. */
interface Aead {
    /** Returns ciphertext followed by exactly 16 tag bytes. */
    fun seal(key: ByteArray, nonce: ByteArray, aad: ByteArray, plaintext: ByteArray): ByteArray
    /** Throws when the tag does not verify. */
    fun open(key: ByteArray, nonce: ByteArray, aad: ByteArray, ciphertext: ByteArray): ByteArray
}

object FrameCodec {
    fun deriveNonce(salt4: ByteArray, epoch: Int, seq: Int): ByteArray {
        require(salt4.size == 4) { "salt must be 4 bytes" }
        val counter = ((epoch and 0xffff).toLong() shl 16) or (seq and 0xffff).toLong()
        return ByteBuffer.allocate(12).order(ByteOrder.BIG_ENDIAN).put(salt4).putLong(counter).array()
    }

    fun build(
        header: Header,
        payload: ByteArray,
        key: ByteArray? = null,
        nonce: ByteArray? = null,
        aead: Aead? = null,
    ): ByteArray {
        require(payload.size <= MAX_PAYLOAD_BYTES) { "payload exceeds 255 bytes" }
        val headerBytes = HeaderCodec.encode(header.copy(payloadLen = payload.size))
        val needsTag = header.type != MessageType.HELLO
        if (!needsTag) return headerBytes + payload
        require(key != null && nonce != null && aead != null) { "security is required for a tagged frame" }
        val sealed = aead.seal(key, nonce, headerBytes, payload)
        return headerBytes + sealed
    }

    fun parse(
        frame: ByteArray,
        key: ByteArray? = null,
        nonce: ByteArray? = null,
        aead: Aead? = null,
    ): Pair<Header, ByteArray> {
        require(frame.size >= HEADER_BYTES) { "frame shorter than header" }
        val headerBytes = frame.copyOfRange(0, HEADER_BYTES)
        val header = HeaderCodec.decode(headerBytes)
        require(header.version == PROTOCOL_VERSION) { "unsupported protocol version ${header.version}" }
        val needsTag = header.type != MessageType.HELLO
        val expected = HEADER_BYTES + header.payloadLen + (if (needsTag) TAG_BYTES else 0)
        require(frame.size == expected) { "frame length ${frame.size}, expected $expected" }
        val body = frame.copyOfRange(HEADER_BYTES, frame.size)
        if (!needsTag) return header to body
        require(key != null && nonce != null && aead != null) { "security is required for a tagged frame" }
        return header to aead.open(key, nonce, headerBytes, body)
    }
}
