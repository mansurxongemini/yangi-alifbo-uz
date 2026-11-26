import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Loader2, X } from 'lucide-react';
import type { PreviewData } from '../utils/fileConverter';
import { highlightMarkersInDom, markersToHtml, renderMarked } from '../utils/marks';
import { renderMarkdown } from './MarkdownView';

interface Props {
  title: string;
  load: () => Promise<PreviewData>;
  onClose: () => void;
  onDownload?: () => void;
}

type Mode = 'changes' | 'original';

const nf = new Intl.NumberFormat('ru-RU');

/**
 * Hujjatni Word sahifasidagidek koʻrsatadi: oʻzgargan soʻzlar belgilangan,
 * ustiga olib borilsa asl soʻz koʻrinadi. «Asl hujjat» rejimi bilan solishtirish mumkin.
 */
export const DocumentPreview: React.FC<Props> = ({ title, load, onClose, onDownload }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('changes');
  const [rendering, setRendering] = useState(true);
  const [current, setCurrent] = useState(-1);
  const [markCount, setMarkCount] = useState(0);

  const bodyRef = useRef<HTMLDivElement>(null);
  const docxRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Maʼlumotni tayyorlash
  useEffect(() => {
    let alive = true;
    load().then(
      (d) => alive && setData(d),
      (e) => alive && setError(e instanceof Error ? e.message : String(e))
    );
    return () => {
      alive = false;
    };
  }, [load]);

  // Esc, fon aylanmasligi, fokus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Word hujjatini chizish
  useEffect(() => {
    if (!data || data.type !== 'docx' || !docxRef.current || !styleRef.current) return;
    let alive = true;
    const body = docxRef.current;
    const styles = styleRef.current;
    setRendering(true);
    body.innerHTML = '';
    styles.innerHTML = '';
    import('docx-preview')
      .then(({ renderAsync }) =>
        renderAsync(mode === 'changes' ? data.marked : data.original, body, styles, {
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          useBase64URL: true,
          experimental: true,
        })
      )
      .then(() => {
        if (!alive) return;
        setMarkCount(mode === 'changes' ? highlightMarkersInDom(body, data.originals) : 0);
        setCurrent(-1);
        setRendering(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(`Hujjatni körsatib bölmadi: ${e instanceof Error ? e.message : String(e)}`);
        setRendering(false);
      });
    return () => {
      alive = false;
    };
  }, [data, mode]);

  useEffect(() => {
    if (data && data.type !== 'docx') {
      setRendering(false);
      setCurrent(-1);
      // React chizgandan keyin belgilarni sanash
      requestAnimationFrame(() => setMarkCount(markGroups().length));
    }
  }, [data, mode]);

  const nonDocx = useMemo(() => {
    if (!data || data.type === 'docx') return null;
    const showMarks = mode === 'changes';
    if (data.type === 'paragraphs') {
      const lines = showMarks ? data.marked : data.original;
      return (
        <div className="preview-page">
          {lines.map((l, i) =>
            l ? (
              <p key={i} className="mb-2 whitespace-pre-wrap">
                {showMarks ? renderMarked(l, data.originals) : l}
              </p>
            ) : (
              <hr key={i} className="my-5 border-dashed border-black/15" />
            )
          )}
        </div>
      );
    }
    if (data.markdown) {
      const html = showMarks ? markersToHtml(renderMarkdown(data.marked), data.originals) : renderMarkdown(data.original);
      return <div className="preview-page md-preview md-paper" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return (
      <div className="preview-page">
        <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed">
          {showMarks ? renderMarked(data.marked, data.originals) : data.original}
        </pre>
      </div>
    );
  }, [data, mode]);

  /** Har bir oʻzgargan soʻzning barcha boʻlaklari (soʻz bir nechta run ga boʻlingan boʻlishi mumkin) */
  const markGroups = () => {
    const groups: HTMLElement[][] = [];
    const seen = new Map<string, HTMLElement[]>();
    bodyRef.current?.querySelectorAll<HTMLElement>('mark.change-mark').forEach((m) => {
      const k = m.dataset.i ?? String(groups.length);
      let g = seen.get(k);
      if (!g) {
        g = [];
        seen.set(k, g);
        groups.push(g);
      }
      g.push(m);
    });
    return groups;
  };

  const goTo = (dir: 1 | -1) => {
    const groups = markGroups();
    if (groups.length === 0) return;
    const next = (current + dir + groups.length) % groups.length;
    bodyRef.current?.querySelectorAll('.change-mark-active').forEach((m) => m.classList.remove('change-mark-active'));
    groups[next].forEach((m) => m.classList.add('change-mark-active'));
    groups[next][0].scrollIntoView({ block: 'center', behavior: 'smooth' });
    setCurrent(next);
  };

  const segBtn = (m: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => setMode(m)}
      className={`px-3 h-8 rounded-md text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
        mode === m ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-2xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Körish: ${title}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-6xl h-[94vh] bg-[var(--bg-panel)] rounded-[20px] border border-[var(--border-subtle)] shadow-[var(--shadow-pop)] overflow-hidden flex flex-col">
        <div className="px-3 sm:px-4 py-2.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate" title={title}>
              {title}
            </p>
            {mode === 'changes' && data && (
              <p className="text-xs text-[var(--text-secondary)]">{nf.format(data.originals.length)} ta özgariş</p>
            )}
          </div>

          <div role="tablist" className="inline-flex p-0.5 rounded-lg bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
            {segBtn('changes', 'Yangi')}
            {segBtn('original', 'Asl')}
          </div>

          {mode === 'changes' && markCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goTo(-1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Oldingi özgariş"
                aria-label="Oldingi özgariş"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-xs tabular-nums text-[var(--text-secondary)] min-w-[64px] text-center">
                {current < 0 ? '—' : nf.format(current + 1)} / {nf.format(markCount)}
              </span>
              <button
                type="button"
                onClick={() => goTo(1)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Keyingi özgariş"
                aria-label="Keyingi özgariş"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-xs font-semibold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Yuklab oliş</span>
            </button>
          )}

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
            aria-label="Yopiş"
            title="Yopiş (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={bodyRef} className="flex-1 overflow-auto bg-[var(--bg-canvas)] relative">
          {error ? (
            <div className="h-full flex items-center justify-center p-6">
              <p role="alert" className="text-sm text-[var(--danger)] max-w-md text-center">{error}</p>
            </div>
          ) : (
            <>
              {(!data || rendering) && (
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)] z-10 bg-[var(--bg-canvas)]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
              <div ref={styleRef} />
              {data?.type === 'docx' ? <div ref={docxRef} className="docx-host" /> : <div className="py-6 px-3">{nonDocx}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
