import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { convertOdfBytes, convertHtmlBytes, convertFile, kindOf } from '../fileConverter';
import { convertRtfBytes, parseRtf } from '../formats/rtf';

const enc = (s: string) => new TextEncoder().encode(s);
const cp1251 = (s: string) => {
  // Faqat test uchun: kirill (А-я, Ёё, Ўў) → CP1251 bayt
  const map: Record<string, number> = { Ё: 0xa8, ё: 0xb8, Ў: 0xa1, ў: 0xa2 };
  return Uint8Array.from([...s].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c < 0x80) return c;
    if (map[ch]) return map[ch];
    if (c >= 0x410 && c <= 0x44f) return c - 0x410 + 0xc0;
    throw new Error('cp1251 da yoʻq: ' + ch);
  }));
};

// ---------------------------------------------------------------------------
describe('ODF (.odt)', () => {
  const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" office:version="1.3"><office:body><office:text>
<text:tracked-changes><text:changed-region text:id="c1"><text:deletion><text:p>Ўчирилган шаҳар</text:p></text:deletion></text:changed-region></text:tracked-changes>
<text:h text:outline-level="1">Ўзбекистон</text:h>
<text:p text:style-name="P1">Тошкент <text:span text:style-name="T1">шаҳри</text:span><text:tab/>ва<text:s text:c="2"/>чой</text:p>
<text:p><text:span text:style-name="B">O</text:span>'zbekiston &amp; sh<text:span>ahri</text:span></text:p>
<text:p>Изоҳ<office:annotation><dc:creator>Шарипов Ш.</dc:creator><dc:date>2026-10-15</dc:date><text:p>Изоҳ матни</text:p></office:annotation></text:p>
</office:text></office:body></office:document-content>`;

  const makeOdt = async () => {
    const z = new JSZip();
    z.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
    z.file('META-INF/manifest.xml', '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"/>');
    z.file('content.xml', content);
    z.file('styles.xml', '<office:document-styles xmlns:office="o" xmlns:text="t"><style:master-page><style:header><text:p>Нурли Йўл</text:p></style:header></style:master-page></office:document-styles>');
    return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  };

  it('matn oʻgiriladi, teglar va tahrirlar tarixi oʻzgarmaydi', async () => {
    const r = await convertOdfBytes(await makeOdt(), { to: 'new_latin' });
    expect(r.changed).toBe(true);
    const z = await JSZip.loadAsync(r.data);
    const xml = await z.file('content.xml')!.async('string');
    expect(xml).toContain('<text:h text:outline-level="1">Özbekiston</text:h>');
    expect(xml).toContain('<text:p text:style-name="P1">Toşkent <text:span text:style-name="T1">şahri</text:span><text:tab/>va<text:s text:c="2"/>çoy</text:p>');
    // Inline teg bilan boʻlingan soʻz
    expect(xml).toContain('<text:span text:style-name="B">Ö</text:span>zbekiston &amp; ş<text:span>ahri</text:span>');
    // Oʻchirilgan tahrir, izoh muallifi oʻzgarmaydi; izoh matni oʻgiriladi
    expect(xml).toContain('<text:deletion><text:p>Ўчирилган шаҳар</text:p></text:deletion>');
    expect(xml).toContain('<dc:creator>Шарипов Ш.</dc:creator>');
    expect(xml).toContain('<text:p>Izoh matni</text:p>');
    expect(await z.file('styles.xml')!.async('string')).toContain('<text:p>Nurli Yöl</text:p>');
  });

  it('mimetype birinchi va siqilmagan (ODF talabi)', async () => {
    const r = await convertOdfBytes(await makeOdt(), { to: 'new_latin' });
    // Birinchi lokal sarlavha: nom "mimetype", siqish usuli 0 (STORE)
    const name = new TextDecoder().decode(r.data.subarray(30, 38));
    expect(name).toBe('mimetype');
    expect(r.data[8] | (r.data[9] << 8)).toBe(0);
  });

  it('parol bilan himoyalangan ODF uchun tushunarli xato', async () => {
    const z = new JSZip();
    z.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });
    z.file('META-INF/manifest.xml', '<manifest:file-entry><manifest:encryption-data/></manifest:file-entry>');
    z.file('content.xml', 'binary');
    await expect(convertOdfBytes(await z.generateAsync({ type: 'uint8array' }), { to: 'new_latin' })).rejects.toThrow(/parol/);
  });
});

// ---------------------------------------------------------------------------
describe('RTF', () => {
  const hex = (s: string) => [...cp1251(s)].map((b) => `\\'${b.toString(16)}`).join('');
  const rtf =
    `{\\rtf1\\ansi\\ansicpg1251\\deff0{\\fonttbl{\\f0\\fcharset204 Times New Roman;}{\\f1\\fcharset0 Arial;}}` +
    `{\\colortbl;\\red0\\green0\\blue255;}{\\*\\generator Test;}{\\info{\\title ${hex('Шахар')}}}` +
    `\\f0\\fs24 ${hex('Тошкент')} {\\b ${hex('ш')}}${hex('ах')}\\uc1\\u1203?${hex('ри')}\\par ` +
    `\\f1 O'zbekiston sh{\\i ahri}\\par ` +
    `{\\field{\\*\\fldinst HYPERLINK "http://x.uz/${hex('ш')}"}{\\fldrslt \\f0 ${hex('чой')}}}\\par}`;

  it('koʻrinadigan matnni toʻgʻri oʻqiydi', () => {
    const text = parseRtf(rtf).map((it) => ('ch' in it ? it.ch : it.sep)).join('');
    expect(text).toBe("Тошкент шахҳри\nO'zbekiston shahri\nчой\n");
  });

  it('faqat harflar baytlari almashadi, formatlash va xizmat qismlari saqlanadi', () => {
    const r = convertRtfBytes(new Uint8Array([...rtf].map((c) => c.charCodeAt(0))), { to: 'new_latin' });
    expect(r.changed).toBe(true);
    const out = String.fromCharCode(...r.data);
    // Shrift jadvali, info, fldinst — bayt-bayt oʻzgarmagan
    expect(out).toContain('{\\fonttbl{\\f0\\fcharset204 Times New Roman;}{\\f1\\fcharset0 Arial;}}');
    expect(out).toContain(`{\\info{\\title ${hex('Шахар')}}}`);
    expect(out).toContain(`{\\*\\fldinst HYPERLINK "http://x.uz/${hex('ш')}"}`);
    expect(out).toContain('{\\b \\u351?}'); // ш → ş qalin guruh ichida qoldi
    const text = parseRtf(out).map((it) => ('ch' in it ? it.ch : it.sep)).join('');
    expect(text).toBe('Toşkent şaxhri\nÖzbekiston ş' + 'ahri\nçoy\n');
  });
});

