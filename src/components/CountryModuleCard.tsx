import React from 'react';
import { CountryInfo } from '../types';
import { FolderSearch, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface CountryModuleCardProps {
  country: CountryInfo;
  onSelect: (country: CountryInfo) => void;
  onEditSpecs?: (country: CountryInfo) => void;
  isLoading?: boolean;
}

export const CountryModuleCard: React.FC<CountryModuleCardProps> = ({
  country,
  onSelect,
  onEditSpecs,
  isLoading,
}) => {
  const isPending = country.status === 'pending';
  const retailerNames = country.description.split(', ').map((s) => s.trim());

  return (
    <div
      id={`card-pdp-${country.code.toLowerCase()}`}
      className="group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl border transition-all duration-300 backdrop-blur-xl bg-white/[0.03] border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-indigo-500/10"
    >
      {/* Top row: Flag + Code + Specs button */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl shadow-inner group-hover:scale-105 transition-transform select-none">
            {country.flag}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
              PDP {country.code}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onEditSpecs && (
            <button
              type="button"
              title={`Configurar especificaciones técnicas de ${country.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onEditSpecs(country);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 transition-all text-xs font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Specs</span>
            </button>
          )}
        </div>
      </div>

      {/* Retailers preview tags */}
      <div className="mb-5 flex-grow">
        <div className="flex flex-wrap gap-1.5">
          {retailerNames.slice(0, 5).map((ret, i) => (
            <span
              key={i}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5"
            >
              {ret}
            </span>
          ))}
          {retailerNames.length > 5 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5 font-mono">
              +{retailerNames.length - 5} más
            </span>
          )}
        </div>
      </div>

      {/* Main Action Button */}
      <button
        id={`btn-analizar-${country.code.toLowerCase()}`}
        onClick={() => onSelect(country)}
        disabled={isLoading}
        className="w-full relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-400/30 active:scale-[0.98]"
      >
        <FolderSearch className="w-4 h-4 text-white" />
        <span>Validar Carpeta</span>
        <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};


