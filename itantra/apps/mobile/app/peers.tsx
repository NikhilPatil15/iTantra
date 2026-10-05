import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Chip, ScreenHeader } from "../components/ui";
import { useApp } from "../lib/app";

export default function PeersScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [sas, setSas] = useState<string | null>(null);

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 12 }}
    >
      <ScreenHeader
        title="Peers"
        subtitle="Nearby and paired phones"
        right={<Button title="Scan" onPress={() => void app.startDiscovery()} />}
      />
      {app.peers.map((peer) => (
        <Card key={peer.peerId}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ color: app.colors.ink, fontWeight: "800", fontSize: 19 }}>{peer.displayName}</Text>
              <Text style={{ color: app.colors.slate, fontSize: 13 }}>
                {peer.paired ? "Paired" : "Not paired"} · {peer.state}
                {peer.rttMs != null ? ` · ${peer.rttMs} ms` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 8 }}>
              <Chip label={peer.state} tone={peer.state === "connected" ? "lichen" : "neutral"} />
              {!peer.paired ? (
                <Button title="Pair" variant="primary" onPress={async () => setSas((await app.pairPeer(peer.peerId)) ?? null)} />
              ) : (
                <Button title="Connect" variant="primary" onPress={() => { app.setActivePeer(peer.peerId); void app.connect(peer.peerId); }} />
              )}
            </View>
          </View>
        </Card>
      ))}

      {sas ? (
        <Card style={{ borderColor: app.colors.ultramarine }}>
          <Text style={{ color: app.colors.slate }}>Both phones show the same code</Text>
          <Text style={{ color: app.colors.ink, fontSize: 44, letterSpacing: 4, fontWeight: "800", marginVertical: 8 }}>{sas}</Text>
          <View style={styles.row}>
            <Button title="Codes match" variant="primary" style={{ flex: 1 }} onPress={() => { void app.confirmPairing("session", true); setSas(null); }} />
            <Button title="Codes differ" variant="danger" style={{ flex: 1 }} onPress={() => { void app.confirmPairing("session", false); setSas(null); }} />
          </View>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
});
