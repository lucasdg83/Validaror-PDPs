import React from 'react';
import { BookOpen } from 'lucide-react';

interface HeaderProps {
  onOpenSpecs: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSpecs }) => {
  return (
    <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-end">
        <div className="flex items-center gap-3">
          <button
            id="btn-open-specs-guide"
            onClick={onOpenSpecs}
            className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/30 rounded-xl transition-all shadow-sm backdrop-blur-md active:scale-95"
            title="Abrir Guía y Editor de Especificaciones Técnicas"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Guía & Editor de Specs</span>
          </button>
        </div>
      </div>
    </header>
  );
};

