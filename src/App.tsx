import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Converter } from './components/Converter';
import { Footer } from './components/Footer';
import { HelpGuideModal, HelpTab } from './components/HelpGuideModal';
import { ContactModal } from './components/ContactModal';
import { DownloadsPage } from './components/DownloadsPage';
import { isDesktopApp, isNative } from './utils/platform';

// Oddiy marshrut: #/yuklab-olish — dasturlar sahifasi (desktop/Android ilovaning o'zida ko'rsatilmaydi)
const DOWNLOADS_HASH = '#/yuklab-olish';
const showDownloads = () => !isNative() && !isDesktopApp();

export const App: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [helpTab, setHelpTab] = useState<HelpTab>('table');
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [route, setRoute] = useState(() => window.location.hash);

  useEffect(() => {
    const on = () => {
      setRoute(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const onDownloads = route === DOWNLOADS_HASH && showDownloads();
  const goHome = () => {
    window.location.hash = '';
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleOpenHelp = (tab: HelpTab = 'table') => {
    setHelpTab(tab);
    setIsHelpOpen(true);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col text-[var(--text-primary)] font-sans">
      <Header
        onOpenTable={() => handleOpenHelp('table')}
        onOpenGuide={() => handleOpenHelp('files')}
        downloadsHref={showDownloads() ? DOWNLOADS_HASH : undefined}
        onDownloadsPage={onDownloads}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      
      <main id="main" className="flex-1 flex flex-col">
        {/* Konvertor sahifadan chiqib ketganda ham holatini saqlashi uchun yashiriladi, o'chirilmaydi */}
        <div hidden={onDownloads}>
          <Converter onOpenTable={() => handleOpenHelp('table')} />
        </div>
        {onDownloads && <DownloadsPage onBack={goHome} />}
      </main>

      <Footer
        onOpenHelp={handleOpenHelp}
        onOpenContact={() => setIsContactOpen(true)}
        downloadsHref={showDownloads() ? DOWNLOADS_HASH : undefined}
      />

      {/* Apple/Google darajasidagi Yordam va Qoʻllanma modali */}
      <HelpGuideModal
        isOpen={isHelpOpen}
        initialTab={helpTab}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Aloqa va Takliflar modali */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
};

export default App;
