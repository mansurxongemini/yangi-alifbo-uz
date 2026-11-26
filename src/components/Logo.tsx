import React from 'react';

/** Brend belgisi: geometrik «Ö» (shriftga bogʻliq emas). */
export const LogoMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
    <rect width="512" height="512" rx="116" fill="var(--accent)" />
    <circle cx="256" cy="296" r="102" fill="none" stroke="var(--accent-text-on)" strokeWidth="50" />
    <circle cx="206" cy="130" r="30" fill="var(--accent-text-on)" />
    <circle cx="306" cy="130" r="30" fill="var(--accent-text-on)" />
  </svg>
);
