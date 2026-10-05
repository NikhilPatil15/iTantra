import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Chip, ScreenHeader } from "../../components/ui";
import { useApp } from "../../lib/app";

const LANGS = ["hi", "en", "ta", "bn", "te", "mr"];

export default function TalkScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [edits, setEdits] = useState<Record<number, string>>({});
  const peer = app.peers.find((p) => p.peerId === app.activePeerId);
  const lastIncoming = app.messages.find((m) => m.peerId === app.activePeerId && m.direction === "in");
  const connected = peer?.state === "connected";

  const readbackText = app.readback
    ? app.readback.words.map((w, i) => edits[i] ?? w.text).join(" ")
    : "";

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 14 }}
    >
      {!app.engine?.running ? (
        <Pressable onPress={() => app.start("Field phone A")}>
          <Card style={{ backgroundColor: app.colors.ultramarineTint, borderColor: app.colors.ultramarine }}>
            <Text style={{ color: app.colors.ultramarine, fontWeight: "700" }}>Tap to start the engine (mock data in this build)</Text>
          </Card>
        </Pressable>
      ) : null}

      <ScreenHeader
        title="Talk"
        subtitle={peer ? peer.displayName : "No peer"}
        right={<Link href="/peers" style={{ color: app.colors.ultramarine, fontWeight: "700", paddingTop: 8 }}>Peers</Link>}
      />

      <View style={styles.row}>
        <Chip
          label={peer?.transport ? `${peer.transport} · ${peer.state}` : "No link"}
          tone={connected ? "lichen" : "neutral"}
        />
        {peer?.rttMs != null ? <Chip label={`${peer.rttMs} ms`} /> : null}
      </View>

      <View style={styles.row}>
        {LANGS.map((lang) => (
          <Pressable key={lang} onPress={() => void app.setActiveLang(lang)}>
            <View
              style={[
                styles.langChip,
                { borderColor: app.activeLang === lang ? app.colors.ultramarine : app.colors.rule, backgroundColor: app.colors.vellum },
              ]}
            >
              <Text style={{ color: app.activeLang === lang ? app.colors.ultramarine : app.colors.slate, fontWeight: "700" }}>{lang}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {!connected ? (
        <Card style={{ borderColor: app.colors.rule }}>
          <Text style={{ color: app.colors.slate }}>
            Waiting for link. This message will send when {peer?.displayName ?? "the other phone"} is back in range.
          </Text>
        </Card>
      ) : null}

      {lastIncoming ? (
        <Card style={{ borderColor: lastIncoming.priority === "alert" ? app.colors.beacon : app.colors.rule }}>
          <Text style={{ color: app.colors.ink, fontSize: 19 }}>
            {lastIncoming.text ?? "—"}
          </Text>
          <Text style={{ color: app.colors.slate, fontSize: 13, marginTop: 4 }}>{lastIncoming.state}</Text>
        </Card>
      ) : null}

      {app.readback ? (
        <Card>
          <Text accessibilityLabel="Recognised text" style={{ fontSize: 28, lineHeight: 44, fontWeight: "700" }}>
            {app.readback.words.map((w, i) => (
              <Text
                key={`${w.text}-${i}`}
                onPress={() => setEdits((prev) => ({ ...prev, [i]: prev[i] ?? w.text }))}
                style={{
                  color: w.low ? app.colors.amberInk : app.colors.ink,
                  textDecorationLine: w.low ? "underline" : "none",
                  textDecorationColor: app.colors.amber,
                }}
              >
                {w.low && w.critical ? "◆ " : ""}
                {edits[i] ?? w.text}{" "}
              </Text>
            ))}
          </Text>
          {app.readback.mustConfirm ? (
            <Text style={{ color: app.colors.amberInk, marginTop: 8 }}>Check the underlined words before sending.</Text>
          ) : null}
          {app.readback.voiceWarning ? (
            <Text style={{ color: app.colors.amberInk, marginTop: 8 }}>{app.readback.voiceWarning}</Text>
          ) : null}
          <View style={[styles.row, { marginTop: 12 }]}>
            <Button title="Send" variant="primary" style={{ flex: 1 }} onPress={() => void app.acceptReadback(Object.keys(edits).length ? readbackText : undefined)} />
            <Button title="Say again" style={{ flex: 1 }} onPress={() => { setEdits({}); void app.redoUtterance(); }} />
          </View>
        </Card>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 24 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hold to talk"
            onPressIn={() => void app.beginTalk()}
            onPressOut={() => void app.endTalk()}
            style={[styles.ptt, { backgroundColor: app.colors.ultramarine }]}
          >
            <Text style={styles.pttText}>Hold to{"\n"}talk</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.rowBetween}>
        <Button title="SOS" variant="danger" style={{ minWidth: 96 }} onPress={() => void app.sendPresetAlert(1)} />
        <Button title="Incoming alert" onPress={() => app.simulateIncomingAlert()} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  langChip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  ptt: { height: 112, width: 112, borderRadius: 56, alignItems: "center", justifyContent: "center" },
  pttText: { color: "#fff", fontWeight: "800", fontSize: 16, textAlign: "center" },
});
