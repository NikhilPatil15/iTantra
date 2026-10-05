import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, ScreenHeader, Toggle } from "../../components/ui";
import { useApp } from "../../lib/app";
import type { ThemeMode } from "../../lib/theme";

const MODES: ThemeMode[] = ["day", "night", "auto"];

const EMULATORS = [1_000, 3_000, 10_000].map((rate) => ({
  preset: `${rate / 1000} kbps`,
  rateBps: rate,
  lossPercent: 0,
  jitterMs: 20,
  disconnectAfterMs: null,
  disconnectDurationMs: null,
}));

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 14 }}
    >
      <ScreenHeader title="More" subtitle="Settings and tools" />

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Theme</Text>
        <View style={styles.row}>
          {MODES.map((mode) => (
            <Text
              key={mode}
              onPress={() => app.setThemeMode(mode)}
              style={{
                borderWidth: 1.5, borderColor: app.themeMode === mode ? app.colors.ultramarine : app.colors.rule,
                color: app.themeMode === mode ? app.colors.ultramarine : app.colors.slate,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, fontWeight: "700", overflow: "hidden",
              }}
            >
              {mode}
            </Text>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Confirm before send</Text>
            <Text style={{ color: app.colors.slate, fontSize: 13 }}>Show the read-back and wait for you to accept.</Text>
          </View>
          <Toggle value={app.confirmBeforeSend} onChange={app.setConfirmBeforeSend} label="Confirm before send" />
        </View>
      </Card>

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Link emulator (test tool)</Text>
        <Text style={{ color: app.colors.slate, fontSize: 13, marginTop: 2 }}>
          Narrow-link presets for testing. Metrics record the config in effect.
        </Text>
        <View style={styles.row}>
          {EMULATORS.map((e) => (
            <Text
              key={e.preset}
              onPress={() => void app.setEmulator(e)}
              style={{
                borderWidth: 1.5, borderColor: app.engine?.emulatorPreset === e.preset ? app.colors.amberInk : app.colors.rule,
                color: app.engine?.emulatorPreset === e.preset ? app.colors.amberInk : app.colors.slate,
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, fontWeight: "700", overflow: "hidden",
              }}
            >
              {e.preset}
            </Text>
          ))}
          <Text onPress={() => void app.setEmulator(null)} style={{ color: app.colors.slate, padding: 8 }}>Off</Text>
        </View>
      </Card>

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700" }}>Engine</Text>
        <Text style={{ color: app.colors.slate, marginTop: 4 }}>Status: {app.engine?.running ? "running" : "stopped"}</Text>
        <Text style={{ color: app.colors.slate }}>Device: {app.engine?.deviceName ?? "—"}</Text>
        <Text style={{ color: app.colors.slate }}>Language: {app.activeLang}</Text>
        <Text style={{ color: app.colors.slate }}>Emulator: {app.engine?.emulatorPreset ?? "off"}</Text>
      </Card>

      <Card style={{ gap: 10 }}>
        <Link href="/setup" style={{ color: app.colors.ultramarine, fontWeight: "700" }}>Setup</Link>
        <Link href="/peers" style={{ color: app.colors.ultramarine, fontWeight: "700" }}>Peers and pairing</Link>
        <Link href="/dev" style={{ color: app.colors.ultramarine, fontWeight: "700" }}>Native module spike</Link>
      </Card>

      <Text style={{ color: app.colors.slate, fontSize: 13 }}>
        This build runs the field screens against mock data. Real transport and speech run in the Kotlin engine once it is wired.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
});
