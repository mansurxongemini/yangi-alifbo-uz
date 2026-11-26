import React from 'react';
import { MARK } from '../core/engine';

const MARK_RE = /([-]+)|/g;
const decodeIdx = (s: string) => Number([...s].map((c) => c.charCodeAt(0) - MARK.DIGIT0).join(''));

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sanitizatsiyadan keyingi HTML dagi belgilarni <mark> ga aylantiradi. */
export const markersToHtml = (html: string, originals: string[]): string =>
  html.replace(MARK_RE, (m, idx?: string) =>
    m === MARK.END
      ? '</mark>'
      : `<mark class="change-mark" data-i="${decodeIdx(idx!)}" title="Asl: ${escapeHtml(originals[decodeIdx(idx!)] ?? '')}">`
  );

/** Oddiy matndagi belgilarni React elementlariga aylantiradi. */
export const renderMarked = (text: string, originals: string[]): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let pos = 0;
  let open: number | null = null;
  let key = 0;
  const push = (s: string) => {
    if (!s) return;
    nodes.push(
      open === null
        ? s
        : React.createElement(
            'mark',
            { key: key++, className: 'change-mark', 'data-i': open, title: `Asl: ${originals[open] ?? ''}` },
            s
          )
    );
  };
  MARK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARK_RE.exec(text)) !== null) {
    push(text.slice(pos, m.index));
    open = m[0] === MARK.END ? null : decodeIdx(m[1]);
    pos = m.index + m[0].length;
  }
  push(text.slice(pos));
  return nodes;
};

/**
 * Word koʻrinishi (docx-preview) ichidagi belgilarni topib, oʻzgargan soʻzlarni <mark> bilan oʻraydi.
 * Soʻz bir nechta "run"ga boʻlingan boʻlsa ham ishlaydi (belgi holati matn tugunlari boʻylab davom etadi).
 */
export const highlightMarkersInDom = (root: HTMLElement, originals: string[]): number => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let open: number | null = null;
  let count = 0;
  for (const node of nodes) {
    const t = node.data;
    if (open === null && !/[-]/.test(t)) continue;
    const frag = document.createDocumentFragment();
    let buf = '';
    const flush = () => {
      if (!buf) return;
      if (open === null) frag.append(buf);
      else {
        const mk = document.createElement('mark');
        mk.className = 'change-mark';
        mk.dataset.i = String(open);
        mk.title = `Asl: ${originals[open] ?? ''}`;
        mk.textContent = buf;
        frag.append(mk);
      }
      buf = '';
    };
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (c === MARK.START) {
        flush();
        let j = i + 1;
        let digits = '';
        while (j < t.length && t[j] !== MARK.SEP) digits += t[j++];
        open = decodeIdx(digits);
        count++;
        i = j;
      } else if (c === MARK.END) {
        flush();
        open = null;
      } else buf += c;
    }
    flush();
    node.replaceWith(frag);
  }
  return count;
};
