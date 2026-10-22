import React, { useEffect, useRef } from 'react';
import { ALPHABET_DATA } from '../core/alphabetData';
import { X, BookOpen, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AlphabetTableModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Esc tugmasi va fokus boshqaruvi
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Fokusni modal ichida qamash (focus trap)
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Modal ochilganda yopish tugmasiga fokus berish
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    // Body scrollni toʻxtatish
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alphabet-modal-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-panel)] rounded-2xl shadow-2xl border border-[var(--border-subtle)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[#1EA0D2]/15 text-[#0A6E99] dark:text-[#1EA0D2] flex items-center justify-center border border-[#1EA0D2]/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 id="alphabet-modal-title" className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
                Oʻzbek Alifbosi Jadvali
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                28 ta harf va 1 ta tutuq belgisi — rasmiy qonun standarti
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] rounded-[8px] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1EA0D2] focus-visible:outline-none"
            aria-label="Jadvalni yopish"
            title="Yopish (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* 4 ta takomillashtirilgan harf haqida aksent blok */}
          <div className="p-3.5 rounded-xl bg-[#1EA0D2]/10 dark:bg-[#1EA0D2]/15 border border-[#1EA0D2]/30 text-xs text-[var(--text-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0A6E99] dark:text-[#1EA0D2] shrink-0" />
              <span className="font-semibold text-[#0A6E99] dark:text-[#1EA0D2]">
                Takomillashtirilgan 4 ta harf:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-panel)] font-mono font-bold text-[#0A6E99] dark:text-[#1EA0D2] border border-[#1EA0D2]/30 shadow-2xs">
                Oʻ oʻ → Ö ö
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-panel)] font-mono font-bold text-[#0A6E99] dark:text-[#1EA0D2] border border-[#1EA0D2]/30 shadow-2xs">
                Gʻ gʻ → Ğ ğ
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-panel)] font-mono font-bold text-[#0A6E99] dark:text-[#1EA0D2] border border-[#1EA0D2]/30 shadow-2xs">
                Sh sh → Ş ş
              </span>
              <span className="px-2.5 py-1 rounded-md bg-[var(--bg-panel)] font-mono font-bold text-[#0A6E99] dark:text-[#1EA0D2] border border-[#1EA0D2]/30 shadow-2xs">
                Ch ch → Ç ç
              </span>
            </div>
          </div>

          {/* Jadval */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-subtle)] text-xs uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">№</th>
                  <th className="py-3 px-4">Kirill muqobili</th>
                  <th className="py-3 px-4">Eski Lotin</th>
                  <th className="py-3 px-4">Yangi Lotin</th>
                  <th className="py-3 px-4">Harf nomi</th>
                  <th className="py-3 px-4 text-center">Holati</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs sm:text-sm">
                {ALPHABET_DATA.map((item, idx) => {
                  const isChanged = ['Ö', 'Ğ', 'Ş', 'Ç'].includes(item.char);
                  return (
                    <tr
                      key={item.char}
                      className={
                        isChanged
                          ? 'bg-[#1EA0D2]/10 dark:bg-[#1EA0D2]/15 font-medium'
                          : 'hover:bg-[var(--bg-surface-raised)]/50 transition-colors'
                      }
                    >
                      <td className="py-2.5 px-3 text-center text-[var(--text-tertiary)] font-mono text-xs tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-primary)] font-mono">
                        {item.cyrillic}
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)] font-mono">
                        {item.oldLatin}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold">
                        <span className={isChanged ? 'text-[#0A6E99] dark:text-[#1EA0D2] font-bold text-base' : 'text-[var(--text-primary)]'}>
                          {item.newLatin}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                        {item.name}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {isChanged ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1EA0D2]/20 text-[#0A6E99] dark:text-[#1EA0D2] border border-[#1EA0D2]/40">
                            Takomillashtirildi
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-[var(--text-tertiary)]">
                            Asl holatda
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/40 text-xs text-[var(--text-secondary)]">
          <span>Yopish uchun <strong>Esc</strong> tugmasini bosing</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#0A6E99] hover:bg-[#085577] dark:bg-[#1EA0D2] dark:text-[#0B0D10] dark:hover:bg-[#38B4E3] rounded-[8px] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1EA0D2] focus-visible:outline-none"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};
