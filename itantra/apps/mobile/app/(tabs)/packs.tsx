import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, Chip, ScreenHeader } from "../../components/ui";
import { useApp } from "../../lib/app";

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} kB`;
  return `${(n / (1024 * 1024)).toFixed(0)} MB`;
}

export default function PacksScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 12 }}
    >
      <ScreenHeader title="Packs" subtitle="One pack per language. Adding a language never needs an app update." />
      {app.packs.map((pack) => {
        const tone = pack.status === "verified" ? "lichen" : pack.status === "experimental" ? "amber" : "neutral";
        return (
          <Card key={pack.packId}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={{ color: app.colors.ink, fontWeight: "800", fontSize: 20 }}>
                  {pack.displayName}
                </Text>
                <Text style={{ color: app.colors.slate, fontSize: 13 }}>
                  {pack.lang} · {formatBytes(pack.sizeBytes)} · v{pack.version}
                </Text>
              </View>
              <Chip label={pack.installed ? (pack.status === "verified" ? "Verified" : "Experimental") : "Not installed"} tone={tone} />
            </View>
            {pack.licenseClass === "non-commercial" ? (
              <Text style={{ color: app.colors.beacon, marginTop: 8 }}>This voice is for non-commercial use only.</Text>
            ) : null}
            <View style={[styles.row, { marginTop: 10 }]}>
              {!pack.installed ? (
                <Button title="Install from file" variant="primary" onPress={() => void app.installPack(`${pack.packId}.pack`)} />
              ) : (
                <Button title="Run self-test" onPress={() => void app.runSelfTest(pack.lang)} />
              )}
            </View>
            {pack.selfTest?.measuredWer != null ? (
              <Text style={{ color: app.colors.slate, fontSize: 13, marginTop: 6 }}>
                Self-test WER {pack.selfTest.measuredWer.toFixed(2)} (limit {pack.selfTest.maxWer.toFixed(2)}) · sample data
              </Text>
            ) : null}
          </Card>
        );
      })}
      {app.lastSelfTest ? (
        <Text style={{ color: app.colors.slate }}>
          Last self-test: {app.lastSelfTest.lang} · WER {app.lastSelfTest.wer.toFixed(2)} · RTF {app.lastSelfTest.rtf.toFixed(2)} · sample data
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
});
