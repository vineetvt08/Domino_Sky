import React from 'react';

/**
 * Accessible Skip-to-Content navigation link.
 * Hidden visually until focused via keyboard navigation (Tab key).
 */
export const SkipToContent: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-slate-900 focus:text-white focus:text-xs focus:font-bold focus:rounded-lg focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
    >
      Skip to main content (Alt+M)
    </a>
  );
};
