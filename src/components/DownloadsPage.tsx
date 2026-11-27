import React, { useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Copy, Download, Laptop, Monitor, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import manifest from '../data/downloads.json';
import { formatFileSize } from '../utils/fileConverter';

type OsId = 'windows' | 'linux' | 'android';

interface FileInfo {
  id: string;
  os: string;
  label: string;
  file: string;
  format: string;
  size: number;
  sha256: string;
  url: string;
}

const META: Record<string, { Icon: typeof Monitor; req: string; steps: string[] }> = {
  windows: {
    Icon: Monitor,
    req: 'Windows 10 / 11, 64-bit',
    steps: [
      'ZIP arxivni yuklab oling va istalgan papkaga oçing.',
      '«Ozbek Alifbosi» papkasidagi ozbek-alifbosi.exe ni işga tuşiring — örnatiş şart emas.',
      'Windows ogohlantiriş körsatsa: «Batafsil» → «Baribir işga tuşiriş».',
    ],
  },
  'linux-appimage': {
    Icon: Laptop,
    req: 'Har qanday 64-bit Linux',
    steps: [
      'Faylni yuklab oling.',
      'Xususiyatlar → «Dastur sifatida işga tuşirişga ruxsat» yoki terminalda: chmod +x ozbek-alifbosi-*.AppImage',
      'Faylni ikki marta bosib oçing.',
    ],
  },
  'linux-deb': {
    Icon: Laptop,
    req: 'Ubuntu 20.04+, Debian 11+, Mint',
    steps: ['Faylni yuklab oling.', 'Terminalda: sudo apt install ./ozbek-alifbosi-*.deb', 'Dastur menyusidan «Özbek Alifbosi» ni oçing.'],
  },
  android: {
    Icon: Smartphone,
    req: 'Android 6.0 va yangilari',
    steps: [
      'APK faylni telefonda yuklab oling.',
      'Faylni oçing; telefon sörasa, «Nomaʼlum manbalardan örnatiş»ga ruxsat bering.',
      '«Özbek Alifbosi» ilovasini oçing. Natijalar Documents/Yangi Alifbo papkasiga saqlanadi.',
    ],
  },
};

const detectOs = (): OsId | null => {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux|X11/i.test(ua)) return 'linux';
  return null;
};

const Sha: React.FC<{ value: string }> = ({ value }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        });
      }}
      className="group inline-flex items-center gap-1.5 max-w-full text-[11px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"
      title={`SHA-256: ${value} (nusxa oliş)`}
    >
      <span className="truncate">SHA-256 {value.slice(0, 16)}…</span>
      {ok ? <Check className="w-3 h-3 text-[var(--success)] shrink-0" /> : <Copy className="w-3 h-3 shrink-0 opacity-60 group-hover:opacity-100" />}
    </button>
  );
};

const Card: React.FC<{ f: FileInfo; primary?: boolean }> = ({ f, primary }) => {
  const m = META[f.id];
  const [open, setOpen] = useState(false);
  return (
    <div className={`flex flex-col rounded-2xl bg-[var(--bg-panel)] p-5 sm:p-6 ${primary ? 'shadow-[var(--shadow-pop)] ring-1 ring-[var(--accent)]/30' : 'shadow-[var(--shadow-card)]'}`}>
      <div className="flex items-start gap-4">
        <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${primary ? 'bg-[var(--accent)] text-[var(--accent-text-on)]' : 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)]'}`}>
          <m.Icon className="w-6 h-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{f.label}</p>
          <p className="text-sm text-[var(--text-secondary)]">{m.req}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-[var(--text-tertiary)] tabular-nums">
        {f.format} · {formatFileSize(f.size)} · v{manifest.version}
      </p>
      <a
        href={f.url}
        download={f.file}
        className={`press mt-4 h-11 rounded-xl inline-flex items-center justify-center gap-2 text-sm font-semibold ${
          primary
            ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text-on)]'
            : 'bg-[var(--bg-surface-raised)] hover:bg-[var(--accent-subtle)] text-[var(--text-primary)] hover:text-[var(--accent)]'
        }`}
      >
        <Download className="w-4 h-4" /> Yuklab oliş
      </a>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
      >
        Qanday örnatiladi <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)] list-decimal pl-5">
          {m.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      <div className="mt-auto pt-4">
        <Sha value={f.sha256} />
      </div>
    </div>
  );
};

export const DownloadsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const files = manifest.files as FileInfo[];
  const os = useMemo(detectOs, []);
  const recommended = files.find((f) => f.os === os) ?? null;
  const rest = files.filter((f) => f !== recommended);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-20">
      <button type="button" onClick={onBack} className="press inline-flex items-center gap-1.5 h-9 px-3 -ml-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-panel)] cursor-pointer">
        <ArrowLeft className="w-4 h-4" /> Konvertorga qaytiş
      </button>

      <div className="rise mt-6 max-w-[720px]">
        <h1 className="text-[32px] sm:text-[44px] leading-[1.1] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
          Kompyuter va telefon uçun dastur
        </h1>
        <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
          Saytdagi barça imkoniyatlar — internetsiz. Hujjatlar faqat sizning qurilmangizda qayta işlanadi.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-2"><WifiOff className="w-4 h-4 text-[var(--accent)]" /> Internet kerak emas</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[var(--accent)]" /> Tarmoqqa ulanmaydi</span>
          <span className="inline-flex items-center gap-2 tabular-nums">Versiya {manifest.version} · {manifest.date}</span>
        </div>
      </div>

      {recommended && (
        <section className="rise rise-1 mt-10" aria-label="Sizning qurilmangiz uçun">
          <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Sizning qurilmangiz uçun</p>
          <div className="max-w-[520px]">
            <Card f={recommended} primary />
          </div>
        </section>
      )}

      <section className="rise rise-2 mt-10" aria-label="Barça platformalar">
        {recommended && <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">Boşqa platformalar</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(recommended ? rest : files).map((f) => (
            <Card key={f.id} f={f} />
          ))}
        </div>
        {!os && (
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            macOS va iPhone uçun dastur hozirça yöq — saytning özidan foydalaning, u ham internetsiz işlaydi.
          </p>
        )}
      </section>

      <p className="mt-10 text-xs text-[var(--text-tertiary)] max-w-[720px] leading-relaxed">
        Fayl butunligini tekşiriş uçun SHA-256 yiğindisini nusxalab, yuklangan fayl bilan soliştiring
        (Windows: <code>certutil -hashfile fayl SHA256</code>, Linux: <code>sha256sum fayl</code>).
      </p>
    </div>
  );
};
