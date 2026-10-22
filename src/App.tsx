import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Converter } from './components/Converter';
import { Footer } from './components/Footer';
import { AlphabetTableModal } from './components/AlphabetTableModal';

export const App: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [isTableOpen, setIsTableOpen] = useState<boolean>(false);

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

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] font-sans transition-colors duration-200">
      <Header
        onOpenTable={() => setIsTableOpen(true)}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />
      
      <main className="flex-1 flex flex-col justify-center">
        <Converter onOpenTable={() => setIsTableOpen(true)} />
      </main>

      <Footer />

      <AlphabetTableModal
        isOpen={isTableOpen}
        onClose={() => setIsTableOpen(false)}
      />
    </div>
  );
};

export default App;
