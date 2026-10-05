package expo.modules.itantranative

import android.os.Build
import dev.itantra.engine.InProcessEngine
import dev.itantra.engine.LinkedEngine
import dev.itantra.engine.MetricsRecorder
import dev.itantra.engine.Outbox
import dev.itantra.engine.ProtocolSession
import dev.itantra.engine.Readback
import dev.itantra.engine.ReceiveOutcome
import dev.itantra.engine.TimelineRecord
import dev.itantra.transport.BluetoothTransport
import dev.itantra.transport.Link
import dev.itantra.transport.PeerRef
import dev.itantra.transport.TransportId
import dev.itantra.transport.WifiDirectTransport
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.take
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import dev.itantra.protocol.ChaCha20Poly1305Aead
import dev.itantra.protocol.FrameCodec
import dev.itantra.protocol.Header
import dev.itantra.protocol.Languages
import dev.itantra.protocol.MessageType
import dev.itantra.protocol.PROTOCOL_VERSION
import dev.itantra.protocol.Payloads
import dev.itantra.protocol.Priority
import dev.itantra.protocol.RetryConfig
import dev.itantra.protocol.RetryScheduler
import dev.itantra.protocol.ScriptCodec
import dev.itantra.speech.EnergyVad
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * First native slice of the iTantra engine for React Native. It uses the Expo Modules API and
 * calls the shared Kotlin protocol core, the same sources the JVM tests run. Later it grows into
 * the full ITantra contract (talk, peers, alerts, outbox) over the engine service.
 */
class ITantraNativeModule : Module() {
    private val engine = InProcessEngine()
    private var running = false
    private var deviceName = "Field phone A"
    private var activeLang = "hi"
    private var lastReadback: Readback? = null
    private val presetTexts = mapOf(
        1 to "मदद चाहिए", 2 to "घायल हैं", 3 to "पानी चाहिए",
        4 to "नाव चाहिए", 5 to "आग लगी है", 6 to "रास्ता बंद है",
    )

    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var btTransport: BluetoothTransport? = null
    private var wifiTransport: WifiDirectTransport? = null
    private var linked: LinkedEngine? = null
    private var linkWatch: Job? = null

    /** Attach a real link to a LinkedEngine and route inbound messages to the UI. */
    private fun attachLink(link: Link) {
        val session = ProtocolSession(ByteArray(32) { (it + 1).toByte() }, byteArrayOf(9, 8, 7, 6), senderId = 1)
        val engine = LinkedEngine(link, session, ioScope)
        engine.start()
        linked = engine
        this@ITantraNativeModule.sendEvent(
            "link",
            mapOf(
                "peerId" to link.peer.peerId,
                "transport" to link.transport.name.lowercase(),
                "state" to "connected",
                "rttMs" to null,
                "bytesTx" to 0,
                "bytesRx" to 0,
            ),
        )
        ioScope.launch {
            engine.messages.collect { message ->
                this@ITantraNativeModule.sendEvent("message", messageMap("", "in", message.text, "played", "routine", 0, message.lang))
            }
        }
    }

    private fun stateMap() = mapOf(
        "running" to running,
        "deviceName" to deviceName,
        "activeLang" to activeLang,
        "transports" to listOf("bluetooth", "wifiDirect"),
        "emulatorActive" to false,
        "emulatorPreset" to null,
        "foreground" to running,
    )

    private fun messageMap(id: String, direction: String, text: String, state: String, priority: String, bytes: Int, lang: String) = mapOf(
        "messageId" to id, "peerId" to "ravi", "direction" to direction, "type" to "text",
        "priority" to priority, "lang" to lang, "text" to text, "words" to null,
        "phraseId" to null, "state" to state, "createdAt" to System.currentTimeMillis(),
        "attempts" to 1, "bytesFrame" to bytes, "bytesText" to text.toByteArray(Charsets.UTF_8).size,
        "transport" to "loopback",
    )

