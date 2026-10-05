import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProvider } from "../lib/app";

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="setup" options={{ headerShown: true, title: "Setup", headerBackTitle: "Back" }} />
        <Stack.Screen name="peers" options={{ headerShown: true, title: "Peers", headerBackTitle: "Back" }} />
        <Stack.Screen name="dev" options={{ headerShown: true, title: "Native spike", headerBackTitle: "Back" }} />
      </Stack>
      <StatusBar style="auto" />
    </AppProvider>
  );
}
