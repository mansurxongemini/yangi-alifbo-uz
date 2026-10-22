import React from 'react';
import { BookOpen, Moon, Sun } from 'lucide-react';

interface Props {
  onOpenTable: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export const Header: React.FC<Props> = ({ onOpenTable, isDark, toggleTheme }) => {
  return (
    <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] sticky top-0 z-40 transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl bg-[#1EA0D2] flex items-center justify-center text-white font-bold font-sans text-sm select-none shrink-0 shadow-xs"
            aria-hidden="true"
          >
            Öğ
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Özbek Alifbosi
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenTable}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1EA0D2] focus-visible:outline-none"
            title="Alifbo jadvali"
            aria-label="Alifbo jadvali"
          >
            <BookOpen className="w-4 h-4 text-[var(--text-primary)]" />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1EA0D2] focus-visible:outline-none"
            aria-label={isDark ? "Yoruğ rejimga ötiş" : "Qoronği rejimga ötiş"}
            title={isDark ? "Yoruğ rejimga ötiş" : "Qoronği rejimga ötiş"}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[#F59E0B]" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--text-primary)]" />
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