// ---------------------------------------------------------------------------
describe('HTML', () => {
  it('teglar, script, style, code oʻzgarmaydi; soʻz teglar orasida boʻlinsa ham oʻgiriladi', () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Шаҳар</title><style>.шаҳар{color:red}</style></head>` +
      `<body><p class="шаҳар" title="шаҳар">Тошкент <b>ш</b>аҳри &amp; O&#39;zbekiston&nbsp;чой</p>` +
      `<script>var a = "шаҳар";</script><code>шаҳар</code><!-- шаҳар --></body></html>`;
    const r = convertHtmlBytes(enc(html), { to: 'new_latin' });
    const out = new TextDecoder().decode(r.data);
    expect(out).toContain('<title>Şahar</title>');
    expect(out).toContain('<style>.шаҳар{color:red}</style>');
    expect(out).toContain('<p class="шаҳар" title="шаҳар">Toşkent <b>ş</b>ahri &amp; Özbekiston&nbsp;çoy</p>');
    expect(out).toContain('<script>var a = "шаҳар";</script><code>шаҳар</code><!-- шаҳар -->');
  });

  it('Windows-1251 sahifa UTF-8 ga oʻtadi va charset yangilanadi', () => {
    const html = '<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1251"></head><body>Тошкент</body></html>';
    const r = convertHtmlBytes(cp1251(html), { to: 'new_latin' });
    const out = new TextDecoder('utf-8', { fatal: true }).decode(r.data);
    expect(out).toContain('charset=utf-8');
    expect(out).toContain('<body>Toşkent</body>');
  });
});

