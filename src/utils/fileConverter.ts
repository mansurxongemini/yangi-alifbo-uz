/**
 * Hujjatlarni (Word, Excel, PowerPoint, matn va ZIP arxivlar) oʻgirish moduli.
 *
 * Kafolatlar:
 *  - Office fayllarida XML qayta yigʻilmaydi: faqat matn teglari (<w:t>, <a:t>, <t>)
 *    ichidagi belgilar almashtiriladi, qolgan barcha baytlar (jadval, ustun kengligi,
 *    shrift, uslub, rasm, sahifa sozlamalari) aynan oʻz holicha qoladi.
 *  - Paragraf boʻyicha oʻgiriladi: Word soʻzni bir nechta "run"ga boʻlgan boʻlsa ham
 *    toʻgʻri oʻgiriladi va har bir harf oʻz formatlashida qoladi.
 *  - Arxivdagi biror fayl buzilgan boʻlsa, butun jarayon toʻxtamaydi: u fayl asl holida
 *    qoldiriladi va hisobotda koʻrsatiladi.
 *  - DOM talab qilinmaydi — Web Worker ichida ishlaydi.
 */
import JSZip from 'jszip';
import {
  convertSegments,
  convertTextWithStats,
  computeContext,
  emptyStats,
  addStats,
  ConvertOptions,
  ConvertStats,
  Script,
} from '../core/engine';

import { convertMixed, mixedParagraphTexts, ODF_CFG, HTML_CFG } from './formats/mixed';
import { convertRtfBytes, rtfParagraphs } from './formats/rtf';

export type { Script };

export type FileKind =
  | 'docx' | 'xlsx' | 'pptx' | 'odf' | 'rtf' | 'html' | 'text' | 'markdown' | 'zip' | 'archive' | 'unsupported';

export type ItemStatus = 'converted' | 'unchanged' | 'skipped' | 'error';

export interface ReportItem {
  path: string;
  status: ItemStatus;
  message?: string;
  changedWords?: number;
}

export interface ConvertResult {
  blob: Blob;
  filename: string;
  originalName: string;
  originalSize: number;
  isArchive: boolean;
  report: ReportItem[];
  stats: ConvertStats;
}

export interface ProgressInfo {
  phase: 'reading' | 'converting' | 'packing';
  done: number;
  total: number;
  current?: string;
  /** packing bosqichida 0..100 */
  percent?: number;
}

export type ProgressFn = (p: ProgressInfo) => void;

export interface CancelSignal {
  aborted: boolean;
}

export const MAX_FILE_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5 GB

export const SUPPORTED_EXTENSIONS = [
  '.docx', '.docm', '.dotx', '.xlsx', '.xlsm', '.pptx', '.odt', '.ott', '.ods', '.odp', '.rtf',
  '.html', '.htm', '.txt', '.md', '.csv', '.srt', '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz',
];
export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.join(',');

const TARGET_SUFFIX: Record<Script, string> = {
  new_latin: 'yangi_lotin',
  old_latin: 'eski_lotin',
  cyrillic: 'kirill',
};

