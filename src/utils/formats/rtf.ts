/**
 * RTF hujjatlarini formatni buzmasdan o'girish.
 *
 * RTF — 7 bitli matn: formatlash buyruqlari (\b, \fs24, \cf1 ...) va guruhlar ({...}).
 * Kirill harflar odatda \'hh (shrift kodirovkasidagi bayt, masalan CP1251) yoki \uN
 * ko'rinishida yoziladi. Tahlilchi ko'rinadigan har bir belgining manbadagi o'rnini
 * eslab qoladi; o'girishdan keyin faqat o'zgargan belgilarning baytlari almashtiriladi,
 * qolgan hammasi (shriftlar, ranglar, jadvallar, rasmlar) bayt-bayt o'z holicha qoladi.
 */
import { convertSegments, computeContext, emptyStats, addStats, ConvertOptions, ConvertStats } from '../../core/engine';

interface VChar {
  start: number;
  end: number;
  ch: string;
  /** \uN dan keyingi zaxira belgilar soni (yangi \u yozish uchun) */
  uc: number;
}
type Item = VChar | { sep: string };

interface GroupState {
  uc: number;
  font: number;
  skip: boolean;
  fontTbl: boolean;
  fresh: boolean;
}

// Matni ko'rinmaydigan (yoki o'girilmasligi kerak bo'lgan) "destination" guruhlar
const SKIP_DEST = new Set([
  'fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'objdata', 'themedata', 'colorschememapping',
  'datastore', 'latentstyles', 'xmlnstbl', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'fldinst',
  'filetbl', 'revtbl', 'pgdsctbl', 'mmathPr', 'xmlopen', 'nonshppict', 'sp', 'bkmkstart', 'bkmkend', 'atnauthor',
  'atnid', 'atndate', 'listtext', 'pntext', 'pntxta', 'pntxtb', 'protusertbl', 'userprops', 'docvar', 'blipuid',
  'passwordhash', 'wgrffmtfilter', 'aftnsep', 'aftnsepc', 'ftnsep', 'ftnsepc', 'falt', 'panose', 'fname',
]);

// Paragraf / katak ajratuvchilari
const SEP_WORDS: Record<string, string> = {
  par: '\n', sect: '\n', page: '\n', line: '\n', cell: '\n', row: '\n', nestcell: '\n', nestrow: '\n', tab: '\t',
};
// Belgi beruvchi buyruqlar
const CHAR_WORDS: Record<string, string> = {
  emdash: '—', endash: '–', lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”', bullet: '•', emspace: ' ', enspace: ' ',
};

const CHARSET_CP: Record<number, number> = {
  0: 1252, 161: 1253, 162: 1254, 163: 1258, 177: 1255, 178: 1256, 186: 1257, 204: 1251, 222: 874, 238: 1250,
};

const decoders = new Map<number, TextDecoder | null>();
const decodeByte = (b: number, cp: number): string => {
  if (b < 0x80) return String.fromCharCode(b);
  let d = decoders.get(cp);
  if (d === undefined) {
    try {
      d = new TextDecoder(`windows-${cp}`);
    } catch {
      d = null;
    }
    decoders.set(cp, d);
  }
  return d ? d.decode(new Uint8Array([b])) : String.fromCharCode(b);
};

const bytesToString = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return s;
};
const stringToBytes = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

const isLetter = (c: number) => (c >= 97 && c <= 122) || (c >= 65 && c <= 90);
const isDigit = (c: number) => c >= 48 && c <= 57;

