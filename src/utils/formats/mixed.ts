/**
 * "Aralash tarkibli" belgilash tillari (ODF XML, HTML) uchun jarrohlik usulidagi o'girish.
 *
 * OOXML dan farqli, bu formatlarda matn alohida <w:t> teglarida emas, to'g'ridan-to'g'ri
 * teglar orasida turadi: <text:p>Salom <text:span>dunyo</text:span></text:p>.
 * Modul faqat matn tugunlarini almashtiradi; teglar, atributlar, izohlar va boshqa
 * barcha baytlar aynan o'z holicha qoladi. Paragraf ichidagi inline teglar so'zni
 * bo'lmaydi, shuning uchun "<b>O</b>'zbek" kabi holatlar ham to'g'ri o'giriladi.
 */
import { convertSegments, computeContext, emptyStats, addStats, ConvertOptions, ConvertStats } from '../../core/engine';

export interface MixedConfig {
  /** Paragraf (kontekst birligi) teglari */
  isPara: (name: string) => boolean;
  /** Ajratuvchi teglar → matndagi ekvivalenti (masalan, <br> → "\n") */
  sep: (name: string) => string | undefined;
  /** Butun ichi o'girilmaydigan teglar (script, style, o'chirilgan tahrirlar...) */
  isSkip: (name: string) => boolean;
  /** Yopilmaydigan (void) teglar — HTML uchun */
  isVoid?: (name: string) => boolean;
  /** HTML: teg nomlari katta-kichik harfga sezgir emas */
  lowerCase?: boolean;
  /** Paragraf tashqarisidagi matn ham o'giriladimi (HTML: ha) */
  rootIsPara?: boolean;
  /** Nomli belgilar (entity) jadvali */
  entities?: Record<string, string>;
}

interface Seg {
  start: number;
  end: number;
  text: string;
}
type Part = Seg | { sep: string };

const TOKEN_RE = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![^>]*>|<(\/?)([A-Za-z_][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+/g;
const ENT_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g;

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Matn tugunini segmentlarga bo'ladi: oddiy matn va har bir belgi (entity) alohida. */
const splitText = (raw: string, offset: number, entities: Record<string, string>): Seg[] => {
  if (raw.indexOf('&') === -1) return [{ start: offset, end: offset + raw.length, text: raw }];
  const out: Seg[] = [];
  let pos = 0;
  ENT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ENT_RE.exec(raw)) !== null) {
    const name = m[1];
    let ch: string | undefined;
    if (name[0] === '#') {
      const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      ch = Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : undefined;
    } else ch = entities[name];
    if (ch === undefined) continue; // noma'lum belgi — oddiy matn sifatida qoladi
    if (m.index > pos) out.push({ start: offset + pos, end: offset + m.index, text: raw.slice(pos, m.index) });
    out.push({ start: offset + m.index, end: offset + m.index + m[0].length, text: ch });
    pos = m.index + m[0].length;
  }
  if (pos < raw.length) out.push({ start: offset + pos, end: offset + raw.length, text: raw.slice(pos) });
  return out;
};

/** Hujjatdagi paragraflarni (segmentlar ro'yxati) topadi. */
export const scanMixed = (src: string, cfg: MixedConfig): Part[][] => {
  const entities = cfg.entities ?? XML_ENTITIES;
  const paras: Part[][] = [];
  const stack: { name: string; parts: Part[] }[] = [];
  const skip: string[] = [];
  const root: Part[] = [];
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(src)) !== null) {
    const tok = m[0];
    if (tok[0] !== '<') {
      if (skip.length) continue;
      const target = stack.length ? stack[stack.length - 1].parts : cfg.rootIsPara ? root : null;
      if (target) target.push(...splitText(tok, m.index, entities));
      continue;
    }
    if (m[2] === undefined) continue; // izoh, CDATA, deklaratsiya
    const closing = m[1] === '/';
    let name = m[2];
    if (cfg.lowerCase) name = name.toLowerCase();
    const selfClosing = /\/\s*$/.test(m[3]) || (cfg.isVoid?.(name) ?? false);

    if (skip.length) {
      if (closing && name === skip[skip.length - 1]) skip.pop();
      else if (!closing && !selfClosing && name === skip[skip.length - 1]) skip.push(name);
      continue;
    }
    if (cfg.isSkip(name)) {
      if (!closing && !selfClosing) skip.push(name);
      continue;
    }
    const sep = cfg.sep(name);
    if (sep !== undefined) {
      const target = stack.length ? stack[stack.length - 1].parts : cfg.rootIsPara ? root : null;
      if (target && (!closing || !selfClosing)) target.push({ sep });
    }
    if (cfg.isPara(name)) {
      if (selfClosing) continue;
      if (!closing) stack.push({ name, parts: [] });
      else {
        // Mos ochuvchi tegni topib yopamiz (noto'g'ri tuzilgan HTML ga chidamli)
        for (let k = stack.length - 1; k >= 0; k--) {
          if (stack[k].name === name) {
            const closed = stack.splice(k);
            for (const c of closed) if (c.parts.some((p) => 'text' in p)) paras.push(c.parts);
            break;
          }
        }
      }
    }
  }
  for (const c of stack) if (c.parts.some((p) => 'text' in p)) paras.push(c.parts);
  if (root.some((p) => 'text' in p)) paras.push(root);
  return paras;
};

