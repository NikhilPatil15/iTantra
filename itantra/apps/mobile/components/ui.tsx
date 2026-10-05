import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useApp } from "../lib/app";

export function Button({
  title,
  onPress,
  variant = "ghost",
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "danger" | "ghost";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useApp();
  const bg = variant === "primary" ? colors.ultramarine : variant === "danger" ? colors.beacon : colors.vellum;
  const fg = variant === "ghost" ? colors.ink : "#ffffff";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === "ghost" ? colors.rule : "transparent", opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useApp();
  return <View style={[styles.card, { backgroundColor: colors.vellum, borderColor: colors.rule }, style]}>{children}</View>;
}

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "lichen" | "amber" | "beacon" }) {
  const { colors } = useApp();
  const color = tone === "lichen" ? colors.lichen : tone === "amber" ? colors.amberInk : tone === "beacon" ? colors.beacon : colors.slate;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { colors } = useApp();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? colors.ultramarine : colors.chalk, borderColor: colors.rule }]}
    >
      <View style={[styles.knob, { backgroundColor: colors.vellum, alignSelf: value ? "flex-end" : "flex-start" }]} />
    </Pressable>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useApp();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.h1, { color: colors.ink }]}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: colors.slate }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "700" },
  card: { borderRadius: 20, borderWidth: 1.5, padding: 16 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { fontSize: 13, fontWeight: "700" },
  toggle: { height: 30, width: 52, borderRadius: 999, borderWidth: 1.5, padding: 2, justifyContent: "center" },
  knob: { height: 22, width: 22, borderRadius: 999 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  h1: { fontSize: 26, fontWeight: "800" },
  sub: { fontSize: 15, marginTop: 2 },
});
