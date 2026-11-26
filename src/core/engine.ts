/**
 * Transliteratsiya yadrosi (v2).
 *
 * Asosiy tamoyillar:
 *  1. Natija yozuvi (target) hal qiluvchi. Manba (source) faqat "maslahat":
 *     matndagi har bir soʻz oʻz yozuvi boʻyicha alohida aniqlanadi. Shuning uchun
 *     aralash (kirill + lotin) matnlar va notoʻgʻri tanlangan manba ham toʻgʻri oʻgiriladi.
 *  2. Har bir manba belgisi uchun alohida natija boʻlagi hisoblanadi (char-level alignment).
 *     Bu Word hujjatlarida bitta soʻz bir nechta "run"ga boʻlinib ketgan holatda ham
 *     formatlashni (qalin, rang, shrift) aynan oʻz joyida saqlab qolish imkonini beradi.
 *  3. URL, e-pochta, domen va (Markdown rejimida) kod boʻlaklari hech qachon oʻzgartirilmaydi.
 *  4. Natija yozuvidagi soʻzlar umuman oʻzgartirilmaydi (idempotent).
 */

import { S_H_EXCEPTIONS, SOFT_SIGN_REMOVAL, TS_TO_S_WORDS } from './exceptions';

export type Script = 'cyrillic' | 'old_latin' | 'new_latin';
export type SourceHint = 'auto' | Script;

export interface ConvertOptions {
  /** Manba yozuvi (maslahat). 'auto' — avtomatik. */
  from?: SourceHint;
  /** Natija yozuvi. */
  to: Script;
  /** Markdown sintaksisini (kod, havola manzillari, HTML teglar) himoyalash. */
  markdown?: boolean;
  /**
   * Faqat koʻrish (preview) uchun: berilsa, oʻzgargan har bir soʻz natijada
   * koʻrinmas belgilar bilan oʻraladi, asl soʻz esa shu massivga qoʻshiladi.
   * Belgilarni `MARK` va `decodeMarkIndex` yordamida ajratib olinadi.
   */
  markSink?: string[];
}

/** Preview belgilari (Unicode Private Use Area — hujjatlarda uchramaydi). */
export const MARK = {
  START: '\uE000',
  SEP: '\uE001',
  END: '\uE002',
  DIGIT0: 0xe010,
} as const;

const encodeMarkIndex = (n: number) =>
  String(n)
    .split('')
    .map((d) => String.fromCharCode(MARK.DIGIT0 + Number(d)))
    .join('');

export interface ConvertStats {
  /** Jami soʻzlar */
  words: number;
  /** Oʻzgargan soʻzlar */
  changed: number;
  cyrillicWords: number;
  oldLatinWords: number;
  newLatinWords: number;
  /** Oʻzgarish juftliklari: "asl\u0000yangi" -> necha marta */
  pairs: Record<string, number>;
  /** Turli juftliklar soni */
  pairsSize: number;
  /** Juftliklar soni chegaradan oshib ketdi (roʻyxat toʻliq emas) */
  pairsTruncated: boolean;
}

/** Natija matnidagi oʻzgargan soʻz oʻrni */
export interface ChangeSpan {
  start: number;
  end: number;
  original: string;
}

export interface ChangePair {
  from: string;
  to: string;
  count: number;
}

const MAX_PAIRS = 5000;
const PAIR_SEP = '\u0000';

const recordPair = (stats: ConvertStats, from: string, to: string, n = 1) => {
  const key = from + PAIR_SEP + to;
  if (key in stats.pairs) stats.pairs[key] += n;
  else if (stats.pairsSize < MAX_PAIRS) {
    stats.pairs[key] = n;
    stats.pairsSize++;
  } else stats.pairsTruncated = true;
};

/** Juftliklarni koʻp uchraganidan boshlab saralangan roʻyxatga aylantiradi. */
export const listPairs = (stats: ConvertStats): ChangePair[] =>
  Object.entries(stats.pairs)
    .map(([k, count]) => {
      const i = k.indexOf(PAIR_SEP);
      return { from: k.slice(0, i), to: k.slice(i + 1), count };
    })
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));

