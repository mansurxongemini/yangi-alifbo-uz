import JSZip from 'jszip';
import {
  kirillToYangiLotin,
  eskiLotinToYangiLotin,
  yangiLotinToEskiLotin,
  yangiLotinToKirill,
  autoTransliterate,
} from '../core/transliterate';

export type SourceScript = 'auto' | 'eski_lotin' | 'cyrillic' | 'new_latin';
export type TargetScript = 'new_latin' | 'eski_lotin' | 'cyrillic';

export interface ConvertedItem {
  filename: string;
  blob: Blob;
  size: number;
}

export interface ConvertResult {
  blob: Blob;
  newFilename: string;
  originalSize: number;
  isArchive?: boolean;
  archiveItems?: ConvertedItem[];
  wordCount?: number;
  charCount?: number;
}

/**
 * Manba va Natija yozuviga qarab mos transliteratsiya funksiyasini qaytaradi.
 */
export const getConvertFunction = (
  source: SourceScript,
  target: TargetScript
): ((text: string) => string) => {
  if (source === 'auto') {
    return (text: string) => autoTransliterate(text, 'new_latin').result;
  }
  if (source === 'eski_lotin' && target === 'new_latin') {
    return eskiLotinToYangiLotin;
  }
  if (source === 'cyrillic' && target === 'new_latin') {
    return kirillToYangiLotin;
  }
  if (source === 'new_latin' && target === 'eski_lotin') {
    return yangiLotinToEskiLotin;
  }
  if (source === 'new_latin' && target === 'cyrillic') {
    return yangiLotinToKirill;
  }
  return eskiLotinToYangiLotin;
};

/**
 * Bayt oʻlchamini odam tushunadigan formatga keltiradi (masalan: 24.5 KB).
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Docx arrayBuffer yoki Uint8Array maʼlumotini XML darajasida transliteratsiya qiladi.
 */
