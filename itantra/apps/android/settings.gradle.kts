pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}

rootProject.name = "itantra-android"

// Pure-JVM modules: build and test without the Android SDK.
include(":core-protocol")
include(":core-transport")
include(":core-speech")
include(":core-packs")
include(":engine-service")

// Android modules. Enable once the Android SDK and AGP are configured (OPEN_QUESTIONS.md Q6):
// include(":core-store")
// include(":core-transport")
// include(":core-speech")
// include(":core-packs")
// include(":engine-service")
// include(":capacitor-plugin")
// include(":app")
