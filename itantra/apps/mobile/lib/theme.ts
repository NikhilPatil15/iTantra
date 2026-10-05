import { useColorScheme } from "react-native";

/**
 * Field-screen tokens from the plan (Section 16.2). Deliberately high-contrast and calm: these
 * screens are used in sunlight, with gloves, under stress. The brand palette lives on the web.
 */
export interface Palette {
  chalk: string;
  vellum: string;
  ink: string;
  slate: string;
  rule: string;
  ultramarine: string;
  ultramarineTint: string;
  beacon: string;
  beaconTint: string;
  amberInk: string;
  amber: string;
  lichen: string;
  scrim: string;
}

export const DAY: Palette = {
  chalk: "#EEF1F0", vellum: "#FAFBFA", ink: "#13232F", slate: "#566571", rule: "#C9D1D5",
  ultramarine: "#2A3FD0", ultramarineTint: "#E1E5FB", beacon: "#D42A1F", beaconTint: "#FBE3E1",
  amberInk: "#8A5A00", amber: "#F3B43F", lichen: "#2C7548", scrim: "rgba(19,35,47,0.45)",
};

export const NIGHT: Palette = {
  chalk: "#0F1A22", vellum: "#172631", ink: "#E6EDF0", slate: "#9AAAB4", rule: "#2B3B47",
  ultramarine: "#8FA0FF", ultramarineTint: "#232F6B", beacon: "#FF6B5E", beaconTint: "#4A1F1C",
  amberInk: "#F3B43F", amber: "#F3B43F", lichen: "#6FD08F", scrim: "rgba(0,0,0,0.55)",
};

export type ThemeMode = "day" | "night" | "auto";

export interface Theme {
  colors: Palette;
  mode: ThemeMode;
  isNight: boolean;
  setMode: (mode: ThemeMode) => void;
}

export function resolveTheme(mode: ThemeMode, system: string | null | undefined): { colors: Palette; isNight: boolean } {
  const isNight = mode === "night" || (mode === "auto" && system === "dark");
  return { colors: isNight ? NIGHT : DAY, isNight };
}

export function useSystemScheme(): string | null | undefined {
  return useColorScheme();
}
