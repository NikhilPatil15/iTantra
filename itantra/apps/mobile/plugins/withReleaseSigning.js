const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * Signs release builds with a project keystore when `credentials/key.properties` exists, and
 * falls back to the debug keystore otherwise. Expo CNG regenerates android/, so the signing
 * config is injected here each prebuild instead of being hand-edited.
 *
 * Create the keystore and credentials/key.properties locally (see apps/mobile/README.md). Both are
 * git-ignored; never commit them.
 */
const LOADER = `
def itantraKeystoreProperties = new Properties()
def itantraKeystorePropertiesFile = rootProject.file('../credentials/key.properties')
if (itantraKeystorePropertiesFile.exists()) {
    itantraKeystoreProperties.load(new FileInputStream(itantraKeystorePropertiesFile))
}
`;

const RELEASE_SIGNING = `    signingConfigs {
        release {
            if (itantraKeystorePropertiesFile.exists()) {
                storeFile rootProject.file('../credentials/itantra-release.keystore')
                storePassword itantraKeystoreProperties['storePassword']
                keyAlias itantraKeystoreProperties['keyAlias']
                keyPassword itantraKeystoreProperties['keyPassword']
            }
        }
        debug {`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (contents.includes("itantraKeystorePropertiesFile")) return cfg;

    contents = contents.replace("signingConfigs {\n        debug {", `${LOADER}\n${RELEASE_SIGNING}`);
    contents = contents.replace(
      "            // Caution! In production, you need to generate your own keystore file.\n" +
        "            // see https://reactnative.dev/docs/signed-apk-android.\n" +
        "            signingConfig signingConfigs.debug",
      "            signingConfig itantraKeystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug",
    );
    cfg.modResults.contents = contents;
    return cfg;
  });
};
