import { PermissionsAndroid, Platform } from "react-native";

/**
 * Android runtime permissions. Declaring them in the manifest is not enough: on Android 6+ the
 * app must request them at runtime. Android 12+ needs BLUETOOTH_* and Android 13+ needs
 * POST_NOTIFICATIONS / NEARBY_WIFI_DEVICES.
 */
type RequestPermission = Parameters<typeof PermissionsAndroid.request>[0];

function wanted(): RequestPermission[] {
  if (Platform.OS !== "android") return [];
  const P = PermissionsAndroid.PERMISSIONS as unknown as Record<string, RequestPermission | undefined>;
  const list: RequestPermission[] = [];
  const push = (value: RequestPermission | undefined) => {
    if (typeof value === "string") list.push(value);
  };
  push(P.RECORD_AUDIO);
  push(P.ACCESS_FINE_LOCATION);
  if (typeof Platform.Version === "number" && Platform.Version >= 31) {
    push(P.BLUETOOTH_SCAN);
    push(P.BLUETOOTH_CONNECT);
    push(P.BLUETOOTH_ADVERTISE);
  }
  if (typeof Platform.Version === "number" && Platform.Version >= 33) {
    push(P.POST_NOTIFICATIONS);
    push(P.NEARBY_WIFI_DEVICES);
  }
  return list;
}

export interface PermissionReport {
  granted: string[];
  denied: string[];
}

export async function requestAllPermissions(): Promise<PermissionReport> {
  const granted: string[] = [];
  const denied: string[] = [];
  for (const permission of wanted()) {
    try {
      const result = await PermissionsAndroid.request(permission);
      if (result === PermissionsAndroid.RESULTS.GRANTED) granted.push(permission);
      else denied.push(permission);
    } catch {
      denied.push(permission);
    }
  }
  return { granted, denied };
}

export function shortName(permission: string): string {
  return permission.replace("android.permission.", "");
}