    override fun definition() = ModuleDefinition {
        Name("ITantraNative")
        Events("engineState", "readback", "message", "alert", "link")

        Function("hello") {
            "iTantra native engine online (protocol v$PROTOCOL_VERSION)"
        }

        Function("deviceInfo") {
            mapOf(
                "manufacturer" to Build.MANUFACTURER,
                "model" to Build.MODEL,
                "android" to Build.VERSION.RELEASE,
                "abi" to (Build.SUPPORTED_ABIS.firstOrNull() ?: "unknown"),
            )
        }

        Function("scriptRoundTrip") { lang: String, text: String ->
            val encoded = ScriptCodec.encode(text, lang)
            val decoded = ScriptCodec.decode(encoded, lang)
            mapOf(
                "bytes" to encoded.size,
                "decoded" to decoded,
                "matches" to (decoded == ScriptCodec.normalize(text)),
            )
        }

        // C1: build a real authenticated frame on device and report its byte layout.
        Function("frameInfo") { lang: String, text: String ->
            val payload = Payloads.encodeText(ScriptCodec.encode(text, lang), null)
            val key = ByteArray(32) { (it + 1).toByte() }
            val salt = byteArrayOf(0xde.toByte(), 0xad.toByte(), 0xbe.toByte(), 0xef.toByte())
            val aead = ChaCha20Poly1305Aead()
            val header = Header(
                type = MessageType.TEXT,
                language = Languages.byCode(lang).index,
                senderId = 1,
                seq = 1,
                ageSeconds = 0,
                payloadLen = payload.size,
            )
            val frame = FrameCodec.build(header, payload, key, FrameCodec.deriveNonce(salt, 1, 1), aead)
            mapOf(
                "headerBytes" to 12,
                "payloadBytes" to payload.size,
                "tagBytes" to 16,
                "frameBytes" to frame.size,
                "textBytes" to text.toByteArray(Charsets.UTF_8).size,
                "hex" to frame.joinToString("") { "%02x".format(it) },
            )
        }

        // Focus area 1 + 5: run the on-device VAD on a synthetic buffer.
        Function("vadDemo") {
            val vad = EnergyVad()
            val events = ArrayList<String>()
            fun feed(level: Int, frames: Int) {
                repeat(frames) {
                    vad.accept(ShortArray(512) { level.toShort() }).forEach { events.add(it.name) }
                }
            }
            feed(0, 20)      // 640 ms silence
            feed(5000, 10)   // 320 ms speech
            feed(0, 25)      // 800 ms silence -> endpoint
            events
        }

        // Focus area 5: the latency timeline as CSV.
        Function("metricsCsv") {
            val recorder = MetricsRecorder()
            recorder.record(
                TimelineRecord(
                    messageId = "m1", lang = "hi", priority = 0,
                    tSpeechEndMs = 0, tAsrDoneMs = 1200, tAcceptMs = 1800, tLinkWriteMs = 1810,
                    tLinkRecvMs = 2100, tTtsFirstAudioMs = 2400, tAckMs = 2600,
                    bytesFrame = 42, bytesText = 24, chars = 22, words = 4, attempts = 1,
                    emulatorConfig = "1 kbps",
                ),
            )
            recorder.toCsv()
        }

        // Focus areas 2 + 3: a full send -> wire -> receive -> duplicate-reject -> ACK round trip.
        Function("sessionDemo") { lang: String, text: String ->
            val key = ByteArray(32) { (it + 1).toByte() }
            val salt = byteArrayOf(9, 8, 7, 6)
            val alice = ProtocolSession(key, salt, senderId = 1)
            val bob = ProtocolSession(key, salt, senderId = 2)
            val frame = alice.buildText(seq = 1, lang = lang, text = text)
            val outcome = bob.receive(frame, now = 0)
            val decoded = (outcome as? ReceiveOutcome.Delivered)?.messages?.firstOrNull()?.text ?: ""
            val duplicate = bob.receive(frame, now = 0) is ReceiveOutcome.Duplicate
            val ack = alice.buildAck(1, 0)
            mapOf(
                "frameBytes" to frame.size,
                "decoded" to decoded,
                "duplicateRejected" to duplicate,
                "ackBytes" to ack.size,
                "outcome" to outcome::class.simpleName,
            )
        }

        // Gate G5 analogue: recognise, read back with confidence, accept, send through the wire.
        Function("engineDemo") { lang: String, text: String ->
            val engine = InProcessEngine()
            val readback = runBlocking { engine.beginTalk(lang, ShortArray(16_000) { 1200 }) }
            val message = engine.acceptReadback(readback, if (text.isBlank()) null else text)
            mapOf(
                "readback" to readback.text,
                "lowWords" to readback.words.filter { it.low }.map { it.text },
                "mustConfirm" to readback.mustConfirm,
                "criticalLow" to readback.criticalLow,
                "delivered" to message.text,
                "frameBytes" to message.bytes,
                "state" to message.state,
                "metricsRows" to engine.metricsCsv().trim().split("\n").size - 1,
            )
        }

        // Focus area 3: the outbox orders alerts first and expires routine messages on TTL.
        Function("outboxDemo") {
            var now = 0L
            val scheduler = RetryScheduler(RetryConfig(jitterFraction = 0.0), { now })
            val outbox = Outbox({ now }, scheduler)
            outbox.enqueue("ravi", 1, Priority.ROUTINE, "routine")
            outbox.enqueue("ravi", 2, Priority.ALERT, "alert")
            val firstOrder = outbox.dueForSend().map { it.messageId }
            now = 700_000
            val afterTtl = outbox.dueForSend().map { it.messageId }
            mapOf("firstOrder" to firstOrder, "afterTtl" to afterTtl)
        }

        // --- Engine-backed field flow (Talk/Thread). In-process peer for now. ---

        Function("engineReady") { true }

        Function("startEngine") { name: String ->
            running = true
            deviceName = name
            this@ITantraNativeModule.sendEvent("engineState", stateMap())
            stateMap()
        }

        Function("getEngineState") { stateMap() }

        Function("beginTalk") { lang: String ->
            activeLang = lang
            val readback = runBlocking { engine.beginTalk(lang, ShortArray(16_000) { 1200 }) }
            lastReadback = readback
            val words = readback.words.map {
                mapOf("text" to it.text, "conf" to it.conf, "low" to it.low, "critical" to it.critical)
            }
            val payload = mapOf(
                "utteranceId" to "utt-${System.currentTimeMillis()}",
                "lang" to readback.lang,
                "text" to readback.text,
                "words" to words,
                "mustConfirm" to readback.mustConfirm,
                "voiceWarning" to null,
            )
            this@ITantraNativeModule.sendEvent("readback", payload)
            payload
        }

        Function("acceptReadback") { edited: String ->
            val text = if (edited.isBlank()) lastReadback?.text ?: "" else edited
            val active = linked
            if (active != null) {
                // Send over the live radio link (Bluetooth or Wi-Fi Direct).
                val bytes = runCatching { runBlocking { active.send(text, activeLang, Priority.ROUTINE) } }.getOrDefault(-1)
                val payload = messageMap("link-${System.currentTimeMillis()}", "out", text, if (bytes > 0) "sent" else "queued", "routine", if (bytes > 0) bytes else 0, activeLang)
                this@ITantraNativeModule.sendEvent("message", payload)
                payload
            } else {
                val readback = lastReadback ?: runBlocking { engine.beginTalk(activeLang, ShortArray(16_000) { 1200 }) }
                val message = engine.acceptReadback(readback, if (edited.isBlank()) null else edited)
                val payload = messageMap(message.messageId, "out", message.text, message.state, message.priority, message.bytes, readback.lang)
                this@ITantraNativeModule.sendEvent("message", payload)
                payload
            }
        }

        Function("sendPresetAlert") { presetId: Int ->
            val text = presetTexts[presetId] ?: "मदद चाहिए"
            val active = linked
            if (active != null) {
                val bytes = runCatching { runBlocking { active.send(text, activeLang, Priority.ALERT) } }.getOrDefault(-1)
                val linkedPayload = messageMap("alert-${System.currentTimeMillis()}", "out", text, if (bytes > 0) "sent" else "queued", "alert", if (bytes > 0) bytes else 0, activeLang)
                this@ITantraNativeModule.sendEvent("message", linkedPayload)
                return@Function linkedPayload
            }
            val message = engine.sendAlert(presetId, activeLang, text)
            val payload = messageMap(message.messageId, "in", text, "playing", "alert", message.bytes, activeLang)
            this@ITantraNativeModule.sendEvent("message", payload)
            this@ITantraNativeModule.sendEvent(
                "alert",
                mapOf(
                    "messageId" to message.messageId, "peerId" to "ravi", "peerName" to "Ravi",
                    "lang" to activeLang, "text" to text, "acked" to false, "audible" to true,
                ),
            )
            payload
        }

        Function("acknowledgeAlert") { messageId: String ->
            this@ITantraNativeModule.sendEvent(
                "alert",
                mapOf(
                    "messageId" to messageId, "peerId" to "ravi", "peerName" to "Ravi",
                    "lang" to activeLang, "text" to (presetTexts[1] ?: ""), "acked" to true, "audible" to false,
                ),
            )
            true
        }

        // Real transport check: list bonded Bluetooth devices through BluetoothTransport.
        // Requires BLUETOOTH_CONNECT; returns [] if the permission is not granted.
        Function("pairedBluetoothDevices") {
            val context = appContext.reactContext
            if (context == null) {
                emptyList<Map<String, String>>()
            } else {
                runCatching {
                    runBlocking { BluetoothTransport(context).discover().take(20).toList() }
                        .map { mapOf("name" to it.displayName, "address" to (it.address ?: "")) }
                }.getOrDefault(emptyList())
            }
        }

        Function("listEngineMessages") {
            engine.transcript.map { m ->
                messageMap(m.messageId, m.direction, m.text, m.state, m.priority, m.bytes, activeLang)
            }
        }

        // --- Real Bluetooth transport, wired to a LinkedEngine. ---

        Function("startBluetoothServer") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else {
                runCatching {
                    val transport = btTransport ?: BluetoothTransport(context).also { btTransport = it }
                    runBlocking { transport.listen() }
                    linkWatch?.cancel()
                    linkWatch = ioScope.launch { transport.incomingLinks().collect { attachLink(it) } }
                }.isSuccess
            }
        }

