import React, { useState } from 'react';
import { RetailerSpec, CountryCode } from '../types';
import { X, Save, RotateCcw, Plus, Trash2, Check } from 'lucide-react';

interface EditRetailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (spec: RetailerSpec) => void;
  onDelete?: (specId: string) => void;
  spec: RetailerSpec | null;
  country: CountryCode;
  isNew?: boolean;
}

export const EditRetailerModal: React.FC<EditRetailerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  spec,
  country,
  isNew = false,
}) => {
  if (!isOpen || !spec) return null;

  const [name, setName] = useState(spec.name);
  const [aliasesStr, setAliasesStr] = useState(spec.aliases.join(', '));
  const [width, setWidth] = useState(spec.width);
  const [height, setHeight] = useState(spec.height);
  const [aspectRatio, setAspectRatio] = useState(spec.aspectRatio || '1:1');
  const [maxImages, setMaxImages] = useState(spec.maxImages || 10);
  const [allowedFormatsStr, setAllowedFormatsStr] = useState(spec.allowedFormats.join(', '));
  const [maxFileSizeKB, setMaxFileSizeKB] = useState<number | string>(spec.maxFileSizeKB || '');
  const [dpi, setDpi] = useState<number | string>(spec.dpi || '');
  const [requireVideo, setRequireVideo] = useState(!!spec.requireVideo);
  const [videoType, setVideoType] = useState<'any' | 'vertical_30s'>(spec.videoType || 'any');
  const [mainWhiteBackground, setMainWhiteBackground] = useState(!!spec.mainWhiteBackground);
  const [sequenceRule, setSequenceRule] = useState(spec.sequenceRule || '');
  const [rulesStr, setRulesStr] = useState(
    spec.specificRulesSummary ? spec.specificRulesSummary.join('\n') : ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAliases = aliasesStr
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean);

    const cleanFormats = allowedFormatsStr
      .split(',')
      .map((f) => f.trim().toUpperCase() as 'JPG' | 'JPEG' | 'PNG' | 'WEBP')
      .filter((f) => ['JPG', 'JPEG', 'PNG', 'WEBP'].includes(f));

    const rulesList = rulesStr
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const updatedSpec: RetailerSpec = {
      ...spec,
      id: spec.id || `${country.toLowerCase()}_${Date.now()}`,
      name: name.trim() || 'Retailer Sin Nombre',
      country,
      aliases: cleanAliases.length > 0 ? cleanAliases : [name.trim().toLowerCase()],
      width: Number(width) || 1200,
      height: Number(height) || 1200,
      aspectRatio: aspectRatio.trim() || '1:1',
      maxImages: Number(maxImages) || 10,
      allowedFormats: cleanFormats.length > 0 ? cleanFormats : ['JPG', 'JPEG'],
      maxFileSizeKB: maxFileSizeKB ? Number(maxFileSizeKB) : undefined,
      dpi: dpi ? Number(dpi) : undefined,
      requireVideo,
      videoType: requireVideo ? videoType : undefined,
      mainWhiteBackground,
      sequenceRule: sequenceRule.trim() || undefined,
      specificRulesSummary:
        rulesList.length > 0
          ? rulesList
          : [
              `${width}x${height}px (${aspectRatio}), máx ${maxImages} imágenes`,
              `Formatos: ${cleanFormats.join(', ')}`,
            ],
    };

    onSave(updatedSpec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#09090b] border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-tight">
              {isNew ? 'Agregar Nuevo Retailer' : `Editar Specs: ${spec.name}`}
            </h3>
            <p className="text-xs text-slate-400">
              Personaliza resoluciones, formatos, pesos y reglas específicas para {country}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Nombre del Retailer *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Mercado Libre"
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Aliases de Carpetas (separados por coma)
              </label>
              <input
                type="text"
                value={aliasesStr}
                onChange={(e) => setAliasesStr(e.target.value)}
                placeholder="meli, mercadolibre, mercado libre"
                className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Ancho (px) *
              </label>
              <input
                type="number"
                required
                min="100"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Alto (px) *
              </label>
              <input
                type="number"
                required
                min="100"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Ratio
              </label>
              <input
                type="text"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                placeholder="1:1"
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Máx Imgs *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={maxImages}
                onChange={(e) => setMaxImages(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Formatos Permitidos
              </label>
              <input
                type="text"
                value={allowedFormatsStr}
                onChange={(e) => setAllowedFormatsStr(e.target.value)}
                placeholder="JPG, JPEG, PNG, WEBP"
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Peso Máximo (KB)
              </label>
              <input
                type="number"
                value={maxFileSizeKB}
                onChange={(e) => setMaxFileSizeKB(e.target.value)}
                placeholder="Ej. 400 (opcional)"
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                DPI Estándar
              </label>
              <input
                type="number"
                value={dpi}
                onChange={(e) => setDpi(e.target.value)}
                placeholder="Ej. 72 o 150"
                className="w-full px-3 py-2 text-sm font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Checkboxes & Extra Validations */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="check-require-video"
                checked={requireVideo}
                onChange={(e) => setRequireVideo(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="check-require-video" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Exigir presencia obligatoria de Video (.mp4)
              </label>
            </div>

            {requireVideo && (
              <div className="pl-7">
                <label className="block text-[11px] text-slate-400 mb-1">Tipo de Video Exigido</label>
                <select
                  value={videoType}
                  onChange={(e) => setVideoType(e.target.value as 'any' | 'vertical_30s')}
                  className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="any" className="bg-[#09090b]">Cualquier Video (.mp4)</option>
                  <option value="vertical_30s" className="bg-[#09090b]">Video Vertical (9:16) máx 30 seg</option>
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="check-white-bg"
                checked={mainWhiteBackground}
                onChange={(e) => setMainWhiteBackground(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="check-white-bg" className="text-xs font-semibold text-slate-200 cursor-pointer">
                Exigir Main (Img 1) con Fondo Blanco Puro
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Regla de Secuencia (Opcional)
            </label>
            <input
              type="text"
              value={sequenceRule}
              onChange={(e) => setSequenceRule(e.target.value)}
              placeholder="Ej. Img 1: Packshot | Img 2: Packaging | Img 3: Beneficios"
              className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Resumen de Reglas en Guía de Specs (Una por línea)
            </label>
            <textarea
              rows={3}
              value={rulesStr}
              onChange={(e) => setRulesStr(e.target.value)}
              placeholder="1200x1200px (1:1), máx 10 imágenes&#10;Formato JPG / 72 DPI&#10;Valida video .mp4"
              className="w-full px-3 py-2 text-xs font-mono bg-white/5 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {!isNew && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Eliminar las especificaciones de "${spec.name}"?`)) {
                    onDelete(spec.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Retailer</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/25 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Specs</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
