import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

import { useApp } from "../../lib/app";

const icon = (glyph: string) => ({ color }: { focused: boolean; color: ColorValue; size: number }) => (
  <Text style={{ color, fontSize: 16 }}>{glyph}</Text>
);

export default function TabsLayout() {
  const { colors } = useApp();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ultramarine,
        tabBarInactiveTintColor: colors.slate,
        tabBarStyle: { backgroundColor: colors.vellum, borderTopColor: colors.rule },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Talk", tabBarIcon: icon("●") }} />
      <Tabs.Screen name="thread" options={{ title: "Thread", tabBarIcon: icon("○") }} />
      <Tabs.Screen name="alerts" options={{ title: "Alerts", tabBarIcon: icon("▲") }} />
      <Tabs.Screen name="packs" options={{ title: "Packs", tabBarIcon: icon("◆") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("…") }} />
    </Tabs>
  );
}
