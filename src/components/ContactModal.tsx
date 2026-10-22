import React, { useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  Mail,
  Send,
  Check,
  Copy,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [feedbackText, setFeedbackText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

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

  const handleCopyFeedback = async () => {
    if (!feedbackText.trim()) return;
    const msg = `Oʻzbek Lotin Alifbosi Konvertori boʻyicha xatolik/taklif:\n\n${feedbackText}`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 select-text">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Ilovani yanada takomillashtirish boʻyicha takliflaringiz yoki xatoliklar haqida xabar berish uchun quyidagi kanallardan foydalanishingiz mumkin:
          </p>

          {/* Aloqa kartalari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* Telegram */}
            <a
              href="https://t.me/mansurxon_dev"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[#1EA0D2]/10 border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-[#1EA0D2]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Telegram</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">@mansurxon_dev</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[#1EA0D2] transition-colors" />
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/mansurxongemini/yangi-alifbo-uz"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[#1EA0D2]/10 border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Code2 className="w-4 h-4 text-[var(--text-primary)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">GitHub</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Issues & kod</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[#1EA0D2] transition-colors" />
            </a>

            {/* Email */}
            <a
              href="mailto:mansurxon.gemini@gmail.com"
              className="sm:col-span-2 p-3 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[#1EA0D2]/10 border border-[var(--border-subtle)] hover:border-[#1EA0D2]/40 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#1EA0D2]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Elektron pochta</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">mansurxon.gemini@gmail.com</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[#1EA0D2] transition-colors" />
            </a>

          </div>

          {/* Tezkor xatolik qoralamasi */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <label className="text-xs font-semibold text-[var(--text-primary)] block">
              Xatolik yoki taklif matnini tayyorlash:
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Masalan: Ushbu soʻzda tutuq belgisi xato qoʻyildi yoki yangi taklif..."
              rows={3}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl p-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[#1EA0D2] resize-none"
            />
            
            {feedbackText.trim() && (
              <button
                type="button"
                onClick={handleCopyFeedback}
                className="w-full py-2 px-3 rounded-xl bg-[#1EA0D2] hover:bg-[#198cb8] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Nusxalandi! Endi Telegramda yuborishingiz mumkin ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Matndan nusxa olish</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/30 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer"
          >
            Yopish
          </button>
        </div>

      </div>
    </div>
  );
};
