import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileText,
  ShieldCheck,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import { ALPHABET_DATA } from '../core/alphabetData';

export type HelpTab = 'table' | 'rules' | 'files' | 'privacy';

interface Props {
  isOpen: boolean;
  initialTab?: HelpTab;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'table',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Esc bosilganda yopish
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

  // Jadval qidiruvi
  const filteredAlphabet = ALPHABET_DATA.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.char.toLowerCase().includes(q) ||
      item.newLatin.toLowerCase().includes(q) ||
      item.oldLatin.toLowerCase().includes(q) ||
      item.cyrillic.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-150 select-none"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-[var(--bg-panel)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Apple-style Modal Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/40 flex flex-col gap-3">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1EA0D2]/15 text-[#1EA0D2] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                Qoʻllanma va Standartlar
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

          {/* Segmented Capsule Tabs (Apple style) */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs font-semibold overflow-x-auto no-scrollbar gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'table'
                  ? 'bg-[#1EA0D2] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Alifbo jadvali
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'rules'
                  ? 'bg-[#1EA0D2] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Imlo qoidalari
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-[#1EA0D2] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Hujjatlar (Word/ZIP)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-[#1EA0D2] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Maxfiylik
            </button>
          </div>

        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 select-text">
          
          {/* TAB 1: ALIFBO JADVALI */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Harf yoki talaffuz boʻyicha qidirish..."
                  className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[#1EA0D2]"
                />
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[var(--bg-surface-raised)]/70 border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Yangi lotin</th>
                      <th className="py-2.5 px-3">Eski lotin</th>
                      <th className="py-2.5 px-3">Kirill</th>
                      <th className="py-2.5 px-3">Izoh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
                    {filteredAlphabet.map((item, i) => {
                      const isChanged = ['Ö', 'Ğ', 'Ş', 'Ç'].includes(item.char);
                      return (
                        <tr
                          key={i}
                          className={`hover:bg-[var(--bg-surface-raised)]/50 transition-colors ${
                            isChanged ? 'bg-[#1EA0D2]/5 font-medium' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <span
                              className={`inline-block font-semibold ${
                                isChanged ? 'text-[#1EA0D2]' : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {item.newLatin}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{item.oldLatin}</td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{item.cyrillic}</td>
                          <td className="py-2 px-3 text-[11px] text-[var(--text-tertiary)]">
                            {isChanged ? (
                              <span className="px-1.5 py-0.5 rounded bg-[#1EA0D2]/15 text-[#1EA0D2] font-medium">
                                Yangi harf
                              </span>
                            ) : item.char === 'ʼ' ? (
                              'Tutuq belgisi'
                            ) : (
                              'Asl holatda'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: IMLO QOIDALARI */}
          {activeTab === 'rules' && (
            <div className="space-y-5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="p-4 rounded-xl bg-[#1EA0D2]/10 border border-[#1EA0D2]/25 text-[var(--text-primary)] flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#1EA0D2] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Oʻzbekiston Respublikasi rasmiy alifbo islohoti</h4>
                  <p className="text-xs mt-1 text-[var(--text-secondary)]">
                    Takomillashtirilgan alifboda qoʻshaloq va noqulay apostrofli 4 ta harf xalqaro standartdagi diakritik harflarga almashtirildi.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-[#1EA0D2]">Ö ö</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Oʻ oʻ oʻrniga</span>
                  </div>
                  <p className="text-xs">Misollar: <span className="font-semibold text-[var(--text-primary)]">ördek, böri, tögʻri &rarr; töğri</span></p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-[#1EA0D2]">Ğ ğ</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Gʻ gʻ oʻrniga</span>
                  </div>
                  <p className="text-xs">Misollar: <span className="font-semibold text-[var(--text-primary)]">ğalaba, togʻ &rarr; toğ, bağʻir &rarr; bağir</span></p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-[#1EA0D2]">Ş ş</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Sh sh oʻrniga</span>
                  </div>
                  <p className="text-xs">Misollar: <span className="font-semibold text-[var(--text-primary)]">şahar, quyoş, başqa</span></p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-[#1EA0D2]">Ç ç</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Ch ch oʻrniga</span>
                  </div>
                  <p className="text-xs">Misollar: <span className="font-semibold text-[var(--text-primary)]">çoy, aççiq, çiroq</span></p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2">
                <h5 className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-[#1EA0D2]" />
                  <span>Tutuq belgisi (ʼ) saqlanib qoldi:</span>
                </h5>
                <p className="text-xs">
                  Tutuq belgisi (<span className="font-semibold text-[var(--text-primary)]">ʼ</span> - U+02BC) mustaqil belgi sifatida oʻz oʻrnida qoladi.
                  Misollar: <span className="font-semibold text-[var(--text-primary)]">aʼlo, maʼno, taʼlim, Isʼhoq</span>.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: HUJJATLAR (WORD/ZIP) */}
          {activeTab === 'files' && (
            <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2">
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1EA0D2]" />
                  <span>Word (.docx) hujjatlari transliteratsiyasi</span>
                </h4>
                <p>
                  Ilova Word fayllarini oddiy matnga aylantirmaydi. Hujjat XML darajasida tahlil qilinadi:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[var(--text-primary)]">
                  <li>Jadvallar, ustunlar va qatorlar;</li>
                  <li>Qalin (bold), kursiv (italic), tagiga chizilgan stillar;</li>
                  <li>Shrift turlari va ranglari;</li>
                  <li>Paragraflar, sarlavhalar va tasvirlar <strong>100% oʻz holida saqlanadi</strong>.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2">
                <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#1EA0D2]" />
                  <span>ZIP arxivlari bilan ishlash</span>
                </h4>
                <p className="text-xs">
                  Agar siz koʻplab fayllardan iborat <strong>.zip</strong> arxiv yuklasangiz, ilova arxiv ichidagi barcha <code>.docx</code> va <code>.txt</code> fayllarni oʻgirib, yangi arxiv holida yoki har bir faylni alohida yuklab beradi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-1.5">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">Qanday foydalaniladi?</h4>
                <p className="text-xs">
                  Faylni shunchaki brauzer oynasiga sudrab tashlang (Drag & Drop) yoki tepada joylashgan hujjat belgisini bosing.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: MAXFIYLIK */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              <div className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/25 text-[var(--text-primary)] flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Toʻliq Maxfiylik va Oflayn Ishlash Kafolati</h4>
                  <p className="text-xs mt-1 text-[var(--text-secondary)]">
                    Ushbu ilova 100% mijoz brauzerida (client-side) ishlaydi. Siz kiritgan matnlar yoki yuklagan fayllar hech qachon hech qanday serverga yuborilmaydi.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] space-y-2">
                <h5 className="font-bold text-[var(--text-primary)]">Tashqi ulanishlar yoʻq:</h5>
                <p className="text-xs">
                  Ilovada hech qanday tashqi analitika, reklama, tashqi CDN yoki Google Fonts ulanishlari mavjud emas. Shriftlar va barcha kutubxonalar dastur ichida mustaqil joylashgan. Internet tarmogʻi uzilgan taqdirda ham ilovadan toʻliq foydalanish mumkin.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-raised)]/30 flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Oʻzbekiston Respublikasi &middot; Rasmiy imlo standarti
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--border-subtle)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] transition-all cursor-pointer"
          >
            Tushundim
          </button>
        </div>

      </div>
    </div>
  );
};
