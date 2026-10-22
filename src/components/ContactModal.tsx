import React, { useEffect } from 'react';
import {
  X,
  MessageCircle,
  Mail,
  Send,
  ExternalLink,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="h-14 px-5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#1EA0D2]/15 text-[#1EA0D2] flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              Aloqa va Takliflar
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] rounded-xl transition-colors cursor-pointer"
            aria-label="Yopiş"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 select-text">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Ilovani yanada takomillaştiriş böyiça takliflaringiz yoki xatoliklar haqida xabar beriş uçun quyidagi kanallardan foydalanişingiz mumkin:
          </p>

          {/* Aloqa kartalari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

            {/* Telegram */}
            <a
              href="https://t.me/mansurxonrustamov"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:col-span-2 p-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[#1EA0D2]/10 border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-[#1EA0D2]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Telegram</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">@mansurxonrustamov</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[#1EA0D2] transition-colors" />
            </a>

            {/* Email */}
            <a
              href="mailto:r.mansurxon01@gmail.com"
              className="sm:col-span-2 p-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[#1EA0D2]/10 border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#1EA0D2]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Elektron poçta</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">r.mansurxon01@gmail.com</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[#1EA0D2] transition-colors" />
            </a>

          </div>

        </div>


      </div>
    </div>
  );
};
