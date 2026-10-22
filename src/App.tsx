import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Converter } from './components/Converter';
import { Footer } from './components/Footer';
import { HelpGuideModal, HelpTab } from './components/HelpGuideModal';
import { ContactModal } from './components/ContactModal';

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
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] font-sans transition-colors duration-200">
      <Header
        onOpenTable={() => handleOpenHelp('table')}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-1 flex flex-col justify-center">
        <Converter onOpenTable={() => handleOpenHelp('table')} />
      </main>

      <Footer
        onOpenHelp={handleOpenHelp}
        onOpenContact={() => setIsContactOpen(true)}
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
