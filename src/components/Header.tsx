import React from 'react';
import { BookOpenText, Moon, Sun } from 'lucide-react';
import { LogoMark } from './Logo';

interface Props {
  onOpenTable: () => void;
  onOpenGuide: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

const navBtn =
  'press h-9 px-3 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] cursor-pointer';

export const Header: React.FC<Props> = ({ onOpenTable, onOpenGuide, isDark, toggleTheme }) => (
  <header className="sticky top-0 z-40 bg-[var(--bg-app)]/85 backdrop-blur-md">
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:px-3 focus:py-2 focus:rounded-lg focus:bg-[var(--bg-panel)] focus:shadow"
    >
      Asosiy qismga ötiş
    </a>
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <a href="./" className="flex items-center gap-3 min-w-0" aria-label="Özbek Alifbosi — bosh sahifa">
        <LogoMark className="w-8 h-8 shrink-0" />
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Özbek Alifbosi</span>
      </a>

      <nav className="flex items-center gap-1" aria-label="Asosiy">
        <button type="button" onClick={onOpenTable} className={`${navBtn} hidden sm:inline-flex items-center`}>
          Alifbo jadvali
        </button>
        <button type="button" onClick={onOpenGuide} className={`${navBtn} hidden sm:inline-flex items-center`}>
          Qöllanma
        </button>
        <button
          type="button"
          onClick={onOpenTable}
          className={`${navBtn} sm:hidden w-9 px-0 inline-flex items-center justify-center`}
          aria-label="Alifbo jadvali"
        >
          <BookOpenText className="w-[18px] h-[18px]" />
        </button>
        <span className="w-px h-5 bg-[var(--border-subtle)] mx-1.5" aria-hidden="true" />
        <button
          type="button"
          onClick={toggleTheme}
          className={`${navBtn} w-9 px-0 inline-flex items-center justify-center`}
          aria-label={isDark ? 'Yoruğ mavzu' : 'Qoronği mavzu'}
          title={isDark ? 'Yoruğ mavzu' : 'Qoronği mavzu'}
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
      </nav>
    </div>
  </header>
);