export const convertDocxBuffer = async (
  buffer: ArrayBuffer | Uint8Array,
  convertFn: (text: string) => string
): Promise<{ blob: Blob; fullExtractedLength: number; wordCount: number }> => {
  const zip = await JSZip.loadAsync(buffer);

  const xmlFileNames = Object.keys(zip.files).filter((name) => {
    return (
      (name.startsWith('word/') || name.startsWith('word\\')) &&
      name.endsWith('.xml')
    );
  });

  const hasDOMParser =
    typeof DOMParser !== 'undefined' && typeof XMLSerializer !== 'undefined';
  const parser = hasDOMParser ? new DOMParser() : null;
  const serializer = hasDOMParser ? new XMLSerializer() : null;

  let fullExtractedLength = 0;
  let wordCount = 0;

  for (const name of xmlFileNames) {
    const fileEntry = zip.files[name];
    if (!fileEntry || fileEntry.dir) continue;

    const xmlString = await fileEntry.async('text');

    if (parser && serializer) {
      const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
      const parseErrors = xmlDoc.getElementsByTagName('parsererror');

      if (parseErrors.length === 0) {
        const textNodes = xmlDoc.getElementsByTagName('w:t');
        for (let i = 0; i < textNodes.length; i++) {
          const node = textNodes[i];
          const originalText = node.textContent ?? '';
          if (originalText) {
            const converted = convertFn(originalText);
            node.textContent = converted;
            fullExtractedLength += converted.length;
            wordCount += converted.trim().split(/\s+/).filter(Boolean).length;
          }
        }
        zip.file(name, serializer.serializeToString(xmlDoc));
        continue;
      }
    }

    // Fallback: Regex orqali <w:t> ni almashtirish
    const replaced = xmlString.replace(
      /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/g,
      (_match, openTag, text, closeTag) => {
        const converted = convertFn(text);
        fullExtractedLength += converted.length;
        wordCount += converted.trim().split(/\s+/).filter(Boolean).length;
        return openTag + converted + closeTag;
      }
    );
    zip.file(name, replaced);
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return { blob, fullExtractedLength, wordCount };
};

/**
 * Word (.docx) faylini formatlashni 100% saqlagan holda oʻgiradi.
 */
export const convertDocxFile = async (
  file: File,
  convertFn: (text: string) => string
): Promise<ConvertResult> => {
  const arrayBuffer = await file.arrayBuffer();
  const { blob, fullExtractedLength, wordCount } = await convertDocxBuffer(
    arrayBuffer,
    convertFn
  );

  const baseName = file.name.replace(/\.docx$/i, '');
  const newFilename = `${baseName}_yangi_alifbo.docx`;

  return {
    blob,
    newFilename,
    originalSize: file.size,
    wordCount,
    charCount: fullExtractedLength,
  };
};

/**
 * Matn (.txt) faylini transliteratsiya qiladi.
 */
export const convertTxtFile = async (
  file: File,
  convertFn: (text: string) => string
): Promise<ConvertResult> => {
  const originalText = await file.text();
  const convertedText = convertFn(originalText);

  const generatedBlob = new Blob([convertedText], {
    type: 'text/plain;charset=utf-8',
  });

  const baseName = file.name.replace(/\.txt$/i, '');
  const newFilename = `${baseName}_yangi_alifbo.txt`;

  const words = convertedText.trim()
    ? convertedText.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return {
    blob: generatedBlob,
    newFilename,
    originalSize: file.size,
    wordCount: words,
    charCount: convertedText.length,
  };
};

/**
 * ZIP arxivini ochib, ichidagi barcha .docx va .txt fayllarni oʻgirib,
 * ham yangi ZIP yaratadi, ham har bir faylni alohida ajratib beradi.
 */
export const convertZipArchive = async (
  file: File,
  convertFn: (text: string) => string
): Promise<ConvertResult> => {
  const inputZip = await JSZip.loadAsync(file);
  const outputZip = new JSZip();
  const archiveItems: ConvertedItem[] = [];

  let totalChars = 0;
  let totalWords = 0;

  for (const relativePath of Object.keys(inputZip.files)) {
    const entry = inputZip.files[relativePath];
    if (entry.dir) {
      outputZip.folder(relativePath);
      continue;
    }

    const lowerPath = relativePath.toLowerCase();

    // 1) DOCX fayllar
    if (lowerPath.endsWith('.docx')) {
      const buffer = await entry.async('arraybuffer');
      const { blob, fullExtractedLength, wordCount } = await convertDocxBuffer(
        buffer,
        convertFn
      );
      totalChars += fullExtractedLength;
      totalWords += wordCount;

      outputZip.file(relativePath, blob);

      const fileName = relativePath.split('/').pop() || relativePath;
      archiveItems.push({
        filename: fileName,
        blob,
        size: blob.size,
      });
    }
    // 2) TXT fayllar
    else if (lowerPath.endsWith('.txt')) {
      const text = await entry.async('text');
      const converted = convertFn(text);
      totalChars += converted.length;
      totalWords += converted.trim().split(/\s+/).filter(Boolean).length;

      const txtBlob = new Blob([converted], {
        type: 'text/plain;charset=utf-8',
      });
      outputZip.file(relativePath, txtBlob);

      const fileName = relativePath.split('/').pop() || relativePath;
      archiveItems.push({
        filename: fileName,
        blob: txtBlob,
        size: txtBlob.size,
      });
    }
    // 3) Boshqa har qanday fayl (rasm, rtf va h.k.) oʻzgarishsiz saqlanadi
    else {
      const originalData = await entry.async('uint8array');
      outputZip.file(relativePath, originalData);
    }
  }

  const finalZipBlob = await outputZip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
  });

  const baseName = file.name.replace(/\.zip$/i, '');
  const newFilename = `${baseName}_yangi_alifbo.zip`;

  return {
    blob: finalZipBlob,
    newFilename,
    originalSize: file.size,
    isArchive: true,
    archiveItems,
    wordCount: totalWords,
    charCount: totalChars,
  };
};

/**
 * Har qanday yuklangan faylni (.docx, .txt, .zip) avtomatik aniqlab oʻgiradi.
 */
export const processUploadedFile = async (
  file: File,
  source: SourceScript,
  target: TargetScript
): Promise<ConvertResult> => {
  const convertFn = getConvertFunction(source, target);
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.docx')) {
    return await convertDocxFile(file, convertFn);
  }

  if (lowerName.endsWith('.txt')) {
    return await convertTxtFile(file, convertFn);
  }

  if (lowerName.endsWith('.zip')) {
    return await convertZipArchive(file, convertFn);
  }

  throw new Error(
    'Faqat Word (.docx), matn (.txt) yoki ZIP (.zip) formatidagi fayllar qoʻllab-quvvatlanadi.'
  );
};
