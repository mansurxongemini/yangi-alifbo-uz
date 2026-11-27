import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Production build uchun qatʼiy Content-Security-Policy.
 * connect-src 'self' — sahifa hech qanday tashqi serverga maʼlumot yubora olmaydi.
 * (Dev rejimida HMR uchun qoʻllanilmaydi.)
 */
const CSP = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' — faqat RAR/7z ochuvchi 7-Zip (WebAssembly) uchun; tashqi ulanishlar baribir taqiqlangan
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n  <meta name="referrer" content="no-referrer" />`),
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  base: './', // Electron va Capacitor uchun nisbiy yoʻllar
  worker: { format: 'es' },
  server: {
    port: 5173,
  },
});
