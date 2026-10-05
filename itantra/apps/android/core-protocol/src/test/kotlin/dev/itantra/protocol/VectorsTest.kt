package dev.itantra.protocol

import java.io.File
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Validates this Kotlin implementation against the golden vectors committed by the TypeScript
 * port. Both suites must pass against the same files (plan Section 4).
 */
class VectorsTest {
    private val json = Json { ignoreUnknownKeys = true }

    private fun vectorsDir(): File {
        val candidates = listOf(
            File("../../../packages/vectors"),
            File("packages/vectors"),
            File("../../packages/vectors"),
        )
        return candidates.firstOrNull { it.isDirectory }
            ?: error("could not locate packages/vectors from ${File(".").absolutePath}")
    }

    private fun load(name: String): JsonObject = json.parseToJsonElement(File(vectorsDir(), name).readText()).jsonObject

    private fun hexToBytes(hex: String): ByteArray = ByteArray(hex.length / 2) { hex.substring(it * 2, it * 2 + 2).toInt(16).toByte() }
    private fun bytesToHex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

    private fun int(obj: JsonObject, key: String, default: Int = 0): Int =
        (obj[key]?.jsonPrimitive?.content?.toIntOrNull()) ?: default

    private fun bool(obj: JsonObject, key: String, default: Boolean = false): Boolean =
        obj[key]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: default

    @Test
    fun scriptCodingMatchesVectors() {
        val cases = load("script_coding.json")["cases"]!!.jsonArray
        assert(cases.size > 6)
        for (element in cases) {
            val case = element.jsonObject
            val name = case["name"]!!.jsonPrimitive.content
            val lang = case["lang"]!!.jsonPrimitive.content
            val text = case["text"]!!.jsonPrimitive.content
            val expected = case["bytes"]!!.jsonPrimitive.content
            assertEquals(expected, bytesToHex(ScriptCodec.encode(text, lang)), name)
            assertEquals(ScriptCodec.decode(hexToBytes(expected), lang), ScriptCodec.decode(ScriptCodec.encode(text, lang), lang), name)
        }
    }

    @Test
    fun headersMatchVectors() {
        for (element in load("headers.json")["cases"]!!.jsonArray) {
            val case = element.jsonObject
            val header = case["header"]!!.jsonObject
            val decoded = HeaderCodec.decode(hexToBytes(case["bytes"]!!.jsonPrimitive.content))
            assertEquals(PROTOCOL_VERSION, decoded.version)
            assertEquals(int(header, "type"), decoded.type.code)
            assertEquals(int(header, "priority"), decoded.priority.code)
            assertEquals(bool(header, "needAck"), decoded.needAck)
            assertEquals(bool(header, "hasConf"), decoded.hasConf)
            assertEquals(bool(header, "codebook"), decoded.codebook)
            assertEquals(int(header, "language"), decoded.language)
            assertEquals(int(header, "senderId"), decoded.senderId)
            assertEquals(int(header, "seq"), decoded.seq)
            assertEquals(int(header, "ageSeconds"), decoded.ageSeconds)
            assertEquals(int(header, "hops"), decoded.hops)
            assertEquals(int(header, "payloadLen"), decoded.payloadLen)
        }
    }

    @Test
    fun confidenceMatchesVectors() {
        for (element in load("confidence.json")["cases"]!!.jsonArray) {
            val case = element.jsonObject
            val flags = case["flags"]!!.jsonArray.map { it.jsonPrimitive.content.toBooleanStrict() }.toBooleanArray()
            assertEquals(case["bytes"]!!.jsonPrimitive.content, bytesToHex(Confidence.encode(flags)), case["name"]!!.jsonPrimitive.content)
        }
    }

    @Test
    fun framesReproduceByteForByte() {
        val aead = ChaCha20Poly1305Aead()
        for (element in load("frames.json")["cases"]!!.jsonArray) {
            val case = element.jsonObject
            val name = case["name"]!!.jsonPrimitive.content
            val key = hexToBytes(case["key"]!!.jsonPrimitive.content)
            val salt = hexToBytes(case["salt"]!!.jsonPrimitive.content)
            val epoch = int(case, "epoch", 1)
            val seq = int(case, "seq")
            val payload = hexToBytes(case["payload"]!!.jsonPrimitive.content)
            val input = case["headerInput"]!!.jsonObject
            val header = Header(
                type = MessageType.from(int(input, "type")),
                priority = Priority.entries[int(input, "priority")],
                needAck = bool(input, "needAck"),
                codebook = bool(input, "codebook"),
                language = int(input, "language"),
                senderId = int(input, "senderId"),
                seq = int(input, "seq"),
                ageSeconds = int(input, "ageSeconds"),
                payloadLen = payload.size,
            )
            val nonce = FrameCodec.deriveNonce(salt, epoch, seq)
            val frame = FrameCodec.build(header, payload, key, nonce, aead)
            assertEquals(case["frame"]!!.jsonPrimitive.content, bytesToHex(frame), name)

            val (parsedHeader, parsedPayload) = FrameCodec.parse(hexToBytes(case["frame"]!!.jsonPrimitive.content), key, nonce, aead)
            assertEquals(header.type, parsedHeader.type)
            assertContentEquals(payload, parsedPayload, name)
        }
    }
}