export const outputName = (name: string, to: Script): string => {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}_${TARGET_SUFFIX[to]}`;
  return `${name.slice(0, dot)}_${TARGET_SUFFIX[to]}${name.slice(dot)}`;
};

export const kindOf = (name: string): FileKind => {
  const ext = name.toLowerCase().split('.').pop() || '';
  if (['docx', 'docm', 'dotx', 'dotm'].includes(ext)) return 'docx';
  if (['xlsx', 'xlsm', 'xltx'].includes(ext)) return 'xlsx';
  if (['pptx', 'pptm', 'ppsx', 'potx'].includes(ext)) return 'pptx';
  if (['txt', 'csv', 'tsv', 'srt'].includes(ext)) return 'text';
  if (['md', 'markdown'].includes(ext)) return 'markdown';
  if (['odt', 'ott', 'ods', 'ots', 'odp', 'otp'].includes(ext)) return 'odf';
  if (ext === 'rtf') return 'rtf';
  if (['html', 'htm', 'xhtml'].includes(ext)) return 'html';
  if (ext === 'zip') return 'zip';
  if (['rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz', 'tbz2', 'txz'].includes(ext)) return 'archive';
  return 'unsupported';
};

const unsupportedMessage = (name: string): string => {
  const ext = name.toLowerCase().split('.').pop() || '';
  if (ext === 'doc') return 'Eski .doc formati. Wordʼda «Saqlaş → .docx» qilib qayta yuklang.';
  if (ext === 'xls') return 'Eski .xls formati. Excelʼda .xlsx qilib saqlang.';
  if (ext === 'ppt') return 'Eski .ppt formati. PowerPointʼda .pptx qilib saqlang.';
  if (ext === 'pdf') return 'PDF tahrirlanmaydigan format. Asl Word faylini yuklang.';
  if (ext === 'rtf') return 'RTF formati. Wordʼda .docx qilib saqlang.';
  return 'Bu fayl turi matn sifatida ögirilmaydi — özgarişsiz qoldirildi.';
};

export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const yieldToLoop = () => new Promise<void>((r) => setTimeout(r, 0));

export class CancelledError extends Error {
  constructor() {
    super('Bekor qilindi');
    this.name = 'CancelledError';
  }
}

// ---------------------------------------------------------------------------
// XML (OOXML) — jarrohlik usulida matnni almashtirish
// ---------------------------------------------------------------------------

interface XmlConfig {
  para: string[];
  text: string[];
  sep: Record<string, string>;
}

const DOCX_CFG: XmlConfig = {
  para: ['w:p', 'a:p'],
  text: ['w:t', 'a:t'],
  sep: { 'w:tab': '\t', 'w:br': '\n', 'w:cr': '\n', 'w:noBreakHyphen': '-', 'a:br': '\n', 'w:ptab': '\t' },
};
const PPTX_CFG: XmlConfig = { para: ['a:p'], text: ['a:t'], sep: { 'a:br': '\n' } };
const XLSX_CFG: XmlConfig = { para: ['si', 'is', 'a:p'], text: ['t', 'a:t'], sep: { 'a:br': '\n' } };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildTagRe = (cfg: XmlConfig) => {
  const names = [...cfg.para, ...cfg.text, ...Object.keys(cfg.sep)].map(escapeRe).join('|');
  return new RegExp(`<(/?)(${names})(?=[\\s/>])([^>]*)>`, 'g');
};

const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|amp|lt|gt|quot|apos);/g;
const decodeXml = (s: string): string =>
  s.indexOf('&') === -1
    ? s
    : s.replace(ENTITY_RE, (_m, e: string) => {
        switch (e) {
          case 'amp': return '&';
          case 'lt': return '<';
          case 'gt': return '>';
          case 'quot': return '"';
          case 'apos': return "'";
          default:
            return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
        }
      });
const encodeXml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Seg = { start: number; end: number; text: string } | { sep: string };

/** XML dagi paragraflar va ularning matn boʻlaklarini topadi (hujjat tartibida emas). */
const scanParagraphs = (xml: string, cfg: XmlConfig): Seg[][] => {
  const re = buildTagRe(cfg);
  const paraSet = new Set(cfg.para);
  const textSet = new Set(cfg.text);

  const paragraphs: Seg[][] = [];
  const stack: Seg[][] = [];
  const loose: Seg[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const closing = m[1] === '/';
    const name = m[2];
    const selfClosing = m[3].endsWith('/');

    if (paraSet.has(name)) {
      if (selfClosing) continue;
      if (!closing) stack.push([]);
      else {
        const p = stack.pop();
        if (p && p.length) paragraphs.push(p);
      }
      continue;
    }
    if (textSet.has(name)) {
      if (closing || selfClosing) continue;
      const contentStart = re.lastIndex;
      const closeTag = `</${name}>`;
      const endIdx = xml.indexOf(closeTag, contentStart);
      if (endIdx === -1) break;
      const seg: Seg = { start: contentStart, end: endIdx, text: decodeXml(xml.slice(contentStart, endIdx)) };
      (stack.length ? stack[stack.length - 1] : loose).push(seg);
      re.lastIndex = endIdx + closeTag.length;
      continue;
    }
    const sep = cfg.sep[name];
    if (sep !== undefined && !closing && stack.length) stack[stack.length - 1].push({ sep });
  }
  while (stack.length) {
    const p = stack.pop()!;
    if (p.length) paragraphs.push(p);
  }
  for (const s of loose) paragraphs.push([s]);
  return paragraphs;
};

/** Paragraf matnlari hujjat tartibida (preview uchun). */
const paragraphTexts = (xml: string, cfg: XmlConfig): string[] =>
  scanParagraphs(xml, cfg)
    .map((p) => {
      const first = p.find((s): s is { start: number; end: number; text: string } => 'text' in s);
      return { pos: first ? first.start : 0, text: p.map((s) => ('text' in s ? s.text : s.sep)).join('') };
    })
    .sort((a, b) => a.pos - b.pos)
    .map((p) => p.text);

/** Bitta XML qismini oʻgiradi. O'zgarish bo'lmasa null qaytaradi. */
export const convertXmlPart = (
  xml: string,
  cfg: XmlConfig,
  opts: ConvertOptions
): { xml: string | null; stats: ConvertStats } => {
  const paragraphs = scanParagraphs(xml, cfg);
  if (paragraphs.length === 0) return { xml: null, stats: emptyStats() };

  // Hujjat darajasidagi kontekst (qisqa jadval kataklari uchun)
  let docText = '';
  for (const p of paragraphs) {
    for (const s of p) docText += 'text' in s ? s.text : ' ';
    docText += '\n';
    if (docText.length > 300_000) break;
  }
  const docContext = computeContext(docText);

  const replacements: { start: number; end: number; value: string }[] = [];
  let stats = emptyStats();

  for (const p of paragraphs) {
    const texts = p.map((s) => ('text' in s ? s.text : s.sep));
    const r = convertSegments(texts, opts, docContext);
    stats = addStats(stats, r.stats);
    p.forEach((s, idx) => {
      if ('text' in s && r.segments[idx] !== s.text) {
        replacements.push({ start: s.start, end: s.end, value: encodeXml(r.segments[idx]) });
      }
    });
  }

  if (replacements.length === 0) return { xml: null, stats };

  replacements.sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  let pos = 0;
  for (const rep of replacements) {
    parts.push(xml.slice(pos, rep.start), rep.value);
    pos = rep.end;
  }
  parts.push(xml.slice(pos));
  return { xml: parts.join(''), stats };
};

const OOXML_PARTS: Record<'docx' | 'xlsx' | 'pptx', { test: (p: string) => boolean; cfg: XmlConfig }> = {
  docx: {
    test: (p) =>
      /^word\/(document|header\d*|footer\d*|footnotes|endnotes|comments[A-Za-z]*)\.xml$/i.test(p) ||
      /^word\/glossary\/document\.xml$/i.test(p) ||
      /^word\/(charts|diagrams)\/[^/]+\.xml$/i.test(p),
    cfg: DOCX_CFG,
  },
  pptx: {
    test: (p) =>
      /^ppt\/(slides|notesSlides)\/[^/]+\.xml$/i.test(p) || /^ppt\/(charts|diagrams)\/[^/]+\.xml$/i.test(p),
    cfg: PPTX_CFG,
  },
  xlsx: {
    test: (p) =>
      /^xl\/sharedStrings\.xml$/i.test(p) ||
      /^xl\/worksheets\/[^/]+\.xml$/i.test(p) ||
      /^xl\/(charts|drawings)\/[^/]+\.xml$/i.test(p),
    cfg: XLSX_CFG,
  },
};

const isZipMagic = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b;
const isCfbMagic = (b: Uint8Array) =>
  b.length > 7 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;

const MIME: Record<'docx' | 'xlsx' | 'pptx', string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/** Office hujjatini (docx/xlsx/pptx) oʻgiradi. */
export const convertOfficeBytes = async (
  data: Uint8Array,
  kind: 'docx' | 'xlsx' | 'pptx',
  opts: ConvertOptions
): Promise<{ data: Uint8Array; changed: boolean; stats: ConvertStats }> => {
  if (isCfbMagic(data)) {
    throw new Error('Hujjat parol bilan himoyalangan yoki eski formatda. Parolni olib taşlab, .docx qilib saqlang.');
  }
  if (!isZipMagic(data)) throw new Error('Fayl şikastlangan yoki haqiqiy Office hujjati emas.');

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('Fayl şikastlangan — oçib bölmadi.');
  }

  const { test, cfg } = OOXML_PARTS[kind];
  let stats = emptyStats();
  let changed = false;

  for (const path of Object.keys(zip.files)) {
    const entry = zip.files[path];
    if (entry.dir || !test(path)) continue;
    const xml = await entry.async('string');
    const r = convertXmlPart(xml, cfg, opts);
    stats = addStats(stats, r.stats);
    if (r.xml !== null) {
      zip.file(path, r.xml, { date: entry.date, createFolders: false });
      changed = true;
    }
  }

  if (!changed) return { data, changed: false, stats };

  const out = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    mimeType: MIME[kind],
  });
  return { data: out, changed: true, stats };
};

// ---------------------------------------------------------------------------
// Matn fayllari (kodirovka saqlanadi)
// ---------------------------------------------------------------------------

type TextEncoding = 'utf-8' | 'utf-8-bom' | 'utf-16le' | 'utf-16be' | 'windows-1251';

export const decodeTextBytes = (b: Uint8Array): { text: string; encoding: TextEncoding } => {
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) {
    return { text: new TextDecoder('utf-8').decode(b.subarray(3)), encoding: 'utf-8-bom' };
  }
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(b.subarray(2)), encoding: 'utf-16le' };
  }
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(b.subarray(2)), encoding: 'utf-16be' };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(b), encoding: 'utf-8' };
  } catch {
    // Windows kirill (CP1251) — eski kompyuterlarda saqlangan .txt fayllar
    return { text: new TextDecoder('windows-1251').decode(b), encoding: 'windows-1251' };
  }
};

const encodeUtf16 = (text: string, bigEndian: boolean): Uint8Array => {
  const out = new Uint8Array(2 + text.length * 2);
  out[0] = bigEndian ? 0xfe : 0xff;
  out[1] = bigEndian ? 0xff : 0xfe;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    out[2 + i * 2] = bigEndian ? c >> 8 : c & 0xff;
    out[3 + i * 2] = bigEndian ? c & 0xff : c >> 8;
  }
  return out;
};

export const encodeTextBytes = (text: string, encoding: TextEncoding): Uint8Array => {
  if (encoding === 'utf-16le') return encodeUtf16(text, false);
  if (encoding === 'utf-16be') return encodeUtf16(text, true);
  const body = new TextEncoder().encode(text);
  // CP1251 da Ö, Ğ, Ş, Ç, ʼ yoʻq — UTF-8 (BOM bilan, Notepad toʻgʻri ochishi uchun)
  if (encoding === 'utf-8-bom' || encoding === 'windows-1251') {
    const out = new Uint8Array(body.length + 3);
    out.set([0xef, 0xbb, 0xbf]);
    out.set(body, 3);
    return out;
  }
  return body;
};

export const convertTextBytes = (
  data: Uint8Array,
  opts: ConvertOptions
): { data: Uint8Array; changed: boolean; stats: ConvertStats } => {
  const { text, encoding } = decodeTextBytes(data);
  const r = convertTextWithStats(text, opts);
  if (r.text === text && encoding !== 'windows-1251') return { data, changed: false, stats: r.stats };
  return { data: encodeTextBytes(r.text, encoding), changed: r.text !== text, stats: r.stats };
};

// ---------------------------------------------------------------------------
// Bitta faylni oʻgirish
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// ODF (LibreOffice: .odt, .ods, .odp)
// ---------------------------------------------------------------------------

const ODF_MIME: Record<string, string> = {
  odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  odp: 'application/vnd.oasis.opendocument.presentation',
};
const ODF_PARTS = ['content.xml', 'styles.xml'];

export const convertOdfBytes = async (
  data: Uint8Array,
  opts: ConvertOptions
): Promise<{ data: Uint8Array; changed: boolean; stats: ConvertStats }> => {
  if (!isZipMagic(data)) throw new Error('Fayl şikastlangan yoki haqiqiy OpenDocument hujjati emas.');
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error('Fayl şikastlangan — oçib bölmadi.');
  }
  const manifest = await zip.file('META-INF/manifest.xml')?.async('string');
  if (manifest && manifest.includes('encryption-data')) {
    throw new Error('Hujjat parol bilan himoyalangan. Parolni olib taşlab, qayta saqlang.');
  }
  let stats = emptyStats();
  let changed = false;
  for (const part of ODF_PARTS) {
    const entry = zip.file(part);
    if (!entry) continue;
    const xml = await entry.async('string');
    const r = convertMixed(xml, ODF_CFG, opts);
    stats = addStats(stats, r.stats);
    if (r.out !== null) {
      zip.file(part, r.out, { date: entry.date, createFolders: false });
      changed = true;
    }
  }
  if (!changed) return { data, changed: false, stats };
  // ODF talabi: «mimetype» birinchi va siqilmagan holda turishi shart
  const mt = zip.file('mimetype');
  const mimeText = mt ? await mt.async('string') : ODF_MIME.odt;
  if (mt) zip.file('mimetype', mimeText, { compression: 'STORE', date: mt.date });
  const out = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: mimeText });
  return { data: out, changed: true, stats };
};

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

export const convertHtmlBytes = (
  data: Uint8Array,
  opts: ConvertOptions
): { data: Uint8Array; changed: boolean; stats: ConvertStats } => {
  const { text, encoding } = decodeTextBytes(data);
  const r = convertMixed(text, HTML_CFG, opts);
  if (r.out === null && encoding !== 'windows-1251') return { data, changed: false, stats: r.stats };
  let out = r.out ?? text;
  let enc: TextEncoding = encoding;
  if (encoding === 'windows-1251') {
    // CP1251 da yangi harflar yo'q — UTF-8 ga o'tkazamiz va charset ni ham yangilaymiz
    out = out.replace(/(<meta\b[^>]*charset\s*=\s*["']?)(windows-1251|cp1251|x-cp1251)/gi, '$1utf-8');
    enc = 'utf-8';
  }
  return { data: encodeTextBytes(out, enc), changed: r.out !== null, stats: r.stats };
};

const convertBytesByKind = async (
  data: Uint8Array,
  kind: FileKind,
  opts: ConvertOptions
): Promise<{ data: Uint8Array; changed: boolean; stats: ConvertStats }> => {
  if (kind === 'docx' || kind === 'xlsx' || kind === 'pptx') return convertOfficeBytes(data, kind, opts);
  if (kind === 'odf') return convertOdfBytes(data, opts);
  if (kind === 'rtf') return convertRtfBytes(data, opts);
  if (kind === 'html') return convertHtmlBytes(data, opts);
  if (kind === 'text') return convertTextBytes(data, { ...opts, markdown: false });
  if (kind === 'markdown') return convertTextBytes(data, { ...opts, markdown: true });
  throw new Error('Qöllab-quvvatlanmaydigan format');
};

const mimeFor = (kind: FileKind): string => {
  if (kind === 'docx' || kind === 'xlsx' || kind === 'pptx') return MIME[kind];
  if (kind === 'markdown') return 'text/markdown;charset=utf-8';
  if (kind === 'odf') return 'application/vnd.oasis.opendocument.text';
  if (kind === 'rtf') return 'application/rtf';
  if (kind === 'html') return 'text/html;charset=utf-8';
  if (kind === 'zip' || kind === 'archive') return 'application/zip';
  return 'text/plain;charset=utf-8';
};

// ---------------------------------------------------------------------------
// ZIP arxiv
// ---------------------------------------------------------------------------

/** Windows "Siqilgan papka" kirill nomlarni CP866 da yozadi — toʻgʻri oʻqish uchun. */
const decodeZipName = (bytes: string[] | Uint8Array | Buffer): string => {
  const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes as string[], (c) => Number(c));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(arr);
  } catch {
    try {
      return new TextDecoder('ibm866').decode(arr);
    } catch {
      return Array.from(arr, (c) => String.fromCharCode(c)).join('');
    }
  }
};

const isJunk = (path: string) => {
  const base = path.split('/').pop() || '';
  return path.startsWith('__MACOSX/') || base === '.DS_Store' || base === 'Thumbs.db' || base.startsWith('~$');
};

const ALREADY_COMPRESSED = new Set(['docx', 'xlsx', 'pptx', 'odf', 'zip', 'archive']);

interface SourceEntry {
  path: string;
  dir: boolean;
  date?: Date;
  read: () => Promise<Uint8Array>;
  /** Arxivni ochib bo'lmagan bo'lsa — asl holida qo'shiladi va xato sifatida ko'rsatiladi */
  error?: string;
}

/** Arxiv ichidagi fayllarni o'girib, yangi ZIP yig'adi (ZIP, RAR, 7z uchun umumiy). */
const convertEntries = async (
  entries: SourceEntry[],
  opts: ConvertOptions,
  onProgress?: ProgressFn,
  signal?: CancelSignal
): Promise<{ blob: Blob; report: ReportItem[]; stats: ConvertStats }> => {
  const total = entries.filter((e) => !e.dir).length;
  const out = new JSZip();
  const report: ReportItem[] = [];
  let stats = emptyStats();
  let done = 0;

  for (const entry of entries) {
    if (signal?.aborted) throw new CancelledError();
    const path = entry.path;
    if (entry.dir) {
      out.folder(path);
      continue;
    }
    onProgress?.({ phase: 'converting', done, total, current: path });

    const raw = await entry.read();
    if (entry.error) {
      out.file(path, raw, { date: entry.date, binary: true, compression: 'STORE' });
      report.push({ path, status: 'error', message: entry.error });
      done++;
      continue;
    }
    const kind = isJunk(path) ? 'unsupported' : kindOf(path);
    const ext = kind === 'unsupported' ? '' : kind;
    const fileOpts = { date: entry.date, binary: true, compression: ALREADY_COMPRESSED.has(ext) ? 'STORE' : 'DEFLATE' } as const;

    if (kind === 'unsupported' || kind === 'zip' || kind === 'archive') {
      out.file(path, raw, fileOpts);
      report.push({
        path,
        status: 'skipped',
        message: isJunk(path)
          ? 'Tizim fayli — özgarişsiz'
          : kind === 'zip' || kind === 'archive'
            ? 'Arxiv içidagi arxiv — alohida yuklang'
            : unsupportedMessage(path),
      });
    } else {
      try {
        const r = await convertBytesByKind(raw, kind, opts);
        stats = addStats(stats, r.stats);
        out.file(path, r.data, fileOpts);
        report.push({
          path,
          status: r.changed ? 'converted' : 'unchanged',
          changedWords: r.stats.changed,
          message: r.changed ? undefined : 'Ögiriladigan harf topilmadi',
        });
      } catch (err) {
        out.file(path, raw, fileOpts);
        report.push({ path, status: 'error', message: err instanceof Error ? err.message : String(err) });
      }
    }
    done++;
    onProgress?.({ phase: 'converting', done, total, current: path });
    // Interfeys va bekor qilish signali uchun
    if (done % 4 === 0) await yieldToLoop();
  }

  if (signal?.aborted) throw new CancelledError();
  onProgress?.({ phase: 'packing', done, total, percent: 0 });
  const blob = await out.generateAsync(
    { type: 'blob', mimeType: 'application/zip', streamFiles: true },
    (meta) => onProgress?.({ phase: 'packing', done, total, percent: meta.percent })
  );
  return { blob, report, stats };
};

export const convertArchiveBytes = async (
  data: Uint8Array | Blob,
  opts: ConvertOptions,
  onProgress?: ProgressFn,
  signal?: CancelSignal
): Promise<{ blob: Blob; report: ReportItem[]; stats: ConvertStats }> => {
  onProgress?.({ phase: 'reading', done: 0, total: 0 });
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data, { decodeFileName: decodeZipName });
  } catch {
    throw new Error('ZIP arxivni oçib bölmadi. Arxiv şikastlangan yoki parol bilan himoyalangan bölişi mumkin.');
  }
  const entries: SourceEntry[] = Object.values(zip.files).map((e) => ({
    path: e.name,
    dir: e.dir,
    date: e.date,
    read: async () => {
      const d = await e.async('uint8array');
      zip.remove(e.name); // xotirani boʻshatish
      return d;
    },
  }));
  return convertEntries(entries, opts, onProgress, signal);
};

// ---------------------------------------------------------------------------
// Bir nechta fayl (va papkalar) bir vaqtda
// ---------------------------------------------------------------------------

/** Foydalanuvchi tanlagan fayl: `path` — papka ichidagi nisbiy yo'l (masalan, "Buyruqlar/1.docx"). */
export interface InputItem {
  blob: Blob;
  path: string;
}

interface PlannedInput {
  item: InputItem;
  kind: FileKind;
  /** Natija arxividagi yo'l (oddiy fayl) yoki papka nomi (arxiv ichidagilar shu papkaga) */
  path: string;
}

const stripExt = (p: string) => p.replace(/(\.tar)?\.[^./]+$/i, '');

/** Takroriy nomlarni ajratadi va arxivlar uchun papka nomini belgilaydi. Natija deterministik. */
export const planInputs = (items: InputItem[]): PlannedInput[] => {
  const used = new Set<string>();
  const unique = (p: string) => {
    if (!used.has(p.toLowerCase())) {
      used.add(p.toLowerCase());
      return p;
    }
    const dot = p.lastIndexOf('.');
    const slash = p.lastIndexOf('/');
    const [base, ext] = dot > slash + 0 && dot > 0 ? [p.slice(0, dot), p.slice(dot)] : [p, ''];
    for (let k = 2; ; k++) {
      const c = `${base} (${k})${ext}`;
      if (!used.has(c.toLowerCase())) {
        used.add(c.toLowerCase());
        return c;
      }
    }
  };
  return items.map((item) => {
    const clean = item.path.replace(/^\/+/, '').replace(/\\/g, '/');
    const kind = kindOf(clean);
    const isArch = kind === 'zip' || kind === 'archive';
    return { item, kind, path: unique(isArch ? stripExt(clean) : clean) };
  });
};

/** Natija arxivi nomi: hammasi bitta papkadan bo'lsa — o'sha papka nomi. */
export const batchName = (items: InputItem[], to: Script): string => {
  const tops = new Set(items.map((i) => (i.path.includes('/') ? i.path.split('/')[0] : '')));
  const base = tops.size === 1 && [...tops][0] ? [...tops][0] : 'hujjatlar';
  return outputName(`${base}.zip`, to);
};

export const convertMany = async (
  items: InputItem[],
  opts: ConvertOptions,
  onProgress?: ProgressFn,
  signal?: CancelSignal
): Promise<ConvertResult> => {
  const totalSize = items.reduce((a, i) => a + i.blob.size, 0);
  if (totalSize > MAX_FILE_SIZE) {
    throw new Error(`Fayllar jami juda katta (${formatFileSize(totalSize)}). Eng köpi bilan ${formatFileSize(MAX_FILE_SIZE)}. Bir neçta qismga bölib yuklang.`);
  }
  onProgress?.({ phase: 'reading', done: 0, total: 0 });
  const entries: SourceEntry[] = [];
  for (const pl of planInputs(items)) {
    if (signal?.aborted) throw new CancelledError();
    const date = pl.item.blob instanceof File ? new Date(pl.item.blob.lastModified) : undefined;
    if (pl.kind === 'zip' || pl.kind === 'archive') {
      try {
        if (pl.kind === 'zip') {
          const zip = await JSZip.loadAsync(pl.item.blob, { decodeFileName: decodeZipName });
          for (const e of Object.values(zip.files)) {
            entries.push({
              path: `${pl.path}/${e.name}`,
              dir: e.dir,
              date: e.date,
              read: async () => {
                const d = await e.async('uint8array');
                zip.remove(e.name);
                return d;
              },
            });
          }
        } else {
          const { extractWith7z } = await import('./formats/archive7z');
          for (const f of await extractWith7z(pl.item.blob)) {
            entries.push({ path: `${pl.path}/${f.path}`, dir: false, date: f.date, read: async () => f.data });
          }
        }
      } catch (err) {
        // Arxivni ochib bo'lmadi — asl holida qo'shamiz, qolgan fayllar davom etadi
        entries.push({
          path: pl.item.path.split('/').pop() === pl.item.path ? pl.item.path : pl.item.path,
          dir: false,
          date,
          read: async () => new Uint8Array(await pl.item.blob.arrayBuffer()),
          error: err instanceof Error ? err.message : 'Arxivni oçib bölmadi',
        });
      }
    } else {
      entries.push({ path: pl.path, dir: false, date, read: async () => new Uint8Array(await pl.item.blob.arrayBuffer()) });
    }
  }
  const r = await convertEntries(entries, opts, onProgress, signal);
  return {
    blob: r.blob,
    filename: batchName(items, opts.to),
    originalName: `${items.length} ta fayl`,
    originalSize: totalSize,
    isArchive: true,
    report: r.report,
    stats: r.stats,
  };
};

/** Bitta fayl — o'z formatida qaytadi; bir nechta fayl yoki papka — bitta ZIP. */
export const convertInputs = (
  items: InputItem[],
  opts: ConvertOptions,
  onProgress?: ProgressFn,
  signal?: CancelSignal
): Promise<ConvertResult> =>
  items.length === 1 && !items[0].path.includes('/')
    ? convertFile(items[0].blob, items[0].path, opts, onProgress, signal)
    : convertMany(items, opts, onProgress, signal);

/** Natija arxividagi yo'l bo'yicha asl faylni topib o'qiydi (ko'rish uchun). */
export const readInputEntry = async (items: InputItem[], path: string): Promise<Uint8Array> => {
  for (const pl of planInputs(items)) {
    if ((pl.kind === 'zip' || pl.kind === 'archive') && path.startsWith(pl.path + '/')) {
      const name = pl.item.path.split('/').pop() || pl.item.path;
      return readArchiveEntry(pl.item.blob, name, path.slice(pl.path.length + 1));
    }
    if (pl.path === path) return new Uint8Array(await pl.item.blob.arrayBuffer());
  }
  throw new Error('Fayl topilmadi');
};

/** RAR, 7z, TAR, GZ — 7-Zip (WASM) bilan ochiladi, natija ZIP bo'ladi. */
export const convertOtherArchive = async (
  file: Blob,
  opts: ConvertOptions,
  onProgress?: ProgressFn,
  signal?: CancelSignal
): Promise<{ blob: Blob; report: ReportItem[]; stats: ConvertStats }> => {
  onProgress?.({ phase: 'reading', done: 0, total: 0 });
  const { extractWith7z } = await import('./formats/archive7z');
  const files = await extractWith7z(file);
  if (signal?.aborted) throw new CancelledError();
  const entries: SourceEntry[] = files.map((f) => ({ path: f.path, dir: false, date: f.date, read: async () => f.data }));
  return convertEntries(entries, opts, onProgress, signal);
};

// ---------------------------------------------------------------------------
// Umumiy kirish nuqtasi
// ---------------------------------------------------------------------------

export const convertFile = async (
  file: Blob,
  name: string,
  opts: ConvertOptions,
  onProgress?: ProgressFn,
  signal?: CancelSignal
): Promise<ConvertResult> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Fayl juda katta (${formatFileSize(file.size)}). Eng köpi bilan ${formatFileSize(MAX_FILE_SIZE)}. Arxivni bir neçta qismga bölib yuklang.`);
  }
  const kind = kindOf(name);
  // RAR/7z natijasi ZIP bo'ladi
  const filename = kind === 'archive' ? outputName(name.replace(/(\.tar)?\.[^.]+$/i, '') + '.zip', opts.to) : outputName(name, opts.to);

  if (kind === 'zip' || kind === 'archive') {
    const r = kind === 'zip' ? await convertArchiveBytes(file, opts, onProgress, signal) : await convertOtherArchive(file, opts, onProgress, signal);
    return {
      blob: r.blob,
      filename,
      originalName: name,
      originalSize: file.size,
      isArchive: true,
      report: r.report,
      stats: r.stats,
    };
  }

  if (kind === 'unsupported') throw new Error(unsupportedMessage(name));

  onProgress?.({ phase: 'converting', done: 0, total: 1, current: name });
  const data = new Uint8Array(await file.arrayBuffer());
  const r = await convertBytesByKind(data, kind, opts);
  onProgress?.({ phase: 'converting', done: 1, total: 1, current: name });
  return {
    blob: new Blob([r.data as BlobPart], { type: mimeFor(kind) }),
    filename,
    originalName: name,
    originalSize: file.size,
    isArchive: false,
    report: [
      {
        path: name,
        status: r.changed ? 'converted' : 'unchanged',
        changedWords: r.stats.changed,
        message: r.changed ? undefined : 'Ögiriladigan harf topilmadi',
      },
    ],
    stats: r.stats,
  };
};