// ---------------------------------------------------------------------------
describe('RAR / 7z arxivlar', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alifbo-'));
  writeFileSync(join(dir, 'eslatma.txt'), 'Тошкент шаҳри');
  writeFileSync(join(dir, 'sahifa.html'), '<p>Ўзбекистон</p>');
  const have = (bin: string) => existsSync(`/usr/bin/${bin}`) || existsSync(`/bin/${bin}`);

  it.skipIf(!have('7z'))('7z arxiv ochiladi va natija ZIP boʻladi', async () => {
    execFileSync('7z', ['a', '-bso0', join(dir, 'a.7z'), join(dir, 'eslatma.txt'), join(dir, 'sahifa.html')]);
    const data = readFileSync(join(dir, 'a.7z'));
    expect(kindOf('a.7z')).toBe('archive');
    const res = await convertFile(new Blob([data]), 'hujjatlar.7z', { to: 'new_latin' });
    expect(res.filename).toBe('hujjatlar_yangi_lotin.zip');
    const z = await JSZip.loadAsync(res.blob);
    expect(await z.file('eslatma.txt')!.async('string')).toBe('Toşkent şahri');
    expect(await z.file('sahifa.html')!.async('string')).toBe('<p>Özbekiston</p>');
  }, 60_000);

  it.skipIf(!have('rar'))('RAR arxiv ochiladi', async () => {
    execFileSync('rar', ['a', '-idq', '-ep', join(dir, 'a.rar'), join(dir, 'eslatma.txt')]);
    const res = await convertFile(new Blob([readFileSync(join(dir, 'a.rar'))]), 'hujjatlar.rar', { to: 'new_latin' });
    const z = await JSZip.loadAsync(res.blob);
    expect(await z.file('eslatma.txt')!.async('string')).toBe('Toşkent şahri');
    expect(res.report[0].status).toBe('converted');
  }, 60_000);

  it('buzilgan arxiv uchun tushunarli xato', async () => {
    await expect(convertFile(new Blob([new Uint8Array([1, 2, 3, 4, 5, 6])]), 'x.7z', { to: 'new_latin' })).rejects.toThrow(/oçib bölmadi|şikastlangan/);
  }, 60_000);
});

// ---------------------------------------------------------------------------
describe('Bir nechta fayl va papkalar', () => {
  it('nomlar takrorlansa ajratiladi, arxivlar oʻz papkasiga ochiladi', async () => {
    const { planInputs, batchName } = await import('../fileConverter');
    const b = new Blob(['x']);
    const plan = planInputs([
      { blob: b, path: 'a.txt' }, { blob: b, path: 'a.txt' }, { blob: b, path: 'Papka/a.txt' }, { blob: b, path: 'arxiv.zip' }, { blob: b, path: 'arxiv.zip' },
    ]);
    expect(plan.map((p) => p.path)).toEqual(['a.txt', 'a (2).txt', 'Papka/a.txt', 'arxiv', 'arxiv (2)']);
    expect(batchName([{ blob: b, path: 'Buyruqlar/1.docx' }, { blob: b, path: 'Buyruqlar/2.docx' }], 'new_latin')).toBe('Buyruqlar_yangi_lotin.zip');
    expect(batchName([{ blob: b, path: '1.docx' }, { blob: b, path: '2.docx' }], 'cyrillic')).toBe('hujjatlar_kirill.zip');
  });

  it('aralash fayllar, ZIP ichidagilar va buzilgan arxiv bitta natijada', async () => {
    const { convertInputs, readInputEntry } = await import('../fileConverter');
    const inner = new JSZip();
    inner.file('ichki/eslatma.txt', 'Шаҳар');
    const zipData = await inner.generateAsync({ type: 'uint8array' });
    const items = [
      { blob: new Blob(['Тошкент']), path: 'Papka/bir.txt' },
      { blob: new Blob(['<p>Чой</p>']), path: 'sahifa.html' },
      { blob: new Blob([zipData as BlobPart]), path: 'toplam.zip' },
      { blob: new Blob([new Uint8Array([1, 2, 3])]), path: 'buzuq.zip' },
      { blob: new Blob(['rasm']), path: 'rasm.png' },
    ];
    const res = await convertInputs(items, { to: 'new_latin' });
    expect(res.isArchive).toBe(true);
    expect(res.filename).toBe('hujjatlar_yangi_lotin.zip');
    const z = await JSZip.loadAsync(res.blob);
    expect(await z.file('Papka/bir.txt')!.async('string')).toBe('Toşkent');
    expect(await z.file('sahifa.html')!.async('string')).toBe('<p>Çoy</p>');
    expect(await z.file('toplam/ichki/eslatma.txt')!.async('string')).toBe('Şahar');
    expect(res.report.find((r) => r.path === 'buzuq.zip')!.status).toBe('error');
    expect(res.report.find((r) => r.path === 'rasm.png')!.status).toBe('skipped');
    // Ko'rish uchun asl faylni topish
    expect(new TextDecoder().decode(await readInputEntry(items, 'toplam/ichki/eslatma.txt'))).toBe('Шаҳар');
    expect(new TextDecoder().decode(await readInputEntry(items, 'Papka/bir.txt'))).toBe('Тошкент');
  });

  it('bitta oddiy fayl — oʻz formatida qaytadi (ZIP emas)', async () => {
    const { convertInputs } = await import('../fileConverter');
    const res = await convertInputs([{ blob: new Blob(['Тошкент']), path: 'a.txt' }], { to: 'new_latin' });
    expect(res.isArchive).toBe(false);
    expect(res.filename).toBe('a_yangi_lotin.txt');
  });
});
