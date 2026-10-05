const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Strips permissions that a shipping build must not carry, when ITANTRA_OFFLINE=1:
 *   - android.permission.INTERNET       (added by React Native/Expo for Metro; plan rule 6)
 *   - android.permission.SYSTEM_ALERT_WINDOW (added by React Native debug support; overlay)
 *
 * `tools:node="remove"` forces the manifest merger to drop a permission even when a library
 * manifest declares it. Development prebuilds (without the env var) keep them so Metro works and
 * the JS debug overlay is available.
 *
 * Usage: `ITANTRA_OFFLINE=1 npx expo prebuild --clean` then build the release APK.
 */
const STRIPPED = [
  "android.permission.INTERNET",
  "android.permission.SYSTEM_ALERT_WINDOW",
];

module.exports = function withOfflineManifest(config) {
  if (process.env.ITANTRA_OFFLINE !== "1") return config;
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
    const existing = manifest["uses-permission"] || [];
    manifest["uses-permission"] = existing.filter(
      (entry) => !STRIPPED.includes(entry.$?.["android:name"]),
    );
    for (const name of STRIPPED) {
      manifest["uses-permission"].push({
        $: { "android:name": name, "tools:node": "remove" },
      });
    }
    return cfg;
  });
};
