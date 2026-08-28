import React from 'react';
import { CountryInfo } from '../types';
import { FolderSearch, ChevronRight, SlidersHorizontal, AlertCircle, Database, Layers } from 'lucide-react';

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
  const isAdaptation = country.code === 'ADAPTACIONES' || country.isAdaptationModule;
  const isOpera = country.code === 'CHECK_OPERA' || country.isOperaModule;
  const retailerNames = country.description.split(', ').map((s) => s.trim());

  return (
    <div
      id={`card-pdp-${country.code.toLowerCase()}`}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
        isAdaptation
          ? 'bg-slate-950/40 border-slate-700/40 hover:border-amber-500/40 hover:bg-slate-900/50 shadow-none'
          : isOpera
          ? 'bg-white/[0.03] border-white/10 hover:border-pink-500/40 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-pink-500/10'
          : 'bg-white/[0.03] border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-indigo-500/10'
      }`}
    >
      {/* Corner Refinement Badge for Adaptaciones */}
      {isAdaptation && (
        <div className="absolute -top-3 -right-2 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-amber-500/50 text-amber-300 shadow-lg text-[10px] font-mono font-bold tracking-wider uppercase rotate-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            En Refinamiento
          </div>
        </div>
      )}

      {/* Top row: Flag + Code + Specs button */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-2xl sm:text-3xl shadow-inner group-hover:scale-105 transition-transform select-none ${
              isAdaptation
                ? 'bg-slate-800/60 border-slate-700/60 grayscale-[30%]'
                : isOpera
                ? 'bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-indigo-500/20 border-pink-500/30 text-pink-400'
                : 'bg-white/5 border-white/10'
            }`}
          >
            {isOpera ? (
              <div className="flex flex-col items-center justify-center">
                <Database className="w-6 h-6 text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.4)]" />
              </div>
            ) : (
              country.flag
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`text-lg sm:text-xl font-bold transition-colors ${
                  isAdaptation
                    ? 'text-slate-300 group-hover:text-slate-100'
                    : 'text-slate-100 group-hover:text-indigo-300'
                }`}
              >
                {isAdaptation ? 'ADAPTACIONES' : isOpera ? 'CHECK OPERA' : `PDP ${country.code}`}
              </h3>
            </div>

            {isAdaptation && (
              <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-slate-400 font-mono">
                Brief PPT / PDF • En Calibración
              </span>
            )}
            {isOpera && (
              <span className="inline-block text-[10px] uppercase tracking-wider font-semibold text-pink-400">
                Detección de Duplicados
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {!isAdaptation && !isOpera && onEditSpecs && (
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

      {/* Retailers / Tasks preview tags */}
      <div className="mb-5 flex-grow">
        <div className="flex flex-wrap gap-1.5">
          {retailerNames.slice(0, 5).map((ret, i) => (
            <span
              key={i}
              className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                isAdaptation
                  ? 'bg-slate-800/40 text-slate-400 border-slate-700/40'
                  : isOpera
                  ? 'bg-pink-500/10 text-pink-200 border-pink-500/20'
                  : 'bg-white/5 text-slate-300 border border-white/5'
              }`}
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
      {isAdaptation ? (
        <button
          id={`btn-analizar-${country.code.toLowerCase()}`}
          onClick={() => onSelect(country)}
          disabled={isLoading}
          title="Módulo en proceso de refinamiento técnico (operativo)"
          className="w-full relative overflow-hidden flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all text-slate-300 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 hover:border-amber-500/40 shadow-none active:scale-[0.98] group/btn"
        >
          {/* Subtle diagonal background stripes simulating tape */}
          <div className="absolute inset-0 pointer-events-none opacity-20 group-hover/btn:opacity-30 transition-opacity bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(245,158,11,0.15)_8px,rgba(245,158,11,0.15)_16px)]" />

          {/* Strikethrough refinement tape across the button */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-500/40 pointer-events-none" />

          <FolderSearch className="w-4 h-4 text-amber-400/80 relative z-10" />
          <span className="relative z-10 font-mono tracking-tight">
            Validar Adaptaciones <span className="text-[10px] text-amber-300/80 font-normal lowercase">(en refinamiento)</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 opacity-60 group-hover:translate-x-1 transition-transform relative z-10" />
        </button>
      ) : (
        <button
          id={`btn-analizar-${country.code.toLowerCase()}`}
          onClick={() => onSelect(country)}
          disabled={isLoading}
          className={`w-full relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-lg text-white border active:scale-[0.98] ${
            isOpera
              ? 'shadow-pink-500/20 hover:shadow-pink-500/35 bg-pink-600 hover:bg-pink-500 border-pink-400/30'
              : 'shadow-indigo-500/20 hover:shadow-indigo-500/35 bg-indigo-500 hover:bg-indigo-600 border-indigo-400/30'
          }`}
        >
          <FolderSearch className="w-4 h-4 text-white" />
          <span>{isOpera ? 'Abrir Check Opera' : 'Validar Carpeta'}</span>
          <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
        </button>
      )}
    </div>
  );
};


