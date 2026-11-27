import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android ilova sozlamalari. Sayt fayllari (dist) ilova ichiga joylanadi —
 * internet talab qilinmaydi, hech qanday server bilan bog'lanmaydi.
 */
const config: CapacitorConfig = {
  appId: 'uz.alifbo.converter',
  appName: 'Özbek Alifbosi',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F4F6F8',
  },
};

export default config;
