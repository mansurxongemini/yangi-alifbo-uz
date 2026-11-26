import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

let hooked = false;
const ensureHook = () => {
  if (hooked) return;
  hooked = true;
  // Tashqi havolalar yangi oynada, xavfsiz ochiladi
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
};

export const renderMarkdown = (src: string): string => {
  ensureHook();
  const html = marked.parse(src, { async: false, gfm: true, breaks: true }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
};

interface Props {
  source: string;
  lang?: string;
  className?: string;
}

export const MarkdownView: React.FC<Props> = ({ source, lang, className }) => {
  const html = useMemo(() => renderMarkdown(source), [source]);
  return <div lang={lang} className={`md-preview ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
};
