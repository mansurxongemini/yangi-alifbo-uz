import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  Code,
  Copy,
  Download,
  FileArchive,
  FileCheck2,
  Eye,
  FileText,
  FolderOpen,
  Plus,
  Highlighter,
  Info,
  Files,
  Loader2,
  MinusCircle,
  Type,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  convertText,
  convertTextWithStats,
  detectScripts,
  Script,
  SourceHint,
  SCRIPT_LABELS,
} from '../core/engine';
import {
  ACCEPT_ATTR,
  CancelledError,
  ConvertResult,
  buildPreview,
  extractFromZip,
  readArchiveEntry,
  readInputEntry,
  InputItem,
  formatFileSize,
  kindOf,
  MAX_FILE_SIZE,
  ProgressInfo,
  ReportItem,
} from '../utils/fileConverter';
import { startConversion, ConversionJob } from '../utils/runConversion';
import { MarkdownView, renderMarkdown } from './MarkdownView';
import { DocumentPreview } from './DocumentPreview';
import { saveBlob, supportsFolderPick } from '../utils/platform';
import { markersToHtml, renderMarked } from '../utils/marks';

interface ConverterProps {
  onOpenTable?: () => void;
}

const KEYCAPS = ['Ö', 'Ğ', 'Ş', 'Ç', 'ö', 'ğ', 'ş', 'ç', 'ʼ'];

const SOURCE_OPTIONS: { value: SourceHint; label: string }[] = [
  { value: 'auto', label: 'Avto-aniqlaş' },
  { value: 'cyrillic', label: 'Kirill' },
  { value: 'old_latin', label: 'Eski lotin' },
  { value: 'new_latin', label: 'Yangi lotin' },
];
const TARGET_OPTIONS: { value: Script; label: string }[] = [
  { value: 'new_latin', label: 'Yangi lotin' },
  { value: 'old_latin', label: 'Eski lotin' },
  { value: 'cyrillic', label: 'Kirill' },
];

const LANG_ATTR: Record<Script, string> = { cyrillic: 'uz-Cyrl', old_latin: 'uz-Latn', new_latin: 'uz-Latn' };

const store = {
  get<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    try {
      const v = localStorage.getItem(key) as T | null;
      return v && allowed.includes(v) ? v : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private rejim */
    }
  },
};

/** Faylni saqlash (brauzer/desktop — yuklab olish, Android — xotiraga + ulashish). */
const toast = (message: string) => window.dispatchEvent(new CustomEvent('app-toast', { detail: message }));
const downloadBlob = (blob: Blob, filename: string) => {
  saveBlob(blob, filename).then(
    (r) => r.message && toast(r.message),
    (e) => toast(`Saqlab bölmadi: ${e instanceof Error ? e.message : String(e)}`)
  );
};

/** Ekran pastidagi qisqa xabar (masalan, telefonda "Saqlandi: Documents/..."). */
const Toast: React.FC = () => {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 4000);
    };
    window.addEventListener('app-toast', on);
    return () => {
      window.removeEventListener('app-toast', on);
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <div role="status" className="rise fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] max-w-[92vw] px-4 py-2.5 rounded-xl bg-[#0E1621] text-white text-sm shadow-[var(--shadow-pop)]">
      {msg}
    </div>
  );
};

// Raqamlarni boʻsh joy bilan guruhlash: 12 954
const nf = new Intl.NumberFormat('ru-RU');

const STATUS_META: Record<ReportItem['status'], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  converted: { label: 'Ögirildi', cls: 'text-[var(--success)]', Icon: CheckCircle2 },
  unchanged: { label: 'Özgarişsiz', cls: 'text-[var(--text-tertiary)]', Icon: MinusCircle },
  skipped: { label: 'Ötkazib yuborildi', cls: 'text-[var(--warning)]', Icon: Info },
  error: { label: 'Xato', cls: 'text-[var(--danger)]', Icon: XCircle },
};

// ---------------------------------------------------------------------------