/** Matn tugunlarini o'giradi. O'zgarish bo'lmasa `out` null. */
export const convertMixed = (
  src: string,
  cfg: MixedConfig,
  opts: ConvertOptions
): { out: string | null; stats: ConvertStats } => {
  const paras = scanMixed(src, cfg);
  let stats = emptyStats();
  if (!paras.length) return { out: null, stats };

  let docText = '';
  for (const p of paras) {
    for (const s of p) docText += 'text' in s ? s.text : ' ';
    docText += '\n';
    if (docText.length > 300_000) break;
  }
  const docContext = computeContext(docText);

  const reps: { start: number; end: number; value: string }[] = [];
  for (const p of paras) {
    const r = convertSegments(p.map((s) => ('text' in s ? s.text : s.sep)), opts, docContext);
    stats = addStats(stats, r.stats);
    p.forEach((s, i) => {
      if ('text' in s && r.segments[i] !== s.text) {
        // Natijada faqat harflar o'zgaradi; & < > ni xavfsizlik uchun baribir ekranlaymiz
        reps.push({ start: s.start, end: s.end, value: r.segments[i].replace(/&/g, '&amp;').replace(/</g, '&lt;') });
      }
    });
  }
  if (!reps.length) return { out: null, stats };
  reps.sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  let pos = 0;
  for (const r of reps) {
    parts.push(src.slice(pos, r.start), r.value);
    pos = r.end;
  }
  parts.push(src.slice(pos));
  return { out: parts.join(''), stats };
};

/** Ko'rish uchun paragraflar matni (hujjat tartibida). */
export const mixedParagraphTexts = (src: string, cfg: MixedConfig): string[] =>
  scanMixed(src, cfg)
    .map((p) => {
      const first = p.find((s): s is Seg => 'text' in s);
      return { pos: first ? first.start : 0, text: p.map((s) => ('text' in s ? s.text : s.sep)).join('') };
    })
    .sort((a, b) => a.pos - b.pos)
    .flatMap((p) => (p.text.includes('\n') ? p.text.split('\n') : [p.text]))
    .map((t) => t.replace(/[ \t]+/g, ' ').trim())
    .filter((t, i, arr) => t || (i > 0 && arr[i - 1]));

// ---------------------------------------------------------------------------
// ODF (LibreOffice / OpenOffice: .odt, .ods, .odp)
// ---------------------------------------------------------------------------

const ODF_SKIP = new Set([
  'text:tracked-changes', // o'chirilgan/kiritilgan tahrirlar tarixi
  'dc:creator', 'dc:date', 'meta:date-string', // izoh muallifi va sanasi
  'text:bookmark-ref', 'text:reference-ref',
  'svg:title', 'svg:desc',
]);

export const ODF_CFG: MixedConfig = {
  isPara: (n) => n === 'text:p' || n === 'text:h',
  sep: (n) => (n === 'text:tab' ? '\t' : n === 'text:line-break' ? '\n' : n === 'text:s' ? ' ' : undefined),
  isSkip: (n) => ODF_SKIP.has(n),
};

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

const HTML_VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const HTML_SKIP = new Set(['script', 'style', 'noscript', 'template', 'code', 'kbd', 'samp', 'var', 'svg', 'math', 'textarea']);
const HTML_BLOCK = new Set([
  'p', 'div', 'br', 'li', 'ul', 'ol', 'td', 'th', 'tr', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'section', 'article', 'header', 'footer', 'nav', 'aside', 'main', 'blockquote', 'pre', 'hr', 'dt', 'dd',
  'figcaption', 'caption', 'title', 'option', 'label', 'button', 'body', 'head', 'html',
]);

export const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', bull: '•',
  copy: '©', reg: '®', trade: '™', deg: '°', middot: '·', prime: '′', shy: '­',
};

export const HTML_CFG: MixedConfig = {
  isPara: () => false,
  sep: (n) => (HTML_BLOCK.has(n) ? '\n' : undefined),
  isSkip: (n) => HTML_SKIP.has(n),
  isVoid: (n) => HTML_VOID.has(n),
  lowerCase: true,
  rootIsPara: true,
  entities: HTML_ENTITIES,
};
