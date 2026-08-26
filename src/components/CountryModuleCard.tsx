import React from 'react';
import { CountryInfo } from '../types';
import { FolderSearch, Clock, ChevronRight, CheckCircle2, AlertCircle, Settings } from 'lucide-react';

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

  return (
    <div
      id={`card-pdp-${country.code.toLowerCase()}`}
      className={`group relative flex flex-col justify-between p-5 sm:p-6 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
        isPending
          ? 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
          : 'bg-white/[0.03] border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.06] hover:shadow-2xl hover:shadow-indigo-500/10'
      }`}
    >
      {/* Top row: Flag + Code + Status */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl sm:text-3xl shadow-inner group-hover:scale-105 transition-transform">
            {country.flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                PDP {country.code}
              </h3>
              <span className="text-xs font-medium text-slate-400">
                ({country.name})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              {country.expectedRetailersCount} e-retailers contemplados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onEditSpecs && (
            <button
              type="button"
              title={`Editar especificaciones de ${country.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onEditSpecs(country);
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 transition-all text-xs"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}

          {isPending ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap">
              <Clock className="w-3 h-3" />
              Specs pendientes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3" />
              Specs Activas
            </span>
          )}
        </div>
      </div>

      {/* Retailers preview tags */}
      <div className="mb-6 flex-grow">
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
          {country.description}
        </p>
      </div>

      {/* Main Action Button */}
      <button
        id={`btn-analizar-${country.code.toLowerCase()}`}
        onClick={() => onSelect(country)}
        disabled={isLoading}
        className={`w-full relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all shadow-md active:scale-[0.98] ${
          isPending
            ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 hover:text-white'
            : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 border border-indigo-400/30'
        }`}
      >
        {isPending ? (
          <>
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Consultar PDP {country.code}</span>
          </>
        ) : (
          <>
            <FolderSearch className="w-4 h-4 text-white" />
            <span>Analizar PDP {country.code}</span>
            <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </>
        )}
      </button>
    </div>
  );
};

