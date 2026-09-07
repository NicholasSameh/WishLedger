import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wishledger.app",
  appName: "WishLedger",
  // Points at the static export produced by `BUILD_TARGET=native npm run build`.
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
