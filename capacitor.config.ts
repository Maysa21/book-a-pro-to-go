import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "dev.agendafacil.app",
  appName: "AgendaFácil",
  webDir: "dist-mobile",
  server: {
    // Serve the app from a secure origin inside the phone, so the backend
    // session is stored like it is on an https site.
    androidScheme: "https",
  },
};

export default config;
