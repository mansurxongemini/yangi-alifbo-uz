import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Upload,
  ArrowRightLeft,
  X,
  FileText,
  FileArchive,
  ChevronDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  eskiLotinToYangiLotin,
  kirillToYangiLotin,
  yangiLotinToEskiLotin,
  yangiLotinToKirill,
  autoTransliterate,
} from '../core/transliterate';
import { detectScript } from '../core/detector';
import {
  processUploadedFile,
  ConvertResult,
  ConvertedItem,
  formatFileSize,
  SourceScript,
  TargetScript,
} from '../utils/fileConverter';

interface ConverterProps {
  onOpenTable?: () => void;
}

interface UploadedFileInfo {
  file: File;
  name: string;
  size: number;
  extension: string;
}

// 1-rasmdagi minimalist keycap harflari:
// Oʻ Gʻ Ş Ç   oʻ gʻ ş ç   ʻ ʼ -
const KEYCAP_LETTERS = [
  { label: 'Oʻ', char: 'Oʻ' },
  { label: 'Gʻ', char: 'Gʻ' },
  { label: 'Ş', char: 'Ş' },
  { label: 'Ç', char: 'Ç' },
  { label: 'oʻ', char: 'oʻ' },
  { label: 'gʻ', char: 'gʻ' },
  { label: 'ş', char: 'ş' },
  { label: 'ç', char: 'ç' },
  { label: 'ʻ', char: 'ʻ' },
  { label: 'ʼ', char: 'ʼ' },
  { label: '-', char: '-' },
];