/** Tayyor ZIP natijadan bitta faylni ajratib olish (xotirani tejash uchun talab boʻyicha). */
export const extractFromZip = async (zipBlob: Blob, path: string): Promise<Blob> => {
  const zip = await JSZip.loadAsync(zipBlob);
  const entry = zip.file(path);
  if (!entry) throw new Error('Fayl topilmadi');
  const data = await entry.async('uint8array');
  return new Blob([data as BlobPart], { type: mimeFor(kindOf(path)) });
};

// ---------------------------------------------------------------------------
// Koʻrish (preview): oʻzgargan soʻzlar belgilangan hujjat
// ---------------------------------------------------------------------------

export type PreviewData =
  | { type: 'docx'; marked: Uint8Array; original: Uint8Array; originals: string[] }
  | { type: 'paragraphs'; marked: string[]; original: string[]; originals: string[] }
  | { type: 'text'; marked: string; original: string; originals: string[]; markdown: boolean };

const officeParagraphs = async (data: Uint8Array, kind: 'xlsx' | 'pptx'): Promise<string[]> => {
  const zip = await JSZip.loadAsync(data);
  const { test, cfg } = OOXML_PARTS[kind];
  const paths = Object.keys(zip.files)
    .filter((p) => !zip.files[p].dir && test(p))
    // slide2 < slide10 tartibida
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const out: string[] = [];
  for (const p of paths) {
    const texts = paragraphTexts(await zip.files[p].async('string'), cfg).filter((t) => t.trim());
    if (texts.length && out.length) out.push('');
    out.push(...texts);
  }
  return out;
};

