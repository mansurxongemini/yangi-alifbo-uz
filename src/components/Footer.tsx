import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[var(--border-subtle)] py-4 mt-auto transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
        <span>Oʻzbek Alifbosi</span>
        <span>Oflayn va xavfsiz</span>
      </div>
    </footer>
  );
};
