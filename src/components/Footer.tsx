import React from 'react';
import { HelpTab } from './HelpGuideModal';

interface FooterProps {
  onOpenHelp?: (tab: HelpTab) => void;
  onOpenContact?: () => void;
}

const link = 'hover:text-[var(--text-primary)] transition-colors cursor-pointer';

export const Footer: React.FC<FooterProps> = ({ onOpenHelp, onOpenContact }) => (
  <footer className="mt-auto">
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[13px] text-[var(--text-secondary)]">
      <p className="text-[var(--text-tertiary)]">© Özbek Alifbosi</p>
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Qöşimça">
        <button type="button" onClick={() => onOpenHelp?.('table')} className={link}>Alifbo jadvali</button>
        <button type="button" onClick={() => onOpenHelp?.('rules')} className={link}>Imlo qoidalari</button>
        <button type="button" onClick={() => onOpenHelp?.('privacy')} className={link}>Maxfiylik</button>
        <button type="button" onClick={() => onOpenContact?.()} className={link}>Aloqa</button>
      </nav>
    </div>
  </footer>
);