// ---------------------------------------------------------------------------
// Belgilar sinflari
// ---------------------------------------------------------------------------

const APOS = new Set(["'", '`', '´', 'ʹ', 'ʻ', 'ʼ', 'ʽ', '‘', '’', '′']);
const isApos = (ch: string) => APOS.has(ch);

const isCyr = (ch: string) => {
  const c = ch.charCodeAt(0);
  return c >= 0x0400 && c <= 0x04ff;
};

const LATIN_RE = /^[A-Za-zÀ-ɏ]$/;
const isLatin = (ch: string) => LATIN_RE.test(ch);
const LETTER_RE = /^\p{L}$/u;
const isLetter = (ch: string) => LETTER_RE.test(ch);
const isUpper = (ch: string) => ch !== ch.toLowerCase() && ch === ch.toUpperCase();
const isLower = (ch: string) => ch !== ch.toUpperCase() && ch === ch.toLowerCase();

// Koʻrinishi bir xil (homoglif) harflar: kirill <-> lotin
const LAT_TO_CYR_HOMO: Record<string, string> = {
  a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', y: 'у', x: 'х',
  A: 'А', B: 'В', E: 'Е', K: 'К', M: 'М', H: 'Н', O: 'О', P: 'Р', C: 'С', T: 'Т', X: 'Х',
};
const CYR_TO_LAT_HOMO: Record<string, string> = {};
for (const [l, c] of Object.entries(LAT_TO_CYR_HOMO)) CYR_TO_LAT_HOMO[c] = l;

const NEW_LATIN_CHARS = new Set(['ö', 'ğ', 'ş', 'ç', 'Ö', 'Ğ', 'Ş', 'Ç']);

// ---------------------------------------------------------------------------
// Himoyalangan boʻlaklar (URL, e-pochta, domen, Markdown kodi)
// ---------------------------------------------------------------------------

