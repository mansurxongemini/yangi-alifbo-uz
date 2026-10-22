import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { convertDocxFile, convertTxtFile, formatFileSize } from '../fileConverter';

describe('fileConverter', () => {
  it('formatFileSize toʻgʻri formatlaydi', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });

  it('convertTxtFile .txt faylni toʻgʻri oʻgiradi', async () => {
    const originalText = 'Ўзбекистон, ғалаба va maʼno';
    const mockFile = new File([originalText], 'hujjat.txt', { type: 'text/plain' });

    // Mock convert function: Kirill Ў -> Ö, ғ -> ğ
    const convertFn = (txt: string) =>
      txt.replace(/Ў/g, 'Ö').replace(/ғ/g, 'ğ');

    const result = await convertTxtFile(mockFile, convertFn);

    expect(result.newFilename).toBe('hujjat_yangi_alifbo.txt');
    const textOutput = await result.blob.text();
    expect(textOutput).toBe('Öзбекистон, ğалаба va maʼno');
    expect(result.originalSize).toBe(mockFile.size);
  });

  it('convertDocxFile .docx fayli ichidagi XML ni formatni buzmasdan toʻgʻri oʻgiradi', async () => {
    // Kichik docx fayl zip tuzilmasini yaratish
    const zip = new JSZip();
    const xmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/></w:rPr>
        <w:t>Ўзбекистон</w:t>
      </w:r>
      <w:r>
        <w:t> Respublikasi</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;
    zip.file('word/document.xml', xmlContent);

    const docxBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const mockFile = new File([docxBuffer], 'qaror.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    const convertFn = (txt: string) => txt.replace(/Ўзбекистон/g, 'Özbekiston');

    const result = await convertDocxFile(mockFile, convertFn);

    expect(result.newFilename).toBe('qaror_yangi_alifbo.docx');

    // Natijaviy blobni tekshirish
    const convertedZip = await JSZip.loadAsync(result.blob);
    const convertedXml = await convertedZip.file('word/document.xml')?.async('text');

    expect(convertedXml).toBeDefined();
    expect(convertedXml).toContain('<w:t>Özbekiston</w:t>');
    expect(convertedXml).toContain('<w:t> Respublikasi</w:t>');
    // Formatlash (qalin yozuv teg <w:b/>) saqlanib qolganini tekshirish
    expect(convertedXml).toContain('<w:b/>');
  });

  it('convertZipArchive .zip ichidagi barcha .docx va .txt fayllarni oʻgiradi', async () => {
    const zip = new JSZip();
    zip.file('xat.txt', 'Ўзбекистон ғалаба');
    zip.file('rasm.png', new Uint8Array([1, 2, 3])); // rasm o'zgarmasligi kerak

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const mockZipFile = new File([zipBuffer], 'arxiv.zip', { type: 'application/zip' });

    const convertFn = (txt: string) => txt.replace(/Ў/g, 'Ö').replace(/ғ/g, 'ğ');

    const { convertZipArchive } = await import('../fileConverter');
    const result = await convertZipArchive(mockZipFile, convertFn);

    expect(result.isArchive).toBe(true);
    expect(result.archiveItems?.length).toBe(1); // Faqat xat.txt o'girildi
    expect(result.newFilename).toBe('arxiv_yangi_alifbo.zip');

    const convertedZip = await JSZip.loadAsync(result.blob);
    const convertedTxt = await convertedZip.file('xat.txt')?.async('text');
    expect(convertedTxt).toBe('Öзбекистон ğалаба');
  });
});
