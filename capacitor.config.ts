import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.106c540d44fd41bf9be1771a4d91effc',
  appName: 'idia-life-prototype',
  webDir: 'dist',
  server: {
    url: "https://106c540d-44fd-41bf-9be1-771a4d91effc.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  bundledWebRuntime: false
};

export default config;