import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Check,
  Video,
  Scale,
  Edit2,
  Plus,
  Sparkles,
  Info,
} from 'lucide-react';
import { CountryCode, RetailerSpec } from '../types';
import { COUNTRIES } from '../data/retailerSpecs';
import {
  loadAllSpecs,
  saveAllSpecs,
  CountrySpecsStore,
} from '../utils/specsStorage';
import { EditRetailerModal } from './EditRetailerModal';

interface SpecsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCountry?: CountryCode;
  onSpecsUpdated?: () => void;
}

const PDP_COUNTRIES = COUNTRIES.filter(
  (c) => !c.isOperaModule && !c.isAdaptationModule && c.code !== 'CHECK_OPERA' && c.code !== 'ADAPTACIONES'
);

export const SpecsViewerModal: React.FC<SpecsViewerModalProps> = ({
  isOpen,
  onClose,
  initialCountry = 'AR',
  onSpecsUpdated,
}) => {
  const validInitialCountry = PDP_COUNTRIES.some((c) => c.code === initialCountry)
    ? initialCountry
    : 'AR';
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(validInitialCountry);
  const [specsStore, setSpecsStore] = useState<CountrySpecsStore>(loadAllSpecs());
  const [editingSpec, setEditingSpec] = useState<RetailerSpec | null>(null);
  const [isNewRetailer, setIsNewRetailer] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSpecsStore(loadAllSpecs());
      if (initialCountry && PDP_COUNTRIES.some((c) => c.code === initialCountry)) {
        setSelectedCountry(initialCountry);
      } else {
        setSelectedCountry('AR');
      }
    }
  }, [isOpen, initialCountry]);

  if (!isOpen) return null;

  const currentSpecs = specsStore[selectedCountry] || [];

  const handleSaveSpec = (updatedSpec: RetailerSpec) => {
    const countryList = [...(specsStore[selectedCountry] || [])];
    const existingIndex = countryList.findIndex((s) => s.id === updatedSpec.id);

    if (existingIndex >= 0) {
      countryList[existingIndex] = updatedSpec;
    } else {
      countryList.push(updatedSpec);
    }

    const updatedStore: CountrySpecsStore = {
      ...specsStore,
      [selectedCountry]: countryList,
    };

    setSpecsStore(updatedStore);
    saveAllSpecs(updatedStore);
    if (onSpecsUpdated) onSpecsUpdated();

    setSuccessNotice(`Especificaciones de "${updatedSpec.name}" guardadas exitosamente.`);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleDeleteSpec = (specId: string) => {
    const countryList = (specsStore[selectedCountry] || []).filter((s) => s.id !== specId);
    const updatedStore: CountrySpecsStore = {
      ...specsStore,
      [selectedCountry]: countryList,
    };

    setSpecsStore(updatedStore);
    saveAllSpecs(updatedStore);
    if (onSpecsUpdated) onSpecsUpdated();

    setSuccessNotice('Retailer eliminado.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleAddNewRetailer = () => {
    const newSpec: RetailerSpec = {
      id: `${selectedCountry.toLowerCase()}_retailer_${Date.now()}`,
      name: '',
      country: selectedCountry,
      aliases: [],
      width: 1200,
      height: 1200,
      aspectRatio: '1:1',
      maxImages: 10,
      allowedFormats: ['JPG', 'JPEG'],
      dpi: 72,
      specificRulesSummary: ['1200x1200px (1:1), máx 10 imágenes', 'Formato JPG / 72 DPI'],
    };
    setEditingSpec(newSpec);
    setIsNewRetailer(true);
  };

  return (
    <div
      id="specs-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
    >
      <div
        id="specs-modal-container"
        className="relative w-full max-w-4xl bg-[#09090b]/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 uppercase tracking-tight">
                Configuración de Specs de PDPs
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-specs-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 text-xs text-emerald-400 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Country Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 px-6 py-3 bg-white/[0.01] border-b border-white/10">
          {PDP_COUNTRIES.map((c) => {
            const count = (specsStore[c.code] || []).length;
            const isSelected = selectedCountry === c.code;
            return (
              <button
                key={c.code}
                onClick={() => setSelectedCountry(c.code)}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isSelected
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-200 bg-white/5 border border-white/10'
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-black/30 text-indigo-100' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spec List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-black/30">
          {currentSpecs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-sm text-slate-400 mb-3">
                No hay retailers configurados para {selectedCountry}.
              </p>
              <button
                onClick={handleAddNewRetailer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 hover:bg-indigo-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Primer Retailer</span>
              </button>
            </div>
          ) : (
            currentSpecs.map((spec) => (
              <div
                key={spec.id}
                className="group p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-all backdrop-blur-xl relative"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-slate-100">{spec.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit button */}
                    <button
                      onClick={() => {
                        setEditingSpec(spec);
                        setIsNewRetailer(false);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 text-xs font-semibold transition-all ml-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>

                {/* Rules Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10">
                  {spec.specificRulesSummary?.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                  {spec.sequenceRule && (
                    <div className="flex items-start gap-2 text-xs text-indigo-300 col-span-full">
                      <Info className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span>{spec.sequenceRule}</span>
                    </div>
                  )}
                </div>

                {/* Special tags */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 text-[11px]">
                  <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono">
                    Formatos: {spec.allowedFormats.join(', ')}
                  </span>
                  {spec.dpi && (
                    <span className="text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono">
                      DPI: {spec.dpi}
                    </span>
                  )}
                  {spec.maxFileSizeKB && (
                    <span className="text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                      Peso máx: {spec.maxFileSizeKB} KB
                    </span>
                  )}
                  {spec.requireVideo && (
                    <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Requiere Video MP4
                    </span>
                  )}
                  {spec.mainWhiteBackground && (
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Main Blanco Puro
                    </span>
                  )}
                  {spec.packshotCentering && (
                    <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1 font-mono">
                      <Scale className="w-3 h-3" />
                      Packshot mín: {spec.packshotCentering.minPackshotSize}px
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Retailer Submodal */}
      <EditRetailerModal
        isOpen={!!editingSpec}
        onClose={() => setEditingSpec(null)}
        onSave={handleSaveSpec}
        onDelete={handleDeleteSpec}
        spec={editingSpec}
        country={selectedCountry}
        isNew={isNewRetailer}
      />
    </div>
  );
};
