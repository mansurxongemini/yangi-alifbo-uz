/**
 * Windows .exe ga ikonka va versiya ma'lumotini joylaydi (Wine talab qilinmaydi).
 * electron-builder Linux'da buni faqat Wine bilan qila oladi, shuning uchun sof JS (resedit).
 * Ishlatish: node build/win-resources.mjs release/win-unpacked/ozbek-alifbosi.exe
 */
import { readFileSync, writeFileSync } from 'node:fs';
import * as ResEdit from 'resedit';

const exePath = process.argv[2];
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const exe = ResEdit.NtExecutable.from(readFileSync(exePath), { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);

const ico = ResEdit.Data.IconFile.from(readFileSync(new URL('./icon.ico', import.meta.url)));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const id = groups.length ? groups[0].id : 1;
const lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, id, lang, ico.icons.map((i) => i.data));

const [vi] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const [maj, min, pat] = pkg.version.split('.').map(Number);
vi.setFileVersion(maj, min, pat, 0, 1033);
vi.setProductVersion(maj, min, pat, 0, 1033);
vi.setStringValues({ lang: 1033, codepage: 1200 }, {
  FileDescription: 'Özbek Alifbosi',
  ProductName: 'Özbek Alifbosi',
  CompanyName: pkg.author,
  LegalCopyright: pkg.build.copyright,
  OriginalFilename: 'ozbek-alifbosi.exe',
  InternalName: 'ozbek-alifbosi',
});
vi.outputToResourceEntries(res.entries);
res.outputResource(exe);
writeFileSync(exePath, Buffer.from(exe.generate()));
console.log('ok:', exePath);
