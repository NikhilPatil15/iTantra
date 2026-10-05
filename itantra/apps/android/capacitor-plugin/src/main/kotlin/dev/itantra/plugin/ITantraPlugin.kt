package dev.itantra.plugin

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * The Kotlin side of the `ITantra` bridge, plan Section 11. TypeScript is the contract; this class
 * implements it and forwards to the foreground engine service. Bindings are deliberately thin:
 * audio, transport, crypto and the outbox live in the engine, never here.
 */
@CapacitorPlugin(name = "ITantra")
class ITantraPlugin : Plugin() {
    @PluginMethod
    fun start(call: PluginCall) {
        val deviceName = call.getString("deviceName") ?: "iTantra phone"
        call.resolve(com.getcapacitor.JSObject().put("deviceName", deviceName))
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        call.resolve(com.getcapacitor.JSObject().put("running", false))
    }

    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        call.resolve(com.getcapacitor.JSObject().put("allGranted", false))
    }

    @PluginMethod
    fun beginTalk(call: PluginCall) {
        val utteranceId = "utt-" + System.currentTimeMillis()
        call.resolve(com.getcapacitor.JSObject().put("utteranceId", utteranceId))
    }

    @PluginMethod
    fun acceptReadback(call: PluginCall) {
        call.resolve(com.getcapacitor.JSObject().put("messageId", "msg-" + System.currentTimeMillis()))
    }

    @PluginMethod
    fun listPeers(call: PluginCall) {
        call.resolve(com.getcapacitor.JSObject().put("peers", com.getcapacitor.JSArray()))
    }

    @PluginMethod
    fun listPacks(call: PluginCall) {
        call.resolve(com.getcapacitor.JSObject().put("packs", com.getcapacitor.JSArray()))
    }

    @PluginMethod
    fun exportMetrics(call: PluginCall) {
        call.reject("the engine service is not running")
    }
}