/** RTF ni tahlil qilib, ko'rinadigan belgilar va ajratuvchilar ro'yxatini qaytaradi. */
export const parseRtf = (s: string): Item[] => {
  const items: Item[] = [];
  const fontCp = new Map<number, number>();
  let defaultCp = 1252;
  let defFont = -1;
  let st: GroupState = { uc: 1, font: -1, skip: false, fontTbl: false, fresh: false };
  const stack: GroupState[] = [];
  let curFontDef = -1;
  let i = 0;
  const n = s.length;
  let pendingSkip = 0; // \uN dan keyin o'tkazib yuboriladigan zaxira belgilar

  const cpNow = () => {
    const f = st.font >= 0 ? st.font : defFont;
    return fontCp.get(f) ?? defaultCp;
  };
  const emit = (start: number, end: number, ch: string) => {
    if (st.skip || st.fontTbl) return;
    items.push({ start, end, ch, uc: st.uc });
  };
  // Zaxira belgini oxirgi \u belgisiga qo'shib yuborish
  const absorb = (end: number) => {
    pendingSkip--;
    const last = items[items.length - 1];
    if (last && 'ch' in last) last.end = end;
  };

  while (i < n) {
    const c = s.charCodeAt(i);
    if (c === 123 /* { */) {
      stack.push(st);
      st = { ...st, fresh: true };
      pendingSkip = 0;
      i++;
      continue;
    }
    if (c === 125 /* } */) {
      st = stack.pop() ?? st;
      pendingSkip = 0;
      i++;
      continue;
    }
    if (c === 13 || c === 10) {
      i++;
      continue;
    }
    if (c === 92 /* \ */) {
      const start = i;
      const nc = s.charCodeAt(i + 1);
      if (isLetter(nc)) {
        let j = i + 1;
        while (j < n && isLetter(s.charCodeAt(j))) j++;
        const word = s.slice(i + 1, j);
        let param: number | null = null;
        let k = j;
        if (s[k] === '-' || isDigit(s.charCodeAt(k))) {
          let e = k + 1;
          while (e < n && isDigit(s.charCodeAt(e))) e++;
          param = parseInt(s.slice(k, e), 10);
          k = e;
        }
        if (s[k] === ' ') k++;
        i = k;
        const wasFresh = st.fresh;
        st.fresh = false;

        if (pendingSkip > 0 && word !== 'u') {
          // zaxira sifatida kelgan buyruq (kamdan-kam) — hisobga olamiz
          absorb(i);
          continue;
        }
        if (word === 'bin' && param && param > 0) {
          i += param;
          continue;
        }
        if (wasFresh && SKIP_DEST.has(word)) {
          if (word === 'fonttbl') st.fontTbl = true;
          else st.skip = true;
          continue;
        }
        if (st.fontTbl) {
          if (word === 'f' && param !== null) curFontDef = param;
          else if (word === 'fcharset' && param !== null && CHARSET_CP[param]) fontCp.set(curFontDef, CHARSET_CP[param]);
          else if (word === 'cpg' && param) fontCp.set(curFontDef, param);
          continue;
        }
        switch (word) {
          case 'ansicpg':
            if (param) defaultCp = param;
            break;
          case 'deff':
            if (param !== null) defFont = param;
            break;
          case 'f':
            if (param !== null) st.font = param;
            break;
          case 'uc':
            if (param !== null) st.uc = param;
            break;
          case 'u':
            if (param !== null) {
              const code = param < 0 ? param + 65536 : param;
              emit(start, i, String.fromCharCode(code));
              pendingSkip = st.skip || st.fontTbl ? 0 : st.uc;
            }
            break;
          default:
            if (SEP_WORDS[word] !== undefined) {
              if (!st.skip && !st.fontTbl) items.push({ sep: SEP_WORDS[word] });
            } else if (CHAR_WORDS[word] !== undefined) {
              emit(start, i, CHAR_WORDS[word]);
            }
        }
        continue;
      }
      // Belgi buyruqlari
      if (nc === 42 /* * */) {
        if (st.fresh) st.skip = true; // {\* ...} — noma'lum destination
        i += 2;
        continue;
      }
      if (nc === 39 /* ' */) {
        const hex = s.slice(i + 2, i + 4);
        i += 4;
        st.fresh = false;
        if (pendingSkip > 0) {
          absorb(i);
          continue;
        }
        emit(start, i, decodeByte(parseInt(hex, 16), cpNow()));
        continue;
      }
      i += 2;
      st.fresh = false;
      if (pendingSkip > 0) {
        absorb(i);
        continue;
      }
      if (nc === 92 || nc === 123 || nc === 125) emit(start, i, String.fromCharCode(nc));
      else if (nc === 126 /* ~ */) emit(start, i, ' ');
      else if (nc === 95 /* _ */) emit(start, i, '-');
      else if (nc === 10 || nc === 13) { if (!st.skip) items.push({ sep: '\n' }); }
      continue;
    }
    // Oddiy belgi
    st.fresh = false;
    i++;
    if (pendingSkip > 0) {
      absorb(i);
      continue;
    }
    emit(i - 1, i, s[i - 1]);
  }
  return items;
};

/** Bitta belgini RTF ko'rinishiga keltiradi. */
const encodeChar = (ch: string, uc: number): string => {
  const c = ch.charCodeAt(0);
  if (ch === '\\' || ch === '{' || ch === '}') return '\\' + ch;
  if (c >= 0x20 && c < 0x7f) return ch;
  const signed = c > 32767 ? c - 65536 : c;
  return uc > 0 ? `\\u${signed}${'?'.repeat(uc)}` : `\\u${signed} `;
};

export const convertRtfBytes = (
  data: Uint8Array,
  opts: ConvertOptions
): { data: Uint8Array; changed: boolean; stats: ConvertStats; text: string } => {
  const src = bytesToString(data);
  if (!src.startsWith('{\\rtf')) throw new Error('Fayl haqiqiy RTF hujjati emas.');
  const items = parseRtf(src);

  // Paragraflar bo'yicha guruhlash
  const paras: VChar[][] = [];
  let cur: VChar[] = [];
  let full = '';
  for (const it of items) {
    if ('sep' in it) {
      if (it.sep === '\n') {
        if (cur.length) paras.push(cur);
        cur = [];
      } else cur.push({ start: -1, end: -1, ch: it.sep, uc: 1 });
      full += it.sep;
    } else {
      cur.push(it);
      full += it.ch;
    }
  }
  if (cur.length) paras.push(cur);

  const docContext = computeContext(full.slice(0, 300_000));
  let stats = emptyStats();
  const reps: { start: number; end: number; value: string }[] = [];
  for (const p of paras) {
    const r = convertSegments(p.map((v) => v.ch), opts, docContext);
    stats = addStats(stats, r.stats);
    p.forEach((v, idx) => {
      if (v.start < 0) return;
      const o = r.segments[idx];
      if (o !== v.ch) reps.push({ start: v.start, end: v.end, value: [...o].map((ch) => encodeChar(ch, v.uc)).join('') });
    });
  }
  if (!reps.length) return { data, changed: false, stats, text: full };
  reps.sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  let pos = 0;
  for (const r of reps) {
    parts.push(src.slice(pos, r.start), r.value);
    pos = r.end;
  }
  parts.push(src.slice(pos));
  return { data: stringToBytes(parts.join('')), changed: true, stats, text: full };
};

/** Ko'rish uchun: RTF ning ko'rinadigan matni paragraflar bo'yicha. */
export const rtfParagraphs = (data: Uint8Array): string[] => {
  const items = parseRtf(bytesToString(data));
  const out: string[] = [];
  let cur = '';
  for (const it of items) {
    if ('sep' in it && it.sep === '\n') {
      out.push(cur.trim());
      cur = '';
    } else cur += 'sep' in it ? it.sep : it.ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((t, i, arr) => t || (i > 0 && arr[i - 1]));
};
