/**
 * release/ papkasidagi dastur fayllaridan yuklab olish sahifasi uchun ma'lumotnoma yasaydi:
 * src/data/downloads.json (versiya, sana, hajm, SHA-256, yuklab olish manzili).
 *
 * Fayllar qayerda turishi: DOWNLOAD_BASE muhit o'zgaruvchisi (oxirida "/" siz).
 * Standart — GitHub Releases: <homepage>/releases/download/v<versiya>
 * Ishlatish: node build/release-manifest.mjs
 */
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const v = pkg.version;
const base = (process.env.DOWNLOAD_BASE || `${pkg.homepage}/releases/download/v${v}`).replace(/\/$/, '');

const FILES = [
  { id: 'windows', os: 'windows', label: 'Windows', file: `ozbek-alifbosi-${v}-win-x64.zip`, format: 'ZIP (köçma)' },
  { id: 'linux-appimage', os: 'linux', label: 'Linux', file: `ozbek-alifbosi-${v}-linux-x86_64.AppImage`, format: 'AppImage' },
  { id: 'linux-deb', os: 'linux', label: 'Ubuntu / Debian', file: `ozbek-alifbosi-${v}-linux-amd64.deb`, format: '.deb' },
  { id: 'android', os: 'android', label: 'Android', file: `ozbek-alifbosi-${v}-android.apk`, format: 'APK' },
];

const sha256 = (p) =>
  new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(p).on('data', (d) => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });

const files = [];
for (const f of FILES) {
  const p = join(root, 'release', f.file);
  if (!existsSync(p)) {
    console.warn('topilmadi, oʻtkazib yuborildi:', f.file);
    continue;
  }
  files.push({ ...f, size: statSync(p).size, sha256: await sha256(p), url: `${base}/${encodeURIComponent(f.file)}` });
}

const out = { version: v, date: new Date().toISOString().slice(0, 10), files };
writeFileSync(join(root, 'src', 'data', 'downloads.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`ok: ${files.length} ta fayl, manzil: ${base}`);
