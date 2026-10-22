import React from 'react';
import { HelpTab } from './HelpGuideModal';

interface FooterProps {
  onOpenHelp?: (tab: HelpTab) => void;
  onOpenContact?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHelp, onOpenContact }) => {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-panel)] py-5 mt-auto transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">

        {/* Brand / Copyright */}
        <div className="text-center md:text-left select-none">
          <span className="font-semibold text-[var(--text-primary)]">Oʻzbek Lotin Alifbosi</span>
          <span className="mx-2 text-[var(--border-subtle)]">&middot;</span>
        </div>

        {/* Apple-style Minimalist Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => onOpenHelp?.('table')}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Alifbo jadvali
          </button>

          <button
            type="button"
            onClick={() => onOpenHelp?.('rules')}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Imlo qoidalari
          </button>

          <button
            type="button"
            onClick={() => onOpenHelp?.('files')}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Hujjatlar
          </button>

          <button
            type="button"
            onClick={() => onOpenContact?.()}
            className="hover:text-[#1EA0D2] transition-colors cursor-pointer"
          >
            Aloqa
          </button>

          <button
            type="button"
            onClick={() => onOpenHelp?.('privacy')}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Maxfiylik
          </button>
        </div>

      </div>
    </footer>
  );
};