export const Converter: React.FC<ConverterProps> = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputText, setOutputText] = useState<string>('');
  const [sourceScript, setSourceScript] = useState<SourceScript>('auto');
  const [targetScript, setTargetScript] = useState<TargetScript>('new_latin');
  const [copied, setCopied] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Fayl yuklash (Inline - Modalsiz) statelari
  const [uploadedFile, setUploadedFile] = useState<UploadedFileInfo | null>(null);
  const [isConvertingFile, setIsConvertingFile] = useState<boolean>(false);
  const [convertResult, setConvertResult] = useState<ConvertResult | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Matn transliteratsiyasi (agar oddiy matn boʻlsa)
  useEffect(() => {
    if (uploadedFile) return;

    if (!inputText.trim()) {
      setOutputText('');
      return;
    }

    let result = '';
    if (sourceScript === 'auto') {
      const autoRes = autoTransliterate(inputText, 'new_latin');
      result = autoRes.result;
    } else if (sourceScript === 'eski_lotin' && targetScript === 'new_latin') {
      result = eskiLotinToYangiLotin(inputText);
    } else if (sourceScript === 'cyrillic' && targetScript === 'new_latin') {
      result = kirillToYangiLotin(inputText);
    } else if (sourceScript === 'new_latin' && targetScript === 'eski_lotin') {
      result = yangiLotinToEskiLotin(inputText);
    } else if (sourceScript === 'new_latin' && targetScript === 'cyrillic') {
      result = yangiLotinToKirill(inputText);
    } else {
      result = eskiLotinToYangiLotin(inputText);
    }

    setOutputText(result);
  }, [inputText, sourceScript, targetScript, uploadedFile]);

  // Manba oʻzgarganda
  const handleSourceChange = (newSource: SourceScript) => {
    setSourceScript(newSource);
    if (newSource === 'auto' || newSource === 'eski_lotin' || newSource === 'cyrillic') {
      setTargetScript('new_latin');
    } else if (newSource === 'new_latin') {
      if (targetScript === 'new_latin') {
        setTargetScript('eski_lotin');
      }
    }
  };

  // Natija oʻzgarganda
  const handleTargetChange = (newTarget: TargetScript) => {
    setTargetScript(newTarget);
    if (newTarget === 'eski_lotin' || newTarget === 'cyrillic') {
      setSourceScript('new_latin');
    } else if (newTarget === 'new_latin') {
      if (sourceScript === 'new_latin') {
        setSourceScript('auto');
      }
    }
  };

  // ⇄ Yoʻnalishni almashtirish
  const handleSwap = () => {
    if (uploadedFile) {
      // Agar fayl yuklangan boʻlsa, yoʻnalishni oʻzgartirish
      const nextSource: SourceScript = sourceScript === 'new_latin' ? 'eski_lotin' : 'new_latin';
      const nextTarget: TargetScript = nextSource === 'new_latin' ? 'eski_lotin' : 'new_latin';
      setSourceScript(nextSource);
      setTargetScript(nextTarget);
      setConvertResult(null);
      return;
    }

    const nextInput = outputText;
    let nextSource: SourceScript = 'new_latin';
    let nextTarget: TargetScript = 'new_latin';

    if (sourceScript === 'auto') {
      nextSource = 'new_latin';
      const detection = detectScript(inputText);
      nextTarget = detection.detectedScript === 'cyrillic' ? 'cyrillic' : 'eski_lotin';
    } else if (sourceScript === 'eski_lotin') {
      nextSource = 'new_latin';
      nextTarget = 'eski_lotin';
    } else if (sourceScript === 'cyrillic') {
      nextSource = 'new_latin';
      nextTarget = 'cyrillic';
    } else if (sourceScript === 'new_latin') {
      nextSource = targetScript === 'cyrillic' ? 'cyrillic' : 'eski_lotin';
      nextTarget = 'new_latin';
    }

    setSourceScript(nextSource);
    setTargetScript(nextTarget);
    if (nextInput) {
      setInputText(nextInput);
    }
  };

  // Kursor oʻrniga belgi qoʻyish
  const insertChar = (char: string) => {
    const el = textareaRef.current;
    if (!el) {
      setInputText((prev) => prev + char);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const current = inputText;
    const updated = current.substring(0, start) + char + current.substring(end);
    setInputText(updated);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  // Matndan nusxalash
  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = outputText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Natija matnini .txt sifatida yuklab olish
  const handleDownloadText = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `yangi-alifbo-${new Date().toISOString().slice(0, 10)}.txt`);
  };

  // Umumiy blob yuklab berish funksiyasi
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Fayl tanlash
  const handleFileSelect = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    setUploadedFile({
      file,
      name: file.name,
      size: file.size,
      extension: ext,
    });
    setConvertResult(null);
    setConvertError(null);
  };

  // Faylni oʻgirish (foydalanuvchi "Oʻgirish"ni bosganda ishlaydi)
  const handleConvertFile = async () => {
    if (!uploadedFile) return;
    setIsConvertingFile(true);
    setConvertError(null);
    try {
      const res = await processUploadedFile(
        uploadedFile.file,
        sourceScript,
        targetScript
      );
      setConvertResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Faylni oʻgirishda xatolik yuz berdi.';
      setConvertError(msg);
    } finally {
      setIsConvertingFile(false);
    }
  };

  // Faylni olib tashlash va matn rejimiga qaytish
  const handleClearFile = () => {
    setUploadedFile(null);
    setConvertResult(null);
    setConvertError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-4">
      
      {/* Yashirin fayl kiritish inputi */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.docx,.zip"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
        className="hidden"
        id="file-upload-input"
      />

      {/* ===================== 1) REJIMLAR TANLASH (1-RASM USLUBIDAGI DROPDOWNLAR) ===================== */}
      <div className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] p-2 shadow-xs flex items-center justify-between gap-2 sm:gap-4 transition-colors">
        
        {/* Chap: Manba dropdown va alohida Fayl yuklash tugmasi */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1EA0D2] bg-[#1EA0D2]/10 hover:bg-[#1EA0D2]/20 border border-[#1EA0D2]/30 rounded-xl transition-all cursor-pointer shrink-0"
            title="Word (.docx), Matn (.txt) yoki ZIP (.zip) fayl yuklash"
            aria-label="Fayl yuklash"
          >
            <Upload className="w-4 h-4 text-[#1EA0D2]" />
            <span className="hidden sm:inline">Fayl yuklash</span>
          </button>

          <div className="relative flex-1 max-w-[260px]">
            <select
              value={sourceScript}
              onChange={(e) => handleSourceChange(e.target.value as SourceScript)}
              className="w-full appearance-none bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 text-[var(--text-primary)] text-xs sm:text-sm font-medium rounded-xl py-2 pl-3 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1EA0D2]"
            >
              <option value="auto">Avto-aniqlash</option>
              <option value="eski_lotin">Eski lotin</option>
              <option value="cyrillic">Kirill</option>
              <option value="new_latin">Yangi lotin</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Markaz: ⇄ Almashish tugmasi */}
        <button
          type="button"
          onClick={handleSwap}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#1EA0D2] hover:bg-[#198cb8] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          title="Yoʻnalishni almashtirish"
          aria-label="Yoʻnalishni almashtirish"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        {/* Oʻng: Natija dropdown va fayl ikonkasi */}
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <div className="relative flex-1 max-w-[260px]">
            <select
              value={targetScript}
              onChange={(e) => handleTargetChange(e.target.value as TargetScript)}
              className="w-full appearance-none bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 text-[var(--text-primary)] text-xs sm:text-sm font-medium rounded-xl py-2 pl-3 pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1EA0D2]"
            >
              <option value="new_latin">Yangi lotin (Ö, Ğ, Ş, Ç)</option>
              <option value="eski_lotin">Eski lotin</option>
              <option value="cyrillic">Kirill</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <div
            className="p-2 sm:px-2.5 sm:py-2 text-[var(--text-tertiary)] bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl shrink-0 select-none"
            title="Natija formati"
          >
            <FileText className="w-4 h-4 text-[#1EA0D2]" />
          </div>
        </div>

      </div>

      {/* ===================== 2) ASOSIY MATN VA FAYL PANELLARI (1-RASM BOʻYICHA) ===================== */}
      <div 
        className="bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] shadow-xs overflow-hidden transition-colors relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] min-h-[420px]">
          
          {/* ===================== CHAP PANEL (KIRITISH) ===================== */}
          <div className="flex flex-col p-4 sm:p-5 relative">
            
            {/* Yuqori: Keycap harflar */}
            {!uploadedFile && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4">
                {KEYCAP_LETTERS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertChar(item.char)}
                    className="h-8 min-w-[32px] px-2 rounded-lg bg-[var(--bg-surface-raised)] hover:bg-[var(--accent-subtle)] border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 text-xs sm:text-sm font-medium text-[var(--text-primary)] transition-all cursor-pointer shadow-2xs active:scale-95"
                    title={`${item.label} harfini kiritish`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* FAYL YUKLANGAN BOʻLSA: INLINE FAYL KARTASI (MODALSIZ!) */}
            {uploadedFile ? (
              <div className="flex-1 flex flex-col justify-center items-center p-6 text-center animate-in fade-in duration-150">
                <div className="w-full max-w-md p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-left space-y-4">
                  
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-[#1EA0D2]/15 text-[#1EA0D2] flex items-center justify-center shrink-0">
                        {uploadedFile.extension === 'zip' ? (
                          <FileArchive className="w-6 h-6" />
                        ) : (
                          <FileText className="w-6 h-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate" title={uploadedFile.name}>
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider">
                          {uploadedFile.extension} &middot; {formatFileSize(uploadedFile.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Faylni bekor qilish"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {convertError && (
                    <p className="text-xs text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                      {convertError}
                    </p>
                  )}

                  {/* Oʻgirish tugmasi */}
                  {!convertResult && (
                    <button
                      type="button"
                      onClick={handleConvertFile}
                      disabled={isConvertingFile}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#1EA0D2] hover:bg-[#198cb8] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isConvertingFile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Oʻgirilmoqda...</span>
                        </>
                      ) : (
                        <span>Oʻgirish</span>
                      )}
                    </button>
                  )}

                  {convertResult && (
                    <div className="flex items-center gap-2 text-xs font-medium text-[var(--success)] bg-[var(--success)]/10 p-2 rounded-lg border border-[var(--success)]/20">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Fayl muvaffaqiyatli oʻgirildi!</span>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              /* ODDIY MATN KIRITISH MAYDONI */
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Matnni shu yerga yozing..."
                className="w-full flex-1 min-h-[320px] bg-transparent resize-none border-0 p-0 text-base sm:text-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed focus:outline-none"
                spellCheck="false"
              />
            )}

          </div>

          {/* ===================== OʻNG PANEL (NATIJA) ===================== */}
          <div className="flex flex-col p-4 sm:p-5 relative bg-[var(--bg-panel)]">
            
            {/* Yuqori oʻng burchak: Faqat 2 ta minimalist ikonkali tugma (1-rasmdek) */}
            <div className="flex items-center justify-end gap-1.5 mb-4">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputText && !convertResult}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Nusxalash"
                aria-label="Nusxalash"
              >
                {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (convertResult) {
                    downloadBlob(convertResult.blob, convertResult.newFilename);
                  } else {
                    handleDownloadText();
                  }
                }}
                disabled={!outputText && !convertResult}
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Yuklab olish"
                aria-label="Yuklab olish"
              >
                <Download className="w-4 h-4 text-[#1EA0D2]" />
              </button>
            </div>

            {/* FAYL NATIJASI BOʻLSA (INLINE) */}
            {uploadedFile && convertResult ? (
              <div className="flex-1 flex flex-col justify-center items-center p-6 text-center animate-in fade-in duration-150">
                <div className="w-full max-w-md p-5 rounded-2xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-left space-y-4">
                  
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[var(--success)]/15 text-[var(--success)] flex items-center justify-center shrink-0">
                      {convertResult.isArchive ? (
                        <FileArchive className="w-6 h-6" />
                      ) : (
                        <FileText className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate" title={convertResult.newFilename}>
                        {convertResult.newFilename}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        Tayyor &middot; {formatFileSize(convertResult.blob.size)}
                      </p>
                    </div>
                  </div>

                  {/* Asosiy yuklab olish tugmasi */}
                  <button
                    type="button"
                    onClick={() => downloadBlob(convertResult.blob, convertResult.newFilename)}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#1EA0D2] hover:bg-[#198cb8] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>{convertResult.isArchive ? 'Arxivni (.zip) yuklab olish' : 'Faylni yuklab olish'}</span>
                  </button>

                  {/* Agar ZIP arxiv boʻlsa: Har bir faylni alohida yuklab olish roʻyxati */}
                  {convertResult.isArchive && convertResult.archiveItems && convertResult.archiveItems.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-secondary)]">
                        Ichidagi fayllarni alohida yuklab olish:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {convertResult.archiveItems.map((item: ConvertedItem, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs"
                          >
                            <span className="truncate max-w-[200px] text-[var(--text-primary)]" title={item.filename}>
                              {item.filename}
                            </span>
                            <button
                              type="button"
                              onClick={() => downloadBlob(item.blob, item.filename)}
                              className="p-1 text-[#1EA0D2] hover:bg-[#1EA0D2]/10 rounded transition-colors cursor-pointer ml-2 shrink-0"
                              title="Ushbu faylni yuklab olish"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              /* ODDIY NATIJA MATN MAYDONI */
              <textarea
                readOnly
                value={outputText}
                placeholder="Oʻgirilgan matn bu yerda aks etadi..."
                className="w-full flex-1 min-h-[320px] bg-transparent resize-none border-0 p-0 text-base sm:text-lg text-[var(--text-primary)] placeholder-[var(--text-tertiary)] leading-relaxed focus:outline-none"
                spellCheck="false"
              />
            )}

          </div>

        </div>

        {/* Drag and Drop vizual holati */}
        {isDragOver && (
          <div className="absolute inset-0 z-30 bg-[var(--bg-panel)]/95 backdrop-blur-xs flex flex-col items-center justify-center border-2 border-dashed border-[#1EA0D2] rounded-2xl m-2">
            <Upload className="w-10 h-10 text-[#1EA0D2] mb-2 animate-bounce" />
            <p className="text-base font-semibold text-[var(--text-primary)]">
              Faylni shu yerga tashlang
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Word (.docx), Matn (.txt) yoki ZIP (.zip) arxivlari
            </p>
          </div>
        )}

      </div>

    </div>
  );
};
