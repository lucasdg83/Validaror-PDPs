import React from 'react';
import { CountryInfo } from '../types';
import { X, Clock, Sparkles, Send, CheckCircle2, ShieldAlert } from 'lucide-react';

interface PendingCountryModalProps {
  country: CountryInfo | null;
  onClose: () => void;
}

export const PendingCountryModal: React.FC<PendingCountryModalProps> = ({
  country,
  onClose,
}) => {
  if (!country) return null;

  return (
    <div
      id="pending-country-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl"
    >
      <div
        id="pending-country-modal-container"
        className="relative w-full max-w-lg bg-[#09090b]/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 backdrop-blur-2xl"
      >
        <button
          id="btn-close-pending-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{country.flag}</div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-2">
            <Clock className="w-3.5 h-3.5" />
            Specs pendientes de carga
          </div>
          <h2 className="text-2xl font-bold text-slate-100 uppercase tracking-tight">
            Módulo PDP {country.code} ({country.name})
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
            La arquitectura está 100% preparada. Las especificaciones técnicas de los e-retailers de {country.name} se encuentran en etapa de homologación.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 mb-6 text-xs text-slate-300 space-y-2 backdrop-blur-md">
          <p className="font-semibold text-slate-200">E-retailers contemplados para este país:</p>
          <p className="text-slate-400 leading-relaxed font-mono">{country.description}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