const ALWAYS_PROTECTED: RegExp[] = [
  /\b(?:https?|ftp|file):\/\/[^\s<>"'`)\]]+/gi,
  /\bwww\.[^\s<>"'`)\]]+/gi,
  /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g,
  /\b[\w-]+(?:\.[\w-]+)*\.(?:uz|ru|com|org|net|gov|edu|io|info|me|tj|kz|kg|tm)\b(?:\/[^\s<>"'`)\]]*)?/gi,
];

const MARKDOWN_PROTECTED: RegExp[] = [
  /^(```|~~~)[^\n]*\n[\s\S]*?(?:\n\1[ \t]*(?=\n|(?![\s\S]))|(?![\s\S]))/gm, // fenced code
  /`[^`\n]+`/g, // inline code
  /\]\([^)\n]*\)/g, // [matn](manzil)
  /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*\S+.*$/gm, // [id]: manzil
  /<\/?[A-Za-z][^>\n]*>/g, // HTML teglar
  /<[a-z]+:[^>\s]+>/gi, // <https://...>
];

const buildProtectMask = (text: string, markdown: boolean): Uint8Array | null => {
  let mask: Uint8Array | null = null;
  const apply = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      if (!mask) mask = new Uint8Array(text.length);
      mask.fill(1, m.index, m.index + m[0].length);
    }
  };
  // Tezkor tekshiruv: matnda nuqta yoki @ boʻlmasa URL ham yoʻq
  if (/[.@:]/.test(text)) ALWAYS_PROTECTED.forEach(apply);
  if (markdown && /[`\]<]/.test(text)) MARKDOWN_PROTECTED.forEach(apply);
  return mask;
};

// ---------------------------------------------------------------------------
// Soʻzlarga ajratish
// ---------------------------------------------------------------------------

interface Token {
  start: number;
  end: number; // exclusive
}

const tokenize = (text: string, mask: Uint8Array | null): Token[] => {
  const tokens: Token[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    if ((mask && mask[i]) || !isLetter(text[i])) {
      i++;
      continue;
    }
    const start = i;
    i++;
    while (i < n && !(mask && mask[i])) {
      const ch = text[i];
      if (isLetter(ch)) {
        i++;
        continue;
      }
      if (isApos(ch)) {
        const prev = text[i - 1];
        const next = i + 1 < n && !(mask && mask[i + 1]) ? text[i + 1] : '';
        // Soʻz ichidagi tutuq belgisi yoki oʻ/gʻ (soʻz oxirida ham: "bogʻ")
        if ((next && isLetter(next)) || /[oOgG]/.test(prev)) {
          i++;
          continue;
        }
      }
      break;
    }
    tokens.push({ start, end: i });
  }
  return tokens;
};

type TokenScript = 'cyrillic' | 'latin' | 'other';

interface TokenInfo {
  script: TokenScript;
  /** Homoglif harflari tuzatilgan soʻz */
  normalized: string;
}

const classifyToken = (word: string, contextIsCyr: boolean): TokenInfo => {
  let cyr = 0;
  let lat = 0;
  let cyrUnique = 0;
  let latUnique = 0;
  for (const ch of word) {
    if (isCyr(ch)) {
      cyr++;
      if (!CYR_TO_LAT_HOMO[ch]) cyrUnique++;
    } else if (isLatin(ch)) {
      lat++;
      if (!LAT_TO_CYR_HOMO[ch]) latUnique++;
    }
  }
  if (cyr === 0 && lat === 0) return { script: 'other', normalized: word };
  if (cyr === 0) return { script: 'latin', normalized: word };
  if (lat === 0) return { script: 'cyrillic', normalized: word };

  // Aralash soʻz (masalan, kirill soʻz ichida lotincha "o" yoki "c")
  let script: TokenScript;
  if (cyrUnique !== latUnique) script = cyrUnique > latUnique ? 'cyrillic' : 'latin';
  else if (cyr !== lat) script = cyr > lat ? 'cyrillic' : 'latin';
  else script = contextIsCyr ? 'cyrillic' : 'latin';

  const map = script === 'cyrillic' ? LAT_TO_CYR_HOMO : CYR_TO_LAT_HOMO;
  let normalized = '';
  for (const ch of word) normalized += map[ch] ?? ch;
  return { script, normalized };
};

// ---------------------------------------------------------------------------
// Yordamchi: registrni saqlash
// ---------------------------------------------------------------------------

const matchCase = (source: string, replacement: string): string => {
  const letters = [...source].filter(isLetter);
  if (letters.length > 1 && letters.every((c) => !isLower(c))) return replacement.toUpperCase();
  if (letters.length > 0 && isUpper(letters[0])) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
};

/** Butun soʻz uchun natija: birinchi belgiga hammasi, qolganlarga boʻsh. */
const wholeWord = (word: string, out: string): string[] => {
  const res = new Array<string>(word.length).fill('');
  res[0] = out;
  return res;
};

/** Ikki bosqichli oʻgirishni belgilar darajasida birlashtirish. */
const compose = (first: string[], second: (s: string) => string[]): string[] => {
  const mid = first.join('');
  const midOut = second(mid);
  const res: string[] = [];
  let pos = 0;
  for (const piece of first) {
    let acc = '';
    for (let k = 0; k < piece.length; k++) acc += midOut[pos + k];
    pos += piece.length;
    res.push(acc);
  }
  return res;
};

const isWordUpper = (word: string) => {
  const letters = [...word].filter(isLetter);
  return letters.length > 1 && letters.every((c) => !isLower(c));
};

// ---------------------------------------------------------------------------
// 1) Kirill -> Yangi lotin
// ---------------------------------------------------------------------------

const CYR_VOWELS = new Set(['а', 'е', 'ё', 'и', 'о', 'у', 'э', 'ю', 'я', 'ў', 'ы']);

const CYR_SIMPLE: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
  л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'x', э: 'e', қ: 'q', ҳ: 'h', ы: 'i', ў: 'ö', ғ: 'ğ', ш: 'ş', щ: 'ş', ч: 'ç',
  // Boshqa kirill tillaridagi harflar
  і: 'i', ї: 'yi', є: 'ye', ґ: 'g', ң: 'ng', ү: 'ü', ө: 'ö', ә: 'ä', җ: 'j', һ: 'h',
};

const CYR_PREFIX_EXCEPTIONS: [string, string][] = [
  ['сентябр', 'sentabr'],
  ['октябр', 'oktabr'],
];

const cyrToNewWord = (word: string): string[] => {
  const lower = word.toLowerCase();
  const exc = SOFT_SIGN_REMOVAL[lower];
  if (exc) return wholeWord(word, matchCase(word, exc));

  const upperWord = isWordUpper(word);
  const out = new Array<string>(word.length).fill('');
  let i = 0;

  for (const [prefix, latin] of CYR_PREFIX_EXCEPTIONS) {
    if (lower.startsWith(prefix)) {
      out[0] = matchCase(word.slice(0, prefix.length), latin);
      i = prefix.length;
      break;
    }
  }

  const forceS = TS_TO_S_WORDS.has(lower);

  for (; i < word.length; i++) {
    const ch = word[i];
    const lc = ch.toLowerCase();
    const up = isUpper(ch);
    const prev = i > 0 ? word[i - 1].toLowerCase() : '';
    const next = i + 1 < word.length ? word[i + 1].toLowerCase() : '';
    const multi = (s: string) => (up ? (upperWord ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1)) : s);

    switch (lc) {
      case 'е': {
        const ye = i === 0 || CYR_VOWELS.has(prev) || prev === 'ъ' || prev === 'ь';
        out[i] = ye ? multi('ye') : up ? 'E' : 'e';
        break;
      }
      case 'ё':
        out[i] = multi('yo');
        break;
      case 'ю':
        out[i] = multi('yu');
        break;
      case 'я':
        out[i] = multi('ya');
        break;
      case 'ц': {
        const afterVowel = i > 0 && CYR_VOWELS.has(prev);
        out[i] = afterVowel && !forceS ? multi('ts') : up ? 'S' : 's';
        break;
      }
      case 'ъ':
        // объект -> obyekt, маъно -> maʼno
        out[i] = next === 'е' || next === 'ё' || next === 'ю' || next === 'я' ? '' : 'ʼ';
        break;
      case 'ь':
        out[i] = '';
        break;
      default: {
        const m = CYR_SIMPLE[lc];
        if (m === undefined) out[i] = ch;
        else out[i] = up ? multi(m) : m;
      }
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// 2) Eski lotin -> Yangi lotin
// ---------------------------------------------------------------------------

const S_H_LOWER: Record<string, string> = {};
for (const [k, v] of Object.entries(S_H_EXCEPTIONS)) {
  // Barcha apostrof turlarini yagona koʻrinishga keltirib saqlaymiz
  S_H_LOWER[k.toLowerCase().replace(/[ʻ‘'`’ʹʼ]/g, "'")] = v;
}

/**
 * @param keepDigraphs true boʻlsa "sh"/"ch" oʻzgarmaydi (soʻz yangi lotinda deb topilgan).
 */
const oldToNewWord = (word: string, keepDigraphs: boolean): string[] => {
  const key = word.toLowerCase().replace(/[ʻ‘'`’ʹʼ´′ʽ]/g, "'");
  const exc = S_H_LOWER[key];
  if (exc) return wholeWord(word, matchCase(word, exc));

  const out = new Array<string>(word.length).fill('');
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const next = i + 1 < word.length ? word[i + 1] : '';
    const lc = ch.toLowerCase();

    if ((lc === 'o' || lc === 'g') && next && isApos(next)) {
      const base = lc === 'o' ? 'ö' : 'ğ';
      out[i] = isUpper(ch) ? base.toUpperCase() : base;
      out[i + 1] = '';
      i++;
      continue;
    }
    if (!keepDigraphs && (lc === 's' || lc === 'c') && (next === 'h' || next === 'H')) {
      const base = lc === 's' ? 'ş' : 'ç';
      // "SHahar" kabi gʻalati holatlarda ham birinchi harf registri hal qiladi
      out[i] = isUpper(ch) ? base.toUpperCase() : base;
      out[i + 1] = '';
      i++;
      continue;
    }
    if (isApos(ch)) {
      // Soʻz ichidagi tutuq belgisi -> ʼ (U+02BC)
      out[i] = i > 0 && i + 1 < word.length ? 'ʼ' : ch;
      continue;
    }
    out[i] = ch;
  }
  return out;
};

// ---------------------------------------------------------------------------
// 3) Yangi lotin -> Eski lotin
// ---------------------------------------------------------------------------

const newToOldWord = (word: string): string[] => {
  const out = new Array<string>(word.length);
  const upperWord = isWordUpper(word);
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const next = i + 1 < word.length ? word[i + 1] : '';
    switch (ch) {
      case 'Ö':
        out[i] = 'Oʻ';
        break;
      case 'ö':
        out[i] = 'oʻ';
        break;
      case 'Ğ':
        out[i] = 'Gʻ';
        break;
      case 'ğ':
        out[i] = 'gʻ';
        break;
      case 'Ş':
      case 'Ç': {
        const b = ch === 'Ş' ? 'S' : 'C';
        out[i] = upperWord || (next && isUpper(next)) ? `${b}H` : `${b}h`;
        break;
      }
      case 'ş':
        out[i] = 'sh';
        break;
      case 'ç':
        out[i] = 'ch';
        break;
      case 's':
      case 'S':
        // Yangi lotindagi alohida s+h eski lotinda sʼh deb yoziladi (Isʼhoq)
        out[i] = next === 'h' || next === 'H' ? `${ch}ʼ` : ch;
        break;
      default:
        out[i] = ch;
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// 4) Yangi lotin -> Kirill
// ---------------------------------------------------------------------------

const LAT_SIMPLE: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л',
  m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в',
  x: 'х', y: 'й', z: 'з', ö: 'ў', ğ: 'ғ', ş: 'ш', ç: 'ч',
};
const LAT_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'ö']);

// Soʻz oxirida ь tushib qolgan oylar va boshqa soʻzlar (teskari lugʻat)
const LAT_TO_CYR_WORDS: Record<string, string> = {};
for (const [cyr, lat] of Object.entries(SOFT_SIGN_REMOVAL)) LAT_TO_CYR_WORDS[lat] = cyr;
Object.assign(LAT_TO_CYR_WORDS, {
  sentabr: 'сентябрь',
  oktabr: 'октябрь',
  mart: 'март',
  may: 'май',
  avgust: 'август',
});
const LAT_TO_CYR_PREFIX: [string, string][] = [
  ['sentabr', 'сентябр'],
  ['oktabr', 'октябр'],
  ['yanvar', 'январ'],
  ['fevral', 'феврал'],
];

// "ts" faqat ruscha oʻzlashma qoʻshimchalarda ц boʻladi (ketsa, aytsa — тс qoladi)
const TS_AS_TSE = /^ts(?:iya|iy|ey|ent|ert|entr|ex|ikl|irk|itr|ifr|ist)/i;

const newToCyrWord = (word: string): string[] => {
  const lower = word.toLowerCase();
  const dict = LAT_TO_CYR_WORDS[lower];
  if (dict) return wholeWord(word, matchCase(word, dict));

  const out = new Array<string>(word.length).fill('');
  let i = 0;
  for (const [prefix, cyr] of LAT_TO_CYR_PREFIX) {
    if (lower.startsWith(prefix) && lower.length > prefix.length) {
      out[0] = matchCase(word.slice(0, prefix.length), cyr);
      i = prefix.length;
      break;
    }
  }

  const put = (k: string, srcCh: string) => (isUpper(srcCh) ? k.toUpperCase() : k);

  for (; i < word.length; i++) {
    const ch = word[i];
    const lc = ch.toLowerCase();
    const next = i + 1 < word.length ? word[i + 1].toLowerCase() : '';
    const prev = i > 0 ? word[i - 1].toLowerCase() : '';
    const atStart = i === 0;
    const afterVowel = LAT_VOWELS.has(prev);

    if (lc === 'y' && (next === 'e' || next === 'o' || next === 'u' || next === 'a')) {
      const map: Record<string, string> = { e: 'е', o: 'ё', u: 'ю', a: 'я' };
      let k = map[next];
      // obyekt -> объект (undoshdan keyin ye)
      if (next === 'e' && !atStart && !afterVowel && !isApos(word[i - 1]) && isLetter(prev)) k = 'ъ' + k;
      out[i] = isUpper(ch) ? k.toUpperCase() : k;
      out[i + 1] = '';
      i++;
      continue;
    }
    if (lc === 't' && next === 's' && TS_AS_TSE.test(lower.slice(i))) {
      out[i] = put('ц', ch);
      out[i + 1] = '';
      i++;
      continue;
    }
    if (lc === 'e') {
      out[i] = put(atStart || afterVowel ? 'э' : 'е', ch);
      continue;
    }
    if (isApos(ch)) {
      // Isʼhoq -> Исҳоқ (sʼh ajratuvchisi kirillda kerak emas)
      if (prev === 's' && next === 'h') out[i] = '';
      else out[i] = i > 0 && i + 1 < word.length ? 'ъ' : ch;
      continue;
    }
    const m = LAT_SIMPLE[lc];
    out[i] = m === undefined ? ch : put(m, ch);
  }
  return out;
};

// ---------------------------------------------------------------------------
// Matn darajasidagi kontekst (paragraf yozuvi)
// ---------------------------------------------------------------------------

export interface Context {
  cyrWords: number;
  latWords: number;
  /** Paragrafdagi lotin yangi alifboda (ö ğ ş ç bor, oʻ/gʻ yoʻq) */
  latinIsNew: boolean;
}

const OLD_APOS_RE = /[oOgG][ʻ‘'`’ʹʼ´]/g;
const NEW_RE = /[öğşçÖĞŞÇ]/g;

const buildContext = (text: string, tokens: Token[]): Context => {
  let cyrWords = 0;
  let latWords = 0;
  for (const t of tokens) {
    const c = text.charCodeAt(t.start);
    if (c >= 0x0400 && c <= 0x04ff) cyrWords++;
    else if (isLatin(text[t.start])) latWords++;
  }
  const newCount = (text.match(NEW_RE) || []).length;
  const oldCount = (text.match(OLD_APOS_RE) || []).length;
  // Belgilar boʻlmasa "sh"/"ch" eski lotin harf birikmasi deb qabul qilinadi:
  // haqiqiy yangi lotin matnida ş/ç deyarli har paragrafda uchraydi.
  const latinIsNew = newCount > 0 && newCount >= oldCount * 2;
  return { cyrWords, latWords, latinIsNew };
};

// ---------------------------------------------------------------------------
// Asosiy API
// ---------------------------------------------------------------------------

const ROMAN_RE = /^[IVXLCDM]+$/;
// Oʻzbek lotin alifbosida yoʻq harflar (w, ch dan tashqari c) — xorijiy nom: Microsoft, Word, Excel
const FOREIGN_LATIN_RE = /[wW]|[cC](?![hH])/;

interface PerCharResult {
  out: string[];
  stats: ConvertStats;
  /** Manba matnidagi oʻzgargan soʻzlar [start, end) */
  changed: [number, number][];
}

/** Butun hujjat uchun kontekst (qisqa paragraflar — jadval kataklari uchun). */
export const computeContext = (text: string): Context => buildContext(text, tokenize(text, null));

const convertPerChar = (text: string, opts: ConvertOptions, docContext?: Context, trackPairs = true): PerCharResult => {
  const from = opts.from ?? 'auto';
  const to = opts.to;
  const out: string[] = new Array(text.length);
  for (let k = 0; k < text.length; k++) out[k] = text[k];
  const stats = emptyStats();
  const changedTokens: [number, number][] = [];
  if (!text) return { out, stats, changed: changedTokens };

  const mask = buildProtectMask(text, !!opts.markdown);
  const tokens = tokenize(text, mask);
  const ctx = buildContext(text, tokens);
  // Qisqa paragraflarda (jadval katagi, sarlavha) yozuv ustunligini hujjat boʻyicha aniqlaymiz
  const scriptCtx = docContext && ctx.cyrWords + ctx.latWords < 4 ? docContext : ctx;
  const contextIsCyr =
    scriptCtx.cyrWords > scriptCtx.latWords || (scriptCtx.cyrWords === scriptCtx.latWords && from === 'cyrillic');

  for (const t of tokens) {
    const word = text.slice(t.start, t.end);
    const info = classifyToken(word, contextIsCyr);
    if (info.script === 'other') continue;
    stats.words++;

    let res: string[] | null = null;
    const w = info.normalized;

    if (info.script === 'cyrillic') {
      stats.cyrillicWords++;
      if (to === 'new_latin') res = cyrToNewWord(w);
      else if (to === 'old_latin') res = compose(cyrToNewWord(w), newToOldWord);
      // to === 'cyrillic': oʻzgarmaydi
    } else {
      const hasNew = [...w].some((c) => NEW_LATIN_CHARS.has(c));
      OLD_APOS_RE.lastIndex = 0;
      const hasOldApos = OLD_APOS_RE.test(w);
      const isNewWord = hasNew || (ctx.latinIsNew && !hasOldApos);
      const hasDigraph = /[sScC][hH]/.test(w);
      if (isNewWord) stats.newLatinWords++;
      else if (hasOldApos || hasDigraph) stats.oldLatinWords++;
      else if (ctx.latinIsNew) stats.newLatinWords++;
      else stats.oldLatinWords++;

      if (to === 'new_latin') {
        res = oldToNewWord(w, isNewWord);
      } else if (to === 'old_latin') {
        if (isNewWord) res = newToOldWord(w);
      } else {
        // Kirillcha paragraf ichidagi lotincha soʻzlar (nomlar, qisqartmalar) va
        // rim raqamlari oʻz holicha qoldiriladi
        const foreignInCyr = scriptCtx.cyrWords > scriptCtx.latWords;
        if (!foreignInCyr && !ROMAN_RE.test(w) && !FOREIGN_LATIN_RE.test(w)) {
          res = compose(oldToNewWord(w, isNewWord), newToCyrWord);
        }
      }
    }

    if (res) {
      let changed = false;
      for (let k = 0; k < res.length; k++) {
        if (res[k] !== word[k]) changed = true;
        out[t.start + k] = res[k];
      }
      if (changed) {
        stats.changed++;
        changedTokens.push([t.start, t.end]);
        if (trackPairs) recordPair(stats, word, res.join(''));
        if (opts.markSink) {
          out[t.start] = MARK.START + encodeMarkIndex(opts.markSink.length) + MARK.SEP + out[t.start];
          out[t.end - 1] = out[t.end - 1] + MARK.END;
          opts.markSink.push(word);
        }
      }
    }
  }

  return { out, stats, changed: changedTokens };
};

/** Matnni oʻgiradi. */
export function convertText(text: string, opts: ConvertOptions): string {
  if (!text) return '';
  return convertPerChar(text, opts).out.join('');
}

/** Matnni oʻgiradi va statistikani qaytaradi. */
export function convertTextWithStats(text: string, opts: ConvertOptions): { text: string; stats: ConvertStats } {
  const { out, stats } = convertPerChar(text, opts);
  return { text: out.join(''), stats };
}

/** Matnni oʻgiradi; natijadagi oʻzgargan soʻzlar oʻrnini ham qaytaradi (belgilash uchun). */
export function convertTextDetailed(
  text: string,
  opts: ConvertOptions
): { text: string; stats: ConvertStats; spans: ChangeSpan[] } {
  const { out, stats, changed } = convertPerChar(text, opts);
  const spans: ChangeSpan[] = [];
  let outPos = 0;
  let srcPos = 0;
  for (const [s, e] of changed) {
    for (; srcPos < s; srcPos++) outPos += out[srcPos].length;
    const start = outPos;
    for (; srcPos < e; srcPos++) outPos += out[srcPos].length;
    spans.push({ start, end: outPos, original: text.slice(s, e) });
  }
  return { text: out.join(''), stats, spans };
}

/**
 * Bir paragrafni tashkil etuvchi boʻlaklarni (masalan, Word "run"lari) birgalikda oʻgiradi.
 * Soʻz boʻlaklar chegarasidan oʻtsa ham toʻgʻri oʻgiriladi, har bir natija boʻlagi
 * aynan oʻz boʻlagiga qaytariladi — formatlash siljimaydi.
 */
export function convertSegments(
  segments: string[],
  opts: ConvertOptions,
  docContext?: Context
): { segments: string[]; stats: ConvertStats } {
  const joined = segments.join('');
  const { out, stats } = convertPerChar(joined, opts, docContext);
  const result: string[] = [];
  let pos = 0;
  for (const seg of segments) {
    let s = '';
    for (let k = 0; k < seg.length; k++) s += out[pos + k];
    pos += seg.length;
    result.push(s);
  }
  return { segments: result, stats };
}

export function emptyStats(): ConvertStats {
  return { words: 0, changed: 0, cyrillicWords: 0, oldLatinWords: 0, newLatinWords: 0, pairs: {}, pairsSize: 0, pairsTruncated: false };
}

/** `b` ni `a` ga qoʻshadi (a oʻzgaradi — katta arxivlarda tez ishlashi uchun) va `a` ni qaytaradi. */
export const addStats = (a: ConvertStats, b: ConvertStats): ConvertStats => {
  a.words += b.words;
  a.changed += b.changed;
  a.cyrillicWords += b.cyrillicWords;
  a.oldLatinWords += b.oldLatinWords;
  a.newLatinWords += b.newLatinWords;
  a.pairsTruncated ||= b.pairsTruncated;
  for (const [k, n] of Object.entries(b.pairs)) {
    if (k in a.pairs) a.pairs[k] += n;
    else if (a.pairsSize < MAX_PAIRS) {
      a.pairs[k] = n;
      a.pairsSize++;
    } else a.pairsTruncated = true;
  }
  return a;
};

// ---------------------------------------------------------------------------
// Yozuvni aniqlash (UI uchun)
// ---------------------------------------------------------------------------

export interface DetectionResult {
  /** Ustun yozuv; matn boʻsh boʻlsa null */
  dominant: Script | null;
  /** Matnda bir nechta yozuv aralash */
  mixed: boolean;
  /** Foizlar (0..100) */
  shares: Record<Script, number>;
  words: number;
}

export function detectScripts(text: string): DetectionResult {
  const sample = text.length > 200_000 ? text.slice(0, 200_000) : text;
  const { stats } = convertPerChar(sample, { from: 'auto', to: 'new_latin' }, undefined, false);
  const total = stats.cyrillicWords + stats.oldLatinWords + stats.newLatinWords;
  const shares: Record<Script, number> = { cyrillic: 0, old_latin: 0, new_latin: 0 };
  if (total === 0) return { dominant: null, mixed: false, shares, words: 0 };
  shares.cyrillic = Math.round((stats.cyrillicWords / total) * 100);
  shares.old_latin = Math.round((stats.oldLatinWords / total) * 100);
  shares.new_latin = Math.round((stats.newLatinWords / total) * 100);
  const entries = (Object.entries(shares) as [Script, number][]).sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];
  // Ikkinchi yozuv kamida 5% va 2 soʻzdan koʻp boʻlsa — aralash
  const secondWords =
    entries[1][0] === 'cyrillic'
      ? stats.cyrillicWords
      : entries[1][0] === 'old_latin'
        ? stats.oldLatinWords
        : stats.newLatinWords;
  const mixed = entries[1][1] >= 5 && secondWords >= 2;
  return { dominant, mixed, shares, words: total };
}

export const SCRIPT_LABELS: Record<Script, string> = {
  cyrillic: 'Kirill',
  old_latin: 'Eski lotin',
  new_latin: 'Yangi lotin',
};
