package dev.itantra.protocol

import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

/**
 * Native CLI for benchmarking and spot checks, plan T10. Mirrors packages/protocol-ts CLI so
 * `tools/bench` can use the shipping implementation:
 *
 *   core-protocol size --lang hi --text "नदी"
 *   core-protocol size --input sentences.jsonl
 *   core-protocol encode --lang hi --text "नदी"
 *   core-protocol decode --lang hi --hex e4...
 *   core-protocol frame --lang hi --sender 1 --seq 1 --text "नदी"
 */
private val json = Json { ignoreUnknownKeys = true }

private fun hex(bytes: ByteArray): String = bytes.joinToString("") { "%02x".format(it) }

fun main(args: Array<String>) {
    val command = args.firstOrNull() ?: error("usage: <size|encode|decode|frame> [--lang L] [--text T] [--hex H] [--input F]")
    val flags = HashMap<String, String>()
    var i = 1
    while (i < args.size - 1) {
        if (args[i].startsWith("--")) flags[args[i].substring(2)] = args[i + 1]
        i += 2
    }
    when (command) {
        "encode" -> {
            val lang = flags["lang"] ?: "hi"
            println(hex(ScriptCodec.encode(flags["text"] ?: "", lang)))
        }
        "decode" -> {
            val lang = flags["lang"] ?: "hi"
            val bytes = (flags["hex"] ?: "").chunked(2).map { it.toInt(16).toByte() }.toByteArray()
            println(ScriptCodec.decode(bytes, lang))
        }
        "size" -> {
            val input = flags["input"]
            if (input != null) {
                File(input).readLines().filter { it.isNotBlank() }.forEach { line ->
                    println(sizeJson(json.parseToJsonElement(line).jsonObject))
                }
            } else {
                val lang = flags["lang"] ?: "hi"
                println(sizeJson(buildJsonObject {
                    put("id", "inline"); put("lang", lang); put("text", flags["text"] ?: "")
                }))
            }
        }
        "frame" -> {
            val lang = flags["lang"] ?: "hi"
            val text = flags["text"] ?: ""
            val payload = Payloads.encodeText(ScriptCodec.encode(text, lang), null)
            val languageIndex = Languages.byCode(lang).index
            val header = Header(
                type = MessageType.TEXT,
                language = languageIndex,
                senderId = (flags["sender"] ?: "1").toInt(),
                seq = (flags["seq"] ?: "1").toInt(),
                ageSeconds = 0,
                payloadLen = payload.size,
            )
            println(hex(HeaderCodec.encode(header) + payload))
        }
        else -> error("unknown command $command")
    }
}

private fun sizeJson(row: JsonObject): String {
    val lang = row["lang"]?.jsonPrimitive?.content ?: "hi"
    val text = row["text"]?.jsonPrimitive?.content ?: ""
    val normalised = ScriptCodec.normalize(text)
    val coded = ScriptCodec.encode(text, lang)
    return buildJsonObject {
        put("id", row["id"]?.jsonPrimitive?.content ?: "")
        put("lang", lang)
        put("chars", normalised.codePointCount(0, normalised.length))
        put("utf8Bytes", normalised.toByteArray(Charsets.UTF_8).size)
        put("codedBytes", coded.size)
    }.toString()
}