/** Bitta faylning koʻrinishini tayyorlaydi (asosiy oqimda, bitta fayl uchun tez). */
export const buildPreview = async (data: Uint8Array, name: string, opts: ConvertOptions): Promise<PreviewData> => {
  const kind = kindOf(name);
  const originals: string[] = [];
  const markOpts: ConvertOptions = { ...opts, markSink: originals };
  if (kind === 'docx') {
    const r = await convertOfficeBytes(data, 'docx', markOpts);
    return { type: 'docx', marked: r.data, original: data, originals };
  }
  if (kind === 'xlsx' || kind === 'pptx') {
    const r = await convertOfficeBytes(data, kind, markOpts);
    return { type: 'paragraphs', marked: await officeParagraphs(r.data, kind), original: await officeParagraphs(data, kind), originals };
  }
  if (kind === 'odf') {
    const r = await convertOdfBytes(data, markOpts);
    const paras = async (d: Uint8Array) => {
      const zip = await JSZip.loadAsync(d);
      const out: string[] = [];
      for (const part of ['content.xml']) {
        const xml = await zip.file(part)?.async('string');
        if (xml) out.push(...mixedParagraphTexts(xml, ODF_CFG));
      }
      return out;
    };
    return { type: 'paragraphs', marked: await paras(r.data), original: await paras(data), originals };
  }
  if (kind === 'rtf') {
    const r = convertRtfBytes(data, markOpts);
    return { type: 'paragraphs', marked: rtfParagraphs(r.data), original: rtfParagraphs(data), originals };
  }
  if (kind === 'html') {
    const { text } = decodeTextBytes(data);
    const marked = convertMixed(text, HTML_CFG, markOpts).out ?? text;
    return { type: 'paragraphs', marked: mixedParagraphTexts(marked, HTML_CFG), original: mixedParagraphTexts(text, HTML_CFG), originals };
  }
  if (kind === 'text' || kind === 'markdown') {
    const { text } = decodeTextBytes(data);
    const marked = convertTextWithStats(text, { ...markOpts, markdown: kind === 'markdown' }).text;
    return { type: 'text', marked, original: text, originals, markdown: kind === 'markdown' };
  }
  throw new Error('Bu fayl turini körib bölmaydi.');
};

/** Asl (yuklangan) arxiv ichidan bitta faylni oʻqish: ZIP — JSZip, RAR/7z — 7-Zip. */
export const readArchiveEntry = async (archive: Blob, name: string, path: string): Promise<Uint8Array> => {
  if (kindOf(name) !== 'archive') return readZipEntry(archive, path);
  const { extractWith7z } = await import('./formats/archive7z');
  const hit = (await extractWith7z(archive)).find((e) => e.path === path);
  if (!hit) throw new Error('Fayl arxivda topilmadi');
  return hit.data;
};

/** Asl (yuklangan) ZIP ichidan bitta faylni oʻqish. */
export const readZipEntry = async (zipFile: Blob, path: string): Promise<Uint8Array> => {
  const zip = await JSZip.loadAsync(zipFile, { decodeFileName: decodeZipName });
  const entry = zip.file(path);
  if (!entry) throw new Error('Fayl arxivda topilmadi');
  return entry.async('uint8array');
};
