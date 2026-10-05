import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Card, ScreenHeader } from "../components/ui";
import { useApp } from "../lib/app";
import { requestAllPermissions, shortName, type PermissionReport } from "../lib/permissions";

const STEPS = ["Permissions", "Language packs", "Device name"];

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const app = useApp();
  const [step, setStep] = useState(0);
  const [deviceName, setDeviceName] = useState("Field phone A");
  const [report, setReport] = useState<PermissionReport | null>(null);

  return (
    <ScrollView
      style={{ backgroundColor: app.colors.chalk }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32, gap: 14 }}
    >
      <ScreenHeader title="Setup" subtitle={`Step ${step + 1} of 3`} />
      <View style={styles.steps}>
        {STEPS.map((label, i) => (
          <Text key={label} style={{ color: i === step ? app.colors.ultramarine : app.colors.slate, fontWeight: "700" }}>
            {i + 1}. {label}
          </Text>
        ))}
      </View>

      {step === 0 ? (
        <Card>
          <Text style={{ color: app.colors.ink, fontWeight: "700", fontSize: 18 }}>Permissions</Text>
          <Text style={{ color: app.colors.slate, marginTop: 6 }}>
            Microphone to recognise speech on the phone, Bluetooth and nearby Wi-Fi to reach the other phone,
            and notifications to keep the link alive. Android will now show a system prompt for each.
          </Text>
          <Button
            title="Grant permissions"
            variant="primary"
            style={{ marginTop: 12 }}
            onPress={async () => {
              const result = await requestAllPermissions();
              setReport(result);
            }}
          />
          {report ? (
            <Text style={{ color: report.denied.length === 0 ? app.colors.lichen : app.colors.amberInk, marginTop: 10 }}>
              {report.denied.length === 0
                ? `All ${report.granted.length} permissions granted.`
                : `Granted: ${report.granted.map(shortName).join(", ") || "none"}. Denied: ${report.denied.map(shortName).join(", ")}. Open Android Settings → Apps → iTantra → Permissions to allow them.`}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <Text style={{ color: app.colors.ink, fontWeight: "700", fontSize: 18 }}>Language packs</Text>
          <Text style={{ color: app.colors.slate, marginTop: 6 }}>
            Speech models live in language packs. Open the Packs tab to install or self-test one.
          </Text>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Text style={{ color: app.colors.ink, fontWeight: "700", fontSize: 18 }}>Device name</Text>
          <TextInput
            value={deviceName}
            onChangeText={setDeviceName}
            style={[styles.input, { borderColor: app.colors.rule, color: app.colors.ink, backgroundColor: app.colors.chalk }]}
          />
          <Button title="Start the engine" variant="primary" style={{ marginTop: 12 }} onPress={() => void app.start(deviceName)} />
          {app.engine?.running ? <Text style={{ color: app.colors.lichen, marginTop: 8 }}>Engine running as {app.engine.deviceName}.</Text> : null}
        </Card>
      ) : null}

      <View style={styles.row}>
        <Button title="Back" disabled={step === 0} onPress={() => setStep((s) => Math.max(0, s - 1))} />
        <Button title="Next" variant="primary" disabled={step === 2} onPress={() => setStep((s) => Math.min(2, s + 1))} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 17, marginTop: 10 },
});
