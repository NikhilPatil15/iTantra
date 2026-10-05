import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, ScreenHeader } from "../components/ui";
import { useApp } from "../lib/app";
import ITantraNative, { type DeviceInfo, type EngineDemo, type FrameInfo, type OutboxDemo, type RoundTrip, type SessionDemo } from "../modules/itantra-native";

const SAMPLES = [
  { lang: "hi", text: "नदी का पानी तेजी से बढ़ रहा है" },
  { lang: "ta", text: "ஆற்று நீர் வேகமாக உயர்கிறது" },
  { lang: "en", text: "Send a boat at once" },
];

export default function DevScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [hello, setHello] = useState("native module not available on this platform");
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [lang, setLang] = useState("hi");
  const [text, setText] = useState(SAMPLES[0]!.text);
  const [result, setResult] = useState<RoundTrip | null>(null);
  const [frame, setFrame] = useState<FrameInfo | null>(null);
  const [vad, setVad] = useState<string[] | null>(null);
  const [metrics, setMetrics] = useState<string | null>(null);
  const [outbox, setOutbox] = useState<OutboxDemo | null>(null);
  const [session, setSession] = useState<SessionDemo | null>(null);
  const [engineDemo, setEngineDemo] = useState<EngineDemo | null>(null);
  const [btDevices, setBtDevices] = useState<{ name: string; address: string }[] | null>(null);
  const [btStatus, setBtStatus] = useState<string | null>(null);

  const runDemos = () => {
    if (!ITantraNative) return;
    setFrame(ITantraNative.frameInfo(lang, text));
    setVad(ITantraNative.vadDemo());
    setMetrics(ITantraNative.metricsCsv());
    setOutbox(ITantraNative.outboxDemo());
    setSession(ITantraNative.sessionDemo(lang, text));
    setEngineDemo(ITantraNative.engineDemo(lang, text));
    setBtDevices(ITantraNative.pairedBluetoothDevices());
  };

  useEffect(() => {
    if (!ITantraNative) return;
    try {
      setHello(ITantraNative.hello());
      setDevice(ITantraNative.deviceInfo());
    } catch (e) {
      setHello(String(e));
    }
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 14 }}
    >
      <ScreenHeader title="Native spike" subtitle="Proves the Expo module reaches the shared Kotlin core" />
      <Card>
        <Text style={{ color: app.colors.slate, fontSize: 13, fontWeight: "700" }}>Native module</Text>
        <Text style={{ color: app.colors.ink, marginTop: 4 }}>{hello}</Text>
        {device ? (
          <Text style={{ color: app.colors.ink }}>
            {device.manufacturer} {device.model} · Android {device.android} · {device.abi}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Script codec round trip (C1)</Text>
        <View style={styles.row}>
          {SAMPLES.map((s) => (
            <Text
              key={s.lang}
              onPress={() => { setLang(s.lang); setText(s.text); }}
              style={{
                borderWidth: 1.5, borderColor: lang === s.lang ? app.colors.ultramarine : app.colors.rule,
                color: lang === s.lang ? app.colors.ultramarine : app.colors.slate,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, fontWeight: "700", overflow: "hidden",
              }}
            >
              {s.lang}
            </Text>
          ))}
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          style={{ borderWidth: 1.5, borderColor: app.colors.rule, borderRadius: 12, padding: 10, marginTop: 10, color: app.colors.ink, fontSize: 17 }}
        />
        <Button title="Encode on device" variant="primary" style={{ marginTop: 10 }} onPress={() => { if (ITantraNative) setResult(ITantraNative.scriptRoundTrip(lang, text)); }} />
        {result ? (
          <Text style={{ color: app.colors.ink, marginTop: 8 }}>
            {result.bytes} bytes · {result.matches ? "round-trip ok" : "MISMATCH"}
            {"\n"}
            {result.decoded}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Native engine demos (focus areas 1, 3, 5, 6)</Text>
        <Button title="Run on device" variant="primary" style={{ marginTop: 10 }} onPress={runDemos} />
        {frame ? (
          <Text style={{ color: app.colors.ink, marginTop: 10 }}>
            Frame: header {frame.headerBytes} B + payload {frame.payloadBytes} B + tag {frame.tagBytes} B ={" "}
            {frame.frameBytes} B (text {frame.textBytes} B UTF-8)
          </Text>
        ) : null}
        {vad ? (
          <Text style={{ color: app.colors.ink, marginTop: 8 }}>VAD events: {vad.join(" → ")}{vad.length === 0 ? "none" : ""}</Text>
        ) : null}
        {outbox ? (
          <Text style={{ color: app.colors.ink, marginTop: 8 }}>
            Outbox order: {outbox.firstOrder.join(", ")} · after TTL: {outbox.afterTtl.length === 0 ? "expired" : outbox.afterTtl.join(", ")}
          </Text>
        ) : null}
        {session ? (
          <Text style={{ color: app.colors.ink, marginTop: 8 }}>
            Session: {session.frameBytes} B frame, {session.outcome}, decoded “{session.decoded}”, duplicate{" "}
            {session.duplicateRejected ? "rejected" : "NOT rejected"}, ACK {session.ackBytes} B
          </Text>
        ) : null}
        {engineDemo ? (
          <Text style={{ color: app.colors.ink, marginTop: 8 }}>
            End to end (G5): read “{engineDemo.readback}” · low: {engineDemo.lowWords.join(", ") || "none"} · confirm{" "}
            {engineDemo.mustConfirm ? "yes" : "no"} · critical-low {engineDemo.criticalLow ? "yes" : "no"} · delivered “
            {engineDemo.delivered}” ({engineDemo.frameBytes} B, {engineDemo.state}) · metrics rows {engineDemo.metricsRows}
          </Text>
        ) : null}
        {btDevices ? (
          <Text style={{ color: app.colors.ink, marginTop: 8 }}>
            Paired Bluetooth: {btDevices.length === 0 ? "none (or BLUETOOTH_CONNECT not granted)" : btDevices.map((d) => d.name).join(", ")}
          </Text>
        ) : null}
        {metrics ? (
          <Text style={{ color: app.colors.slate, marginTop: 8, fontSize: 12 }} numberOfLines={6}>
            {metrics}
          </Text>
        ) : null}
      </Card>

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Bluetooth transport (two phones)</Text>
        <Text style={{ color: app.colors.slate, fontSize: 13, marginTop: 2 }}>
          Phone A: Start server. Phone B: Connect to A (A must be a paired device). Then send a frame.
        </Text>
        <View style={{ gap: 8, marginTop: 10 }}>
          <Button title="Start server" onPress={() => setBtStatus(ITantraNative?.startBluetoothServer?.() ? "server listening" : "failed (permission?)")} />
          <Button
            title={`Connect to ${btDevices?.[0]?.name ?? "first paired device"}`}
            onPress={() => {
              const address = btDevices?.[0]?.address;
              if (!address) {
                setBtStatus("no paired device found");
                return;
              }
              setBtStatus(ITantraNative?.connectBluetooth?.(address) ? `connected to ${address}` : "connect failed");
            }}
          />
          <Button
            title="Send test frame over Bluetooth"
            variant="primary"
            onPress={() => {
              const n = ITantraNative?.sendBluetooth?.(text, lang) ?? -1;
              setBtStatus(n > 0 ? `sent ${n} bytes over Bluetooth` : "no active Bluetooth link");
            }}
          />
          <Button title="Start Wi-Fi Direct server" onPress={() => setBtStatus(ITantraNative?.startWifiDirectServer?.() ? "wifi direct server listening" : "failed")} />
          <Button title="Stop all links" variant="danger" onPress={() => { ITantraNative?.stopBluetooth?.(); ITantraNative?.stopWifiDirect?.(); setBtStatus("links stopped"); }} />
        </View>
        {btStatus ? <Text style={{ color: app.colors.ink, marginTop: 8 }}>{btStatus}</Text> : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
});