        Function("connectBluetooth") { address: String ->
            val context = appContext.reactContext
            if (context == null) {
                false
            } else {
                runCatching {
                    val transport = btTransport ?: BluetoothTransport(context).also { btTransport = it }
                    val peer = PeerRef(address, address, TransportId.BLUETOOTH, address)
                    val link = runBlocking { transport.connect(peer).getOrThrow() }
                    attachLink(link)
                }.isSuccess
            }
        }

        Function("sendBluetooth") { text: String, lang: String ->
            val engine = linked ?: return@Function -1
            runCatching { runBlocking { engine.send(text, lang) } }.getOrDefault(-1)
        }

        Function("bluetoothLinkActive") { linked != null }

        Function("stopBluetooth") {
            runCatching { runBlocking { btTransport?.shutdown() } }
            runCatching { runBlocking { linked?.stop() } }
            linked = null
            true
        }

        // --- Wi-Fi Direct transport, wired to the same LinkedEngine. ---

        Function("startWifiDirectServer") {
            val context = appContext.reactContext
            if (context == null) {
                false
            } else {
                runCatching {
                    val transport = wifiTransport ?: WifiDirectTransport(context).also { wifiTransport = it }
                    runBlocking { transport.listen() }
                    linkWatch?.cancel()
                    linkWatch = ioScope.launch { transport.incomingLinks().collect { attachLink(it) } }
                }.isSuccess
            }
        }

        Function("connectWifiDirect") { address: String ->
            val context = appContext.reactContext
            if (context == null) {
                false
            } else {
                runCatching {
                    val transport = wifiTransport ?: WifiDirectTransport(context).also { wifiTransport = it }
                    val peer = PeerRef(address, address, TransportId.WIFI_DIRECT, address)
                    val link = runBlocking { transport.connect(peer).getOrThrow() }
                    attachLink(link)
                }.isSuccess
            }
        }

        Function("stopWifiDirect") {
            runCatching { runBlocking { wifiTransport?.shutdown() } }
            true
        }
    }
}
