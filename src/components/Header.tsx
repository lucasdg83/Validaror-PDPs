import React from 'react';
import { BookOpen } from 'lucide-react';

interface HeaderProps {
  onOpenSpecs: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSpecs }) => {
  return (
    <header className="w-full border-b border-white/10 bg-black/30 backdrop-blur-md sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Logo element removed as requested */}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            id="btn-open-specs-guide"
            onClick={onOpenSpecs}
            className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all shadow-sm backdrop-blur-md"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="hidden xs:inline">Guía de Specs</span>
            <span className="xs:hidden">Specs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
