import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, ScreenHeader } from "../../components/ui";
import { useApp } from "../../lib/app";

const PRESETS = [
  { id: 1, text: "मदद चाहिए", en: "Need help" },
  { id: 2, text: "घायल हैं", en: "People injured" },
  { id: 3, text: "पानी चाहिए", en: "Need water" },
  { id: 4, text: "नाव चाहिए", en: "Need a boat" },
  { id: 5, text: "आग लगी है", en: "Fire" },
  { id: 6, text: "रास्ता बंद है", en: "Road blocked" },
];

export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHold = () => {
    if (timer.current) clearInterval(timer.current);
    const started = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / 1500);
      setProgress(p);
      if (p >= 1) {
        if (timer.current) clearInterval(timer.current);
        void app.sendPresetAlert(1);
      }
    }, 50);
  };
  const endHold = () => {
    if (timer.current) clearInterval(timer.current);
    setProgress(0);
  };

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 14 }}
    >
      <ScreenHeader title="Alerts" subtitle="Alerts jump the queue and play until acknowledged" />

      <Card>
        <Text style={{ color: app.colors.ink, fontWeight: "700", fontSize: 17 }}>Hold for SOS</Text>
        <Text style={{ color: app.colors.slate, fontSize: 13 }}>Press and hold for 1.5 seconds.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hold for SOS"
          onPressIn={startHold}
          onPressOut={endHold}
          style={[styles.sos, { borderColor: app.colors.beacon, backgroundColor: app.colors.beaconTint }]}
        >
          <View style={[styles.sosFill, { width: `${progress * 100}%`, backgroundColor: app.colors.beacon }]} />
          <Text style={{ color: app.colors.beacon, fontWeight: "800", fontSize: 26, zIndex: 1 }}>SOS</Text>
        </Pressable>
      </Card>

      <Text style={{ color: app.colors.ink, fontWeight: "700", fontSize: 17 }}>Preset alerts</Text>
      <View style={styles.grid}>
        {PRESETS.map((p) => (
          <View key={p.id} style={styles.gridItem}>
            <Button title={`${p.text}\n${p.en}`} onPress={() => void app.sendPresetAlert(p.id)} />
          </View>
        ))}
      </View>

      <Text style={{ color: app.colors.ink, fontWeight: "700", fontSize: 17 }}>Spoken alert</Text>
      <Button title="Speak an alert" variant="primary" onPress={() => void app.sendSpokenAlert()} />
      <Button title="Simulate an incoming alert" variant="danger" onPress={() => app.simulateIncomingAlert()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sos: { marginTop: 12, height: 120, borderRadius: 20, borderWidth: 1.5, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  sosFill: { position: "absolute", left: 0, top: 0, bottom: 0, opacity: 0.25 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: { width: "48%" },
});