/** Yozuv tanlovi: nomi va ▾ belgisi bilan matn-tugma, bosilganda roʻyxat ochiladi. */
const ScriptMenu = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const current = options.find((o) => o.value === value)?.label ?? value;
  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${current}`}
        onClick={() => setOpen((v) => !v)}
        className="press h-10 max-w-full px-3 rounded-lg inline-flex items-center gap-1.5 text-[15px] sm:text-base font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer"
      >
        <span className="truncate">{current}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="rise absolute z-40 left-0 top-full mt-1.5 min-w-[220px] p-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] shadow-[var(--shadow-pop)]"
        >
          <li className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-[var(--text-tertiary)]">{label}</li>
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-value={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full h-9 px-3 rounded-lg flex items-center justify-between gap-3 text-sm text-left cursor-pointer ${
                    on ? 'text-[var(--accent)] font-medium' : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]'
                  }`}
                >
                  {o.label}
                  {on && <Check className="w-4 h-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
> = ({ label, active, className, children, ...rest }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={`press h-8 min-w-8 px-2 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
      active
        ? 'bg-[var(--accent-subtle)] text-[var(--accent)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)]'
    } ${className ?? ''}`}
    {...rest}
  >
    {children}
  </button>
);

// ---------------------------------------------------------------------------

export const Converter: React.FC<ConverterProps> = () => {
  const [inputText, setInputText] = useState('');
  const [source, setSource] = useState<SourceHint>(() =>
    store.get('src', ['auto', 'cyrillic', 'old_latin', 'new_latin'] as const, 'auto')
  );
  const [target, setTarget] = useState<Script>(() =>
    store.get('dst', ['new_latin', 'old_latin', 'cyrillic'] as const, 'new_latin')
  );
  const [markdown, setMarkdown] = useState<boolean>(() => store.get('md', ['1', '0'] as const, '1') === '1');
  const [copied, setCopied] = useState(false);
  const [showChanges, setShowChanges] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const [files, setFiles] = useState<InputItem[]>([]);
  const file = files.length ? files[0] : null;
  const single = files.length === 1 && !files[0].path.includes('/');
  const appendRef = useRef(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'text' | 'files'>('text');
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [resultKey, setResultKey] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [onlyProblems, setOnlyProblems] = useState(false);
  /** Koʻrilayotgan fayl: '' — yuklangan faylning oʻzi, aks holda arxiv ichidagi yoʻl */
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const jobRef = useRef<ConversionJob | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => store.set('src', source), [source]);
  useEffect(() => store.set('dst', target), [target]);
  useEffect(() => store.set('md', markdown ? '1' : '0'), [markdown]);
  useEffect(() => () => jobRef.current?.cancel(), []);

  // ---------------- Matn ----------------
  const deferredInput = useDeferredValue(inputText);
  const converted = useMemo(
    () => convertTextWithStats(deferredInput, { from: source, to: target, markdown }),
    [deferredInput, source, target, markdown]
  );
  // «Oʻzgarishlar» rejimi: oʻzgargan soʻzlar belgilangan koʻrinish
  const markedView = useMemo(() => {
    if (!showChanges) return null;
    const originals: string[] = [];
    const text = convertText(deferredInput, { from: source, to: target, markdown, markSink: originals });
    return {
      originals,
      html: markdown ? markersToHtml(renderMarkdown(text), originals) : null,
      nodes: markdown ? null : renderMarked(text, originals),
    };
  }, [showChanges, deferredInput, source, target, markdown]);
  const outputText = converted.text;
  const detection = useMemo(() => detectScripts(deferredInput), [deferredInput]);

  const settingsKey = `${source}|${target}`;
  const isConverting = progress !== null;
  const resultStale = !!result && resultKey !== settingsKey;

  // ---------------- Yoʻnalish ----------------
  const handleSwap = () => {
    const effective: Script = source === 'auto' ? (detection.dominant ?? 'cyrillic') : source;
    const nextTarget: Script = effective === target ? (target === 'new_latin' ? 'cyrillic' : 'new_latin') : effective;
    setSource(target);
    setTarget(nextTarget);
    if (mode === 'text' && outputText) setInputText(outputText);
  };

  const insertChar = (ch: string) => {
    const el = textareaRef.current;
    if (!el) {
      setInputText((p) => p + ch);
      return;
    }
    const { selectionStart: s, selectionEnd: e } = el;
    setInputText(inputText.slice(0, s) + ch + inputText.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ch.length, s + ch.length);
    });
  };

  const handleCopy = async () => {
    if (!outputText) return;
    try {
      if (markdown && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        // Word/Google Docs ga formatlangan holda, oddiy maydonga matn sifatida joylashadi
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([renderMarkdown(outputText)], { type: 'text/html' }),
            'text/plain': new Blob([outputText], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(outputText);
      }
    } catch {
      const ta = document.createElement('textarea');
      ta.value = outputText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    if (!outputText) return;
    const ext = markdown ? 'md' : 'txt';
    downloadBlob(
      new Blob(['﻿' + outputText], { type: 'text/plain;charset=utf-8' }),
      `matn_${new Date().toISOString().slice(0, 10)}.${ext}`
    );
  };

  // ---------------- Fayl ----------------
  const resetFileState = () => {
    jobRef.current?.cancel();
    jobRef.current = null;
    setProgress(null);
    setResult(null);
    setFileError(null);
    setOnlyProblems(false);
    setPreviewPath(null);
  };

  const handleFilesSelect = (list: InputItem[], append = false) => {
    if (!list.length) return;
    // Qo'shishda bir xil faylni ikki marta olmaslik
    const seen = new Set(append ? files.map((f) => `${f.path}|${f.blob.size}`) : []);
    const next = [...(append ? files : []), ...list.filter((f) => !seen.has(`${f.path}|${f.blob.size}`))];
    resetFileState();
    setMode('files');
    setFiles(next);
    const total = next.reduce((a, f) => a + f.blob.size, 0);
    if (total > MAX_FILE_SIZE) {
      setFileError(`Fayllar jami juda katta (${formatFileSize(total)}). Eng köpi bilan ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }
    if (next.length === 1 && kindOf(next[0].path) === 'unsupported') {
      setFileError('Bu format qöllab-quvvatlanmaydi. Word, Excel, PowerPoint, LibreOffice (.odt), RTF, HTML, matn fayli yoki ZIP/RAR/7z arxiv yuklang.');
    }
  };

  const pickFiles = (append: boolean) => {
    appendRef.current = append;
    fileInputRef.current?.click();
  };
  const pickFolder = (append: boolean) => {
    appendRef.current = append;
    folderInputRef.current?.click();
  };

  const removeFile = (idx: number) => {
    const next = files.filter((_, i) => i !== idx);
    resetFileState();
    setFiles(next);
  };

  const handleConvertFile = useCallback(async () => {
    if (!files.length) return;
    resetFileState();
    setProgress({ phase: 'reading', done: 0, total: 0 });
    const job = startConversion(files, { from: source, to: target }, (p) => setProgress(p));
    jobRef.current = job;
    try {
      const res = await job.promise;
      if (jobRef.current !== job) return;
      setResult(res);
      setResultKey(`${source}|${target}`);
      if (res.report.some((r) => r.status === 'error')) setOnlyProblems(res.report.length > 8);
    } catch (err) {
      if (jobRef.current !== job) return;
      if (!(err instanceof CancelledError)) {
        setFileError(err instanceof Error ? err.message : 'Faylni ögirişda xatolik yuz berdi.');
      }
    } finally {
      if (jobRef.current === job) {
        jobRef.current = null;
        setProgress(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, source, target]);

  const handleCancel = () => {
    jobRef.current?.cancel();
    jobRef.current = null;
    setProgress(null);
  };

  const handleClearFile = () => {
    resetFileState();
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadItem = async (path: string) => {
    if (!result) return;
    try {
      const blob = await extractFromZip(result.blob, path);
      downloadBlob(blob, path.split('/').pop() || path);
    } catch (e) {
      setFileError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadPreview = useCallback(async () => {
    if (!files.length || previewPath === null) throw new Error('Fayl yöq');
    const opts = { from: source, to: target };
    const one = files[0];
    if (previewPath === '') return buildPreview(new Uint8Array(await one.blob.arrayBuffer()), one.path, opts);
    if (single) return buildPreview(await readArchiveEntry(one.blob, one.path, previewPath), previewPath, opts);
    return buildPreview(await readInputEntry(files, previewPath), previewPath, opts);
  }, [files, single, previewPath, source, target]);

  // Drag & drop (ichki elementlar ustida miltillamasligi uchun hisoblagich)
  const onDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepth.current++;
    setIsDragOver(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragOver(false);
    // Papkalar ham: ichidagi barcha fayllar nisbiy yo'li bilan olinadi
    collectDropped(e.dataTransfer).then((list) => handleFilesSelect(list, files.length > 0 && !result));
  };

  // ---------------- Hisobot ----------------
  const counts = useMemo(() => {
    const c = { converted: 0, unchanged: 0, skipped: 0, error: 0 };
    result?.report.forEach((r) => c[r.status]++);
    return c;
  }, [result]);
  const visibleReport = useMemo(
    () => (result ? (onlyProblems ? result.report.filter((r) => r.status === 'error' || r.status === 'skipped') : result.report) : []),
    [result, onlyProblems]
  );

  // ---------------- Aniqlash xabari ----------------
  const notice = useMemo(() => {
    if (mode === 'files' || detection.words === 0) return null;
    const parts = (Object.entries(detection.shares) as [Script, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    if (detection.mixed) {
      return {
        tone: 'info' as const,
        text: `Aralaş: ${parts.map(([k, v]) => `${SCRIPT_LABELS[k]} ${v}%`).join(' · ')}`,
      };
    }
    if (source !== 'auto' && detection.dominant && detection.dominant !== source && detection.words >= 2) {
      return {
        tone: 'warn' as const,
        text: `Aniqlandi: ${SCRIPT_LABELS[detection.dominant]}`,
      };
    }
    if (detection.dominant) {
      return {
        tone: 'muted' as const,
        text: source === 'auto' ? `Aniqlandi: ${SCRIPT_LABELS[detection.dominant]}` : '',
      };
    }
    return null;
  }, [detection, source, target, mode]);


  // =========================================================================

  const formatChips = ['.docx', '.xlsx', '.pptx', '.odt', '.rtf', '.html', '.txt', '.zip', '.rar', '.7z'];

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []).map((f) => ({ blob: f, path: f.name }));
          handleFilesSelect(list, appendRef.current);
          e.target.value = '';
        }}
        className="hidden"
        id="file-upload-input"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error — papka tanlash (barcha zamonaviy brauzerlarda bor)
        webkitdirectory=""
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []).map((f) => ({ blob: f, path: f.webkitRelativePath || f.name }));
          handleFilesSelect(list, appendRef.current);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* ============ Rejim tablari (yuqorida, tabletka) ============ */}
      <div className="rise flex items-center justify-between gap-3 mb-4">
        <div role="tablist" aria-label="Rejim" className="flex gap-2">
          {([
            { key: 'text', label: 'Matn', Icon: Type },
            { key: 'files', label: 'Hujjatlar', Icon: Files },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={`press h-10 pl-3.5 pr-4 rounded-full inline-flex items-center gap-2 text-[15px] font-medium cursor-pointer ${
                mode === key
                  ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel)]/60'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
              {key === 'files' && files.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" aria-label="fayl yuklangan" />}
            </button>
          ))}
        </div>
      </div>

      {/* ============ Konvertor ============ */}
      <div
        className="rise rise-1 relative bg-[var(--bg-panel)] rounded-2xl shadow-[var(--shadow-card)]"
        onDragEnter={onDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Yozuv tanlovi */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-14 px-2 sm:px-3 border-b border-[var(--border-subtle)]">
          <ScriptMenu label="Manba" value={source} options={SOURCE_OPTIONS} onChange={setSource} />
          <button
            type="button"
            onClick={handleSwap}
            disabled={isConverting}
            className="press w-10 h-10 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Yönalişni almaştiriş"
            aria-label="Yönalişni almaştiriş"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>
          <div className="md:pl-3">
            <ScriptMenu label="Natija" value={target} options={TARGET_OPTIONS} onChange={setTarget} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[460px]">
          {/* ---------- Chap: kiritish ---------- */}
          <section className="flex flex-col min-w-0" aria-label="Manba matn">
            {mode === 'text' && (
              <div className="h-12 px-3 sm:px-4 pt-2 flex items-center gap-2">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0" role="toolbar" aria-label="Yangi harflar">
                  {KEYCAPS.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => insertChar(ch)}
                      className="press h-7 min-w-7 px-1.5 rounded-md bg-[var(--bg-surface-raised)] hover:bg-[var(--accent-subtle)] hover:text-[var(--accent)] text-sm font-medium text-[var(--text-primary)] cursor-pointer shrink-0"
                      title={ch === 'ʼ' ? 'Tutuq belgisi ʼ (U+02BC)' : `«${ch}» harfini qöşiş`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
                <IconButton
                  label={markdown ? 'Markdown yoqilgan. Xom matn (raw) rejimiga ötiş' : 'Xom matn (raw) rejimi. Markdownni yoqiş'}
                  active={!markdown}
                  aria-pressed={!markdown}
                  onClick={() => setMarkdown((m) => !m)}
                >
                  <Code className="w-4 h-4" />
                </IconButton>
                <IconButton label="Tozalaş" disabled={!inputText} onClick={() => setInputText('')}>
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            )}

            {mode === 'files' ? (
              file ? (
                <div className="flex-1 flex items-center justify-center p-5 sm:p-8">
                  <div className="w-full max-w-md space-y-4">
                    {single ? (
                      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg-surface-raised)]">
                        <div className="w-11 h-11 rounded-xl bg-[var(--bg-panel)] text-[var(--accent)] shadow-[var(--shadow-sm)] flex items-center justify-center shrink-0">
                          {kindOf(file!.path) === 'zip' || kindOf(file!.path) === 'archive' ? <FileArchive className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--text-primary)] break-all line-clamp-2" title={file!.path}>
                            {file!.path}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
                            {file!.path.split('.').pop()?.toUpperCase()} · {formatFileSize(file!.blob.size)}
                          </p>
                        </div>
                        <IconButton label="Faylni olib taşlaş" onClick={handleClearFile} disabled={isConverting}>
                          <X className="w-4 h-4" />
                        </IconButton>
                      </div>
                    ) : (
                      <FileList files={files} disabled={isConverting} onRemove={removeFile} onClear={handleClearFile} />
                    )}

                    {!isConverting && !result && (
                      <div className="flex items-center justify-center gap-4 text-sm">
                        <button type="button" onClick={() => pickFiles(true)} className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer">
                          <Plus className="w-4 h-4" /> Fayl qöşiş
                        </button>
                        {supportsFolderPick() && (
                          <>
                            <span className="w-px h-4 bg-[var(--border-subtle)]" />
                            <button type="button" onClick={() => pickFolder(true)} className="inline-flex items-center gap-1.5 font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer">
                              <FolderOpen className="w-4 h-4" /> Papka qöşiş
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {fileError && (
                      <div role="alert" className="flex items-start gap-2 text-sm text-[var(--danger)] bg-[var(--danger)]/8 p-3 rounded-xl border border-[var(--danger)]/20">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{fileError}</span>
                      </div>
                    )}

                    {isConverting && progress ? (
                      <ProgressPanel progress={progress} onCancel={handleCancel} />
                    ) : (
                      !(single && kindOf(file!.path) === 'unsupported') &&
                      !fileError?.startsWith('Fayllar jami') &&
                      (!result || resultStale) && (
                        <button
                          type="button"
                          onClick={handleConvertFile}
                          className="press w-full h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-sm font-semibold flex items-center justify-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer"
                        >
                          {resultStale ? 'Qayta ögiriş' : files.length > 1 ? `${nf.format(files.length)} ta faylni ögiriş` : 'Ögiriş'}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )
                    )}

                    {result && !isConverting && (
                      <button
                        type="button"
                        onClick={() => pickFiles(false)}
                        className="w-full text-sm font-medium text-[var(--accent)] hover:underline underline-offset-4 cursor-pointer"
                      >
                        Boşqa fayllar tanlaş
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-4 sm:p-5 flex">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => pickFiles(false)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pickFiles(false))}
                    className="group flex-1 rounded-2xl border-[1.5px] border-dashed border-[var(--border-hover)] hover:border-[var(--accent)] hover:bg-[var(--accent-subtle)]/50 transition-colors flex flex-col items-center justify-center text-center px-6 py-10 cursor-pointer"
                  >
                    <span className="w-14 h-14 rounded-2xl bg-[var(--bg-panel)] shadow-[var(--shadow-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--accent)] mb-5 transition-transform group-hover:-translate-y-0.5">
                      <Upload className="w-6 h-6" />
                    </span>
                    <span className="text-base font-medium text-[var(--text-primary)]">Fayllarni tanlang yoki taşlang</span>
                    <span className="mt-1 text-sm text-[var(--text-secondary)]">
                      {supportsFolderPick() ? 'Istalgança fayl yoki ' : 'Bir yöla istalgança fayl'}
                      {supportsFolderPick() && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          pickFolder(false);
                        }}
                        className="font-medium text-[var(--accent)] underline underline-offset-4 cursor-pointer"
                      >
                        butun papka
                      </button>
                      )}
                    </span>
                    <span className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {formatChips.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded-md bg-[var(--bg-surface-raised)] text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
                          {c}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Matn kiriting"
                  aria-label="Ögiriladigan matn"
                  className={`w-full flex-1 min-h-[300px] bg-transparent resize-none border-0 px-4 sm:px-5 py-4 text-[20px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-[1.5] focus:outline-none focus-visible:outline-none ${
                    markdown ? '' : 'font-mono text-[15px]'
                  }`}
                  spellCheck={false}
                />
                <div className="h-14 px-4 sm:px-5 flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
                  <span
                    className={`truncate ${
                      notice?.tone === 'warn' ? 'text-[var(--warning)]' : notice?.tone === 'info' ? 'text-[var(--accent)]' : ''
                    }`}
                    title={notice?.text}
                  >
                    {notice?.text}
                  </span>
                  <span className="tabular-nums shrink-0">
                    {inputText ? nf.format(inputText.length) : ''}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ---------- Oʻng: natija ---------- */}
          <section className="flex flex-col min-w-0 bg-[var(--bg-sunken)] rounded-b-2xl md:rounded-bl-none md:rounded-br-2xl" aria-label="Natija" lang={LANG_ATTR[target]}>
            {mode === 'files' ? (
              <div className="flex-1 flex flex-col p-4 sm:p-5 min-h-0">
                {file && result && !resultStale ? (
                  <ResultPanel
                    key={`${result.filename}|${result.blob.size}|${resultKey}`}
                    result={result}
                    counts={counts}
                    visible={visibleReport}
                    onlyProblems={onlyProblems}
                    setOnlyProblems={setOnlyProblems}
                    onDownload={() => downloadBlob(result.blob, result.filename)}
                    onDownloadItem={downloadItem}
                    onPreview={(path) => setPreviewPath(path ?? '')}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
                    {(resultStale || isConverting) && (
                      <p className="text-sm text-[var(--text-secondary)]">{resultStale ? 'Sozlama özgardi' : 'Ögirilmoqda…'}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 md:pt-12">
                <div className="flex-1 min-h-[300px] max-h-[70vh] overflow-auto px-4 sm:px-5 py-4">
                  {outputText ? (
                    markedView ? (
                      markedView.html !== null ? (
                        <div className="md-preview text-[20px] leading-[1.5]" dangerouslySetInnerHTML={{ __html: markedView.html }} />
                      ) : (
                        <pre className="whitespace-pre-wrap break-words font-mono text-[15px] leading-relaxed text-[var(--text-primary)] select-text">
                          {markedView.nodes}
                        </pre>
                      )
                    ) : markdown ? (
                      <MarkdownView source={outputText} className="text-[20px] leading-[1.5]" />
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-mono text-[15px] leading-relaxed text-[var(--text-primary)] select-text">
                        {outputText}
                      </pre>
                    )
                  ) : (
                    <p className="text-[20px] text-[var(--text-tertiary)] leading-[1.5]">Natija</p>
                  )}
                </div>
                <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
                  <span className="truncate pl-1">
                    {converted.stats.changed > 0 && `${nf.format(converted.stats.changed)} ta özgariş`}
                  </span>
                  <div className="flex items-center gap-1">
                    <IconButton
                      label={showChanges ? 'Özgarişlarni yaşiriş' : 'Özgargan sözlarni belgilaş'}
                      active={showChanges}
                      aria-pressed={showChanges}
                      disabled={!outputText}
                      onClick={() => setShowChanges((v) => !v)}
                      className="h-10 min-w-10"
                    >
                      <Highlighter className="w-5 h-5" />
                    </IconButton>
                    <IconButton label={copied ? 'Nusxa olindi' : 'Nusxa oliş'} disabled={!outputText} onClick={handleCopy} className="h-10 min-w-10">
                      {copied ? <Check className="w-5 h-5 text-[var(--success)]" /> : <Copy className="w-5 h-5" />}
                    </IconButton>
                    <IconButton label={`Yuklab oliş (.${markdown ? 'md' : 'txt'})`} disabled={!outputText} onClick={handleDownloadText} className="h-10 min-w-10">
                      <Download className="w-5 h-5" />
                    </IconButton>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-[var(--bg-panel)]/92 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-[var(--accent)] rounded-2xl pointer-events-none">
            <Upload className="w-9 h-9 text-[var(--accent)] mb-3" />
            <p className="text-base font-semibold text-[var(--text-primary)]">Faylni qöyib yuboring</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Word, Excel, PowerPoint, matn yoki ZIP arxiv</p>
          </div>
        )}
      </div>

      <Toast />

      {previewPath !== null && file && result && (
        <DocumentPreview
          title={previewPath === '' ? result.filename : previewPath}
          load={loadPreview}
          onClose={() => setPreviewPath(null)}
          onDownload={() => (previewPath === '' ? downloadBlob(result.blob, result.filename) : downloadItem(previewPath))}
        />
      )}

    </div>
  );
};

// ---------------------------------------------------------------------------

/** Sudrab tashlangan fayl va papkalarni (ichma-ich) nisbiy yo'li bilan yig'adi. */
const collectDropped = async (dt: DataTransfer): Promise<InputItem[]> => {
  // webkitGetAsEntry ni drop hodisasi ichida, sinxron chaqirish shart
  const roots = Array.from(dt.items ?? [])
    .filter((i) => i.kind === 'file')
    .map((i) => i.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => !!e);
  if (!roots.length) return Array.from(dt.files).map((f) => ({ blob: f, path: f.name }));
  const out: InputItem[] = [];
  const walk = async (e: FileSystemEntry): Promise<void> => {
    if (e.isFile) {
      const f = await new Promise<File>((res, rej) => (e as FileSystemFileEntry).file(res, rej));
      out.push({ blob: f, path: e.fullPath.replace(/^\//, '') || f.name });
    } else if (e.isDirectory) {
      const reader = (e as FileSystemDirectoryEntry).createReader();
      // readEntries bir martada hammasini bermaydi — bo'sh ro'yxatgacha o'qiymiz
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const c of batch) await walk(c);
      }
    }
  };
  for (const r of roots) await walk(r);
  return out;
};

const FileList: React.FC<{ files: InputItem[]; disabled: boolean; onRemove: (i: number) => void; onClear: () => void }> = ({ files, disabled, onRemove, onClear }) => {
  const total = files.reduce((a, f) => a + f.blob.size, 0);
  const shown = files.slice(0, 300);
  return (
    <div className="rounded-2xl bg-[var(--bg-surface-raised)] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-11 h-11 rounded-xl bg-[var(--bg-panel)] text-[var(--accent)] shadow-[var(--shadow-sm)] flex items-center justify-center shrink-0">
          <Files className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{nf.format(files.length)} ta fayl</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">Jami {formatFileSize(total)}</p>
        </div>
        <IconButton label="Hammasini olib taşlaş" onClick={onClear} disabled={disabled}>
          <X className="w-4 h-4" />
        </IconButton>
      </div>
      <ul className="max-h-[200px] overflow-y-auto border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
        {shown.map((f, i) => {
          const k = kindOf(f.path);
          return (
            <li key={`${f.path}|${i}`} className="flex items-center gap-2.5 px-4 py-1.5 text-xs">
              {k === 'zip' || k === 'archive' ? <FileArchive className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" /> : <FileText className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />}
              <span className={`truncate flex-1 ${k === 'unsupported' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`} title={f.path}>
                {f.path}
              </span>
              <span className="tabular-nums text-[var(--text-tertiary)] shrink-0">{formatFileSize(f.blob.size)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(i)}
                className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger)] cursor-pointer disabled:opacity-30"
                aria-label={`${f.path} — olib taşlaş`}
              >
                <X className="w-3 h-3" />
              </button>
            </li>
          );
        })}
        {files.length > shown.length && (
          <li className="px-4 py-2 text-xs text-[var(--text-tertiary)]">va yana {nf.format(files.length - shown.length)} ta fayl…</li>
        )}
      </ul>
    </div>
  );
};

const ProgressPanel: React.FC<{ progress: ProgressInfo; onCancel: () => void }> = ({ progress, onCancel }) => {
  const pct =
    progress.phase === 'packing'
      ? 90 + Math.round((progress.percent ?? 0) / 10)
      : progress.total > 0
        ? Math.round((progress.done / progress.total) * 90)
        : 3;
  const label =
    progress.phase === 'reading'
      ? 'Fayl öqilmoqda…'
      : progress.phase === 'packing'
        ? `Arxivlanmoqda… ${Math.round(progress.percent ?? 0)}%`
        : progress.total > 1
          ? `${nf.format(progress.done)} / ${nf.format(progress.total)} fayl`
          : 'Ögirilmoqda…';
  return (
    <div className="space-y-2.5" aria-live="polite">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
          <span className="tabular-nums">{label}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--danger)] px-2 py-1 rounded-md cursor-pointer"
        >
          Bekor qiliş
        </button>
      </div>
      <div
        className="h-2 rounded-full bg-[var(--bg-surface-raised)] overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full bg-[var(--accent)] rounded-full transition-[width] duration-200" style={{ width: `${pct}%` }} />
      </div>
      {progress.current && progress.total > 1 && (
        <p className="text-xs text-[var(--text-tertiary)] truncate" title={progress.current}>
          {progress.current}
        </p>
      )}
    </div>
  );
};

const PREVIEWABLE = new Set(['docx', 'xlsx', 'pptx', 'odf', 'rtf', 'html', 'text', 'markdown']);

const ResultPanel: React.FC<{
  result: ConvertResult;
  counts: Record<ReportItem['status'], number>;
  visible: ReportItem[];
  onlyProblems: boolean;
  setOnlyProblems: (v: boolean) => void;
  onDownload: () => void;
  onDownloadItem: (path: string) => void;
  onPreview: (path: string | null) => void;
}> = ({ result, counts, visible, onlyProblems, setOnlyProblems, onDownload, onDownloadItem, onPreview }) => {
  const single = !result.isArchive ? result.report[0] : null;
  const problems = counts.error + counts.skipped;
  const canPreview = (path: string) => PREVIEWABLE.has(kindOf(path));
  return (
    <div className="flex-1 flex flex-col gap-4 min-h-0">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)]">
        <div className="w-11 h-11 rounded-xl bg-[var(--success)]/12 text-[var(--success)] flex items-center justify-center shrink-0">
          {result.isArchive ? <FileArchive className="w-5 h-5" /> : <FileCheck2 className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)] break-all line-clamp-2" title={result.filename}>
            {result.filename}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {formatFileSize(result.blob.size)} · {nf.format(result.stats.changed)} ta özgariş
          </p>
        </div>
      </div>

      <div className={`grid gap-2 ${single && canPreview(single.path) ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {single && canPreview(single.path) && (
          <button
            type="button"
            onClick={() => onPreview(null)}
            className="h-11 rounded-xl border border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent-subtle)] hover:bg-[var(--accent)]/15 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Eye className="w-4 h-4" />
            Körish
          </button>
        )}
        <button
          type="button"
          onClick={onDownload}
          className="h-11 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)] text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)]"
        >
          <Download className="w-4 h-4" />
          {result.isArchive ? 'Arxivni yuklab oliş' : 'Yuklab oliş'}
        </button>
      </div>

      {single && single.status !== 'converted' && (
        <p className="text-xs text-[var(--text-secondary)] text-center">{single.message}</p>
      )}


      {result.isArchive && (
        <>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-[var(--text-secondary)]">
              {nf.format(counts.converted)} / {nf.format(result.report.length)} ögirildi
            </p>
            {problems > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyProblems}
                  onChange={(e) => setOnlyProblems(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Muammolilar ({problems})
              </label>
            )}
          </div>

          <ul className="flex-1 min-h-[120px] max-h-[320px] overflow-y-auto rounded-xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {visible.map((item) => {
              const meta = STATUS_META[item.status];
              const previewable = item.status !== 'error' && item.status !== 'skipped' && canPreview(item.path);
              return (
                <li key={item.path} className="flex items-center gap-1 px-1.5 py-1 text-xs">
                  <button
                    type="button"
                    disabled={!previewable}
                    onClick={() => onPreview(item.path)}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left px-1.5 py-1 rounded-lg enabled:hover:bg-[var(--bg-surface-raised)] enabled:cursor-pointer disabled:cursor-default"
                    title={previewable ? 'Özgarişlar bilan körish' : item.message}
                  >
                    <meta.Icon className={`w-4 h-4 shrink-0 ${meta.cls}`} aria-label={meta.label} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[var(--text-primary)]">{item.path}</span>
                      {item.message && <span className="block text-[var(--text-tertiary)] truncate">{item.message}</span>}
                    </span>
                    {previewable && <Eye className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadItem(item.path)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] rounded-md cursor-pointer shrink-0"
                    title="Faqat şu faylni yuklab oliş"
                    aria-label={`${item.path} — yuklab oliş`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
