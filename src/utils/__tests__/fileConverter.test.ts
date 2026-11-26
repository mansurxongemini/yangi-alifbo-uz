import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  convertFile,
  convertXmlPart,
  convertOfficeBytes,
  convertTextBytes,
  decodeTextBytes,
  formatFileSize,
  outputName,
  extractFromZip,
} from '../fileConverter';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docXml = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>`;

const makeDocx = async (body: string) => {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0"?><Types/>');
  z.file('word/document.xml', docXml(body));
  z.file('word/styles.xml', '<w:styles><w:t>Шаҳар</w:t></w:styles>');
  z.file('word/media/image1.png', new Uint8Array([137, 80, 78, 71, 1, 2, 3]));
  return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
};

const readDoc = async (data: Uint8Array | Blob) => {
  const z = await JSZip.loadAsync(data);
  return z.file('word/document.xml')!.async('string');
};

describe('yordamchilar', () => {
  it('formatFileSize', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
  it('outputName', () => {
    expect(outputName('qaror.docx', 'new_latin')).toBe('qaror_yangi_lotin.docx');
    expect(outputName('arxiv.zip', 'cyrillic')).toBe('arxiv_kirill.zip');
  });
});

describe('Word XML — faqat harflar özgaradi', () => {
  it('jadval, uslub, xml deklaratsiyasi bayt-bayt saqlanadi', () => {
    const body =
      '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid><w:gridCol w:w="2310"/><w:gridCol w:w="6000"/></w:tblGrid>' +
      '<w:tr><w:tc><w:tcPr><w:tcW w:w="2310"/></w:tcPr><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>Шаҳар</w:t></w:r></w:p></w:tc>' +
      '<w:tc><w:p><w:r><w:t xml:space="preserve">Тошкент &amp; Самарқанд </w:t></w:r></w:p></w:tc></w:tr></w:tbl>';
    const xml = docXml(body);
    const r = convertXmlPart(xml, { para: ['w:p'], text: ['w:t'], sep: {} }, { to: 'new_latin' });
    const expected = xml.replace('>Шаҳар<', '>Şahar<').replace('>Тошкент &amp; Самарқанд <', '>Toşkent &amp; Samarqand <');
    expect(r.xml).toBe(expected);
  });

  it('bir nechta run ga bölingan söz töğri ögiriladi va formatlaş joyida qoladi', () => {
    const body =
      '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>O</w:t></w:r><w:r><w:t>' + "'" + 'zbekiston</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve"> sh</w:t></w:r><w:r><w:t>ahri</w:t></w:r></w:p>';
    const r = convertXmlPart(docXml(body), { para: ['w:p'], text: ['w:t'], sep: {} }, { to: 'new_latin' });
    expect(r.xml).toContain('<w:rPr><w:b/></w:rPr><w:t>Ö</w:t></w:r><w:r><w:t>zbekiston</w:t>');
    expect(r.xml).toContain('<w:rPr><w:i/></w:rPr><w:t xml:space="preserve"> ş</w:t></w:r><w:r><w:t>ahri</w:t>');
  });

  it('maydon kodlari (instrText) va öçirilgan matn (delText) tegilmaydi', () => {
    const body =
      '<w:p><w:r><w:instrText xml:space="preserve"> HYPERLINK "https://x.uz/шаҳар" </w:instrText></w:r><w:r><w:delText>шаҳар</w:delText></w:r><w:r><w:t>шаҳар</w:t></w:r></w:p>';
    const r = convertXmlPart(docXml(body), { para: ['w:p'], text: ['w:t'], sep: {} }, { to: 'new_latin' });
    expect(r.xml).toContain('HYPERLINK "https://x.uz/шаҳар"');
    expect(r.xml).toContain('<w:delText>шаҳар</w:delText>');
    expect(r.xml).toContain('<w:t>şahar</w:t>');
  });

  it('özgariş bölmasa null qaytaradi', () => {
    const r = convertXmlPart(docXml('<w:p><w:r><w:t>Kitob 2024</w:t></w:r></w:p>'), { para: ['w:p'], text: ['w:t'], sep: {} }, { to: 'new_latin' });
    expect(r.xml).toBeNull();
  });
});

describe('DOCX fayl', () => {
  it('rasm va styles.xml özgarmaydi, document.xml ögiriladi', async () => {
    const data = await makeDocx('<w:p><w:r><w:t>Ўзбекистон</w:t></w:r></w:p>');
    const r = await convertOfficeBytes(data, 'docx', { to: 'new_latin' });
    expect(r.changed).toBe(true);
    const z = await JSZip.loadAsync(r.data);
    expect(await z.file('word/document.xml')!.async('string')).toContain('<w:t>Özbekiston</w:t>');
    expect(await z.file('word/styles.xml')!.async('string')).toBe('<w:styles><w:t>Шаҳар</w:t></w:styles>');
    expect(Array.from(await z.file('word/media/image1.png')!.async('uint8array'))).toEqual([137, 80, 78, 71, 1, 2, 3]);
    expect(Object.keys(z.files)).toEqual(['[Content_Types].xml', 'word/', 'word/document.xml', 'word/styles.xml', 'word/media/', 'word/media/image1.png']);
  });

  it('kirill tanlangan, lekin hujjat eski lotinda — baribir yangi lotinga ötadi', async () => {
    const data = await makeDocx("<w:p><w:r><w:t>O'zbekiston shahri</w:t></w:r></w:p>");
    const res = await convertFile(new Blob([data as BlobPart]), 'a.docx', { from: 'cyrillic', to: 'new_latin' });
    expect(await readDoc(res.blob)).toContain('<w:t>Özbekiston şahri</w:t>');
  });

  it('aralash hujjat', async () => {
    const data = await makeDocx(
      "<w:p><w:r><w:t>Ўзбекистон Республикаси</w:t></w:r></w:p><w:p><w:r><w:t>O'zbekiston Respublikasi</w:t></w:r></w:p><w:p><w:r><w:t>Özbekiston</w:t></w:r></w:p>"
    );
    const res = await convertFile(new Blob([data as BlobPart]), 'a.docx', { from: 'auto', to: 'new_latin' });
    const xml = await readDoc(res.blob);
    expect(xml).toContain('<w:t>Özbekiston Respublikasi</w:t></w:r></w:p><w:p><w:r><w:t>Özbekiston Respublikasi</w:t>');
  });

  it('shikastlangan fayl uchun tuşunarli xato', async () => {
    await expect(convertOfficeBytes(new Uint8Array([1, 2, 3, 4, 5]), 'docx', { to: 'new_latin' })).rejects.toThrow(/şikastlangan/);
  });
});

describe('Matn fayllari', () => {
  it('UTF-8 va qator oxirlari saqlanadi', () => {
    const src = new TextEncoder().encode('Шаҳар\r\nчой\n');
    const r = convertTextBytes(src, { to: 'new_latin' });
    expect(new TextDecoder().decode(r.data)).toBe('Şahar\r\nçoy\n');
  });
  it('Windows-1251 kodirovkasi taniladi', () => {
    // "Привет" CP1251 da
    const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);
    expect(decodeTextBytes(cp1251).text).toBe('Привет');
    const r = convertTextBytes(cp1251, { to: 'new_latin' });
    expect(new TextDecoder().decode(r.data.subarray(3))).toBe('Privet');
  });
});

describe('ZIP arxiv', () => {
  it('400 ta Word fayl, buzilgan fayl va tizim fayllari bilan', async () => {
    const z = new JSZip();
    const doc = await makeDocx('<w:p><w:r><w:t>Тошкент шаҳри</w:t></w:r></w:p>');
    for (let i = 0; i < 400; i++) z.file(`hujjatlar/${String(i).padStart(3, '0')}.docx`, doc);
    z.file('hujjatlar/buzuq.docx', new Uint8Array([1, 2, 3]));
    z.file('hujjatlar/eslatma.txt', 'Шаҳар');
    z.file('hujjatlar/eski.doc', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]));
    z.file('__MACOSX/._a.docx', new Uint8Array([0]));
    const zipData = await z.generateAsync({ type: 'uint8array' });

    let lastDone = 0;
    const res = await convertFile(new Blob([zipData as BlobPart]), 'arxiv.zip', { to: 'new_latin' }, (p) => {
      if (p.phase === 'converting') lastDone = p.done;
    });
    expect(lastDone).toBe(404);
    expect(res.isArchive).toBe(true);
    expect(res.report.filter((r) => r.status === 'converted').length).toBe(401);
    expect(res.report.find((r) => r.path === 'hujjatlar/buzuq.docx')!.status).toBe('error');
    expect(res.report.find((r) => r.path === 'hujjatlar/eski.doc')!.status).toBe('skipped');

    const one = await extractFromZip(res.blob, 'hujjatlar/123.docx');
    expect(await readDoc(one)).toContain('<w:t>Toşkent şahri</w:t>');
    const outZip = await JSZip.loadAsync(res.blob);
    expect(Array.from(await outZip.file('hujjatlar/buzuq.docx')!.async('uint8array'))).toEqual([1, 2, 3]);
  }, 60_000);
});
