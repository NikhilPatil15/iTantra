import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, Chip, ScreenHeader } from "../../components/ui";
import { useApp } from "../../lib/app";

export default function ThreadScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const peer = app.peers.find((p) => p.peerId === app.activePeerId);
  const thread = app.messages.filter((m) => m.peerId === app.activePeerId);

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 12 }}
    >
      <ScreenHeader title="Thread" subtitle={`${peer?.displayName ?? app.activePeerId} · ${thread.length} messages`} />
      {thread.length === 0 ? <Text style={{ color: app.colors.slate }}>No messages yet. Hold to talk on the Talk screen.</Text> : null}
      {thread.map((m) => (
        <Card key={m.messageId} style={{ borderColor: m.priority === "alert" ? app.colors.beacon : app.colors.rule, backgroundColor: m.priority === "alert" ? app.colors.beaconTint : app.colors.vellum }}>
          <View style={styles.row}>
            {m.priority === "alert" ? <Chip label="Alert" tone="beacon" /> : null}
            <Chip label={m.direction === "out" ? "sent" : "received"} />
            <Text style={{ color: app.colors.slate, fontSize: 12 }}>{m.lang}</Text>
          </View>
          <Text style={{ color: app.colors.ink, fontSize: 18, marginTop: 6 }}>
            {m.text ?? (m.phraseId != null ? `Preset alert #${m.phraseId}` : "—")}
          </Text>
          <Text style={{ color: app.colors.slate, fontSize: 13, marginTop: 4 }}>{m.state}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
});
