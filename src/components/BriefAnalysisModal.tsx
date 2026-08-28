import React, { useState } from 'react';
import { BriefAnalysisResult } from '../types';
import {
  X,
  FileText,
  Download,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  FileCode,
  Eye,
  Link as LinkIcon,
  LayoutGrid,
  Maximize2,
  Palette,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { generateBriefAnalysisPDF, downloadBriefAnalysisTXT } from '../utils/briefAnalyzer';

interface BriefAnalysisModalProps {
  result: BriefAnalysisResult | null;
  onClose: () => void;
}

export const BriefAnalysisModal: React.FC<BriefAnalysisModalProps> = ({
  result,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'slides' | 'formats' | 'text'>('visual');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  if (!result) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(result.plainTextReport);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleCopyLink = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkIndex(index);
      setTimeout(() => setCopiedLinkIndex(null), 1500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const isClear = result.clarityStatus === 'clear';
  const isNeedsClarification = result.clarityStatus === 'needs_clarification';

  const hasSlides = result.slideBySlideBreakdown && result.slideBySlideBreakdown.length > 0;
  const hasFormats = result.requiredFormatsByChannel && result.requiredFormatsByChannel.length > 0;
  const hasShades = result.shadesAndSkusList && result.shadesAndSkusList.length > 0;
  const hasDisclaimers = result.legalDisclaimers && result.legalDisclaimers.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Análisis Exhaustivo del Brief / Pedido del PM
                </h3>
                <span className="text-[11px] font-semibold text-slate-400 font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10">
                  {result.fileName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {result.productOrBrand} • {result.totalSlidesOrSections || 1} Slides/Páginas • {result.analyzedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher tabs */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('visual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'visual'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Resumen General</span>
              </button>
              {hasSlides && (
                <button
                  onClick={() => setActiveTab('slides')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    activeTab === 'slides'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Por Slide ({result.slideBySlideBreakdown?.length})</span>
                </button>
              )}
              {hasFormats && (
                <button
                  onClick={() => setActiveTab('formats')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    activeTab === 'formats'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Formatos & Canales</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'text'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Texto Plano (.TXT)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {activeTab === 'visual' && (
            <>
              {/* Clarity & Overview Hero Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Clarity Score Card */}
                <div
                  className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col justify-between ${
                    isClear
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                      : isNeedsClarification
                      ? 'bg-amber-500/[0.04] border-amber-500/30'
                      : 'bg-rose-500/[0.04] border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Claridad del Pedido
                    </span>
                    <span
                      className={`text-2xl font-black font-mono ${
                        isClear
                          ? 'text-emerald-400'
                          : isNeedsClarification
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {result.clarityScore}%
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {isClear ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-200">
                        {isClear
                          ? 'Pedido Claro y Completo'
                          : isNeedsClarification
                          ? 'Requiere Aclaraciones Menores'
                          : 'Pedido Ambiguo o Incompleto'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {result.clarityReasoning}
                    </p>
                  </div>
                </div>

                {/* Overview Card */}
                <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                      <FileText className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Resumen Ejecutivo del Requerimiento
                      </h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {result.overview}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Producto / Campaña: <strong className="text-slate-200">{result.productOrBrand}</strong>
                    </span>
                    <span>
                      {result.totalSlidesOrSections || 1} diapositivas analizadas • {(result.fileSizeBytes / 1024).toFixed(0)} KB ({result.fileType.toUpperCase()})
                    </span>
                  </div>
                </div>
              </div>

              {/* Links & Resources Section */}
              {result.links && result.links.length > 0 && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-400">
                      <LinkIcon className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Enlaces y Repositorios Extraídos ({result.links.length})
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Opera DAM / Drive / Archivos ZIP / Key Visuals
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.links.map((link, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex flex-col justify-between gap-2 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {link.title || 'Recurso'}
                            </span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                              {link.type?.toUpperCase() || 'LINK'}
                            </span>
                          </div>
                          {link.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {link.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-sky-400/90 font-mono truncate max-w-[240px]">
                            {link.url}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyLink(link.url, idx)}
                              title="Copiar enlace"
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 border border-white/10 transition-colors"
                            >
                              {copiedLinkIndex === idx ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors"
                              title="Abrir en pestaña nueva"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Categories Requested */}
              {result.actionCategories && result.actionCategories.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Layers className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Desglose de Acciones por Categoría ({result.actionCategories.length})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.actionCategories.map((cat, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            {cat.categoryTitle}
                          </h5>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {cat.instructions.length} items
                          </span>
                        </div>

                        <ul className="space-y-2">
                          {cat.instructions.map((ins, insIdx) => (
                            <li
                              key={insIdx}
                              className="flex items-start gap-2.5 text-xs text-slate-300 leading-relaxed"
                            >
                              <span className="text-indigo-400 font-bold mt-0.5">•</span>
                              <span className="flex-1">{ins}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shades and SKUs List */}
              {hasShades && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-pink-400">
                    <Palette className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Tonos, Shadelists y SKUs Detectados ({result.shadesAndSkusList?.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.shadesAndSkusList?.map((shade, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-200">{shade.name}</div>
                          {shade.sku && <div className="text-[10px] font-mono text-slate-400">SKU: {shade.sku}</div>}
                          {shade.details && <div className="text-[10px] text-slate-400">{shade.details}</div>}
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                            shade.action === 'remove'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : shade.action === 'keep'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {shade.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Disclaimers */}
              {hasDisclaimers && (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Disclaimers Legales y Fuentes Obligatorias ({result.legalDisclaimers?.length})
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {result.legalDisclaimers?.map((disc, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <p className="text-xs text-slate-300 font-mono">"{disc.text}"</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          {disc.stylingRequirement && <span>Regla: {disc.stylingRequirement}</span>}
                          {disc.appliesTo && <span>Aplica a: {disc.appliesTo}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ambiguities / Doubts to ask PM */}
              {result.ambiguities && result.ambiguities.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300">
                    <HelpCircle className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Dudas y Ambigüedades a Consultar al PM ({result.ambiguities.length})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {result.ambiguities.map((amb, idx) => (
                      <div
                        key={amb.id || idx}
                        className="p-4 rounded-xl bg-black/40 border border-amber-500/30 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-200">
                            {amb.title}
                          </span>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Severidad: {amb.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono bg-white/5 p-2 rounded-lg border border-white/5">
                          Nota original del PM: "{amb.pmNoteText}"
                        </p>
                        <div className="text-xs text-amber-300/90 pt-1">
                          <strong>Motivo de duda:</strong> {amb.reason}
                        </div>
                        <div className="text-xs text-emerald-300 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          <strong>Pregunta sugerida para el PM:</strong> {amb.suggestedQuestionToPM}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'slides' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-indigo-400" />
                  Desglose Diapositiva por Diapositiva ({result.slideBySlideBreakdown?.length} Slides)
                </h4>
                <span className="text-xs text-slate-400">
                  Lectura directa de textos, llamadas de PM y maquetas de referencia
                </span>
              </div>

              <div className="space-y-4">
                {result.slideBySlideBreakdown?.map((slide, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                          Slide {slide.slideNumber}
                        </span>
                        <h5 className="text-sm font-bold text-slate-100">{slide.sectionTitle}</h5>
                      </div>
                      {slide.targetDimensions && slide.targetDimensions.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          {slide.targetDimensions.map((dim, dIdx) => (
                            <span
                              key={dIdx}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300"
                            >
                              {dim}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Requested tasks */}
                    {slide.requestedChanges && slide.requestedChanges.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Acciones y Cambios Requeridos:
                        </div>
                        <ul className="space-y-1">
                          {slide.requestedChanges.map((change, cIdx) => (
                            <li key={cIdx} className="text-xs text-slate-200 flex items-start gap-2">
                              <span className="text-indigo-400 font-bold mt-0.5">•</span>
                              <span className="flex-1">{change}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Original vs Translated Texts */}
                    {(slide.originalText || slide.translatedText) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {slide.originalText && (
                          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">
                              Texto Original (Inglés / Mock):
                            </div>
                            <p className="text-xs text-slate-300 font-mono">"{slide.originalText}"</p>
                          </div>
                        )}
                        {slide.translatedText && (
                          <div className="p-3 rounded-xl bg-indigo-500/[0.05] border border-indigo-500/20 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-indigo-300">
                              Adaptación al Español / Local:
                            </div>
                            <p className="text-xs text-slate-100 font-mono">"{slide.translatedText}"</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    {slide.notes && (
                      <div className="text-xs text-slate-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <strong className="text-slate-300">Notas adicionales:</strong> {slide.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'formats' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  Matriz de Formatos y Medidas Requeridas por Canal ({result.requiredFormatsByChannel?.length})
                </h4>
                <span className="text-xs text-slate-400">
                  Resoluciones estándar para Amazon, Mercado Libre, Falabella y A+ Content
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.requiredFormatsByChannel?.map((fmt, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">{fmt.channelOrSection}</span>
                      {fmt.aspectRatio && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {fmt.aspectRatio}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-black font-mono text-emerald-400">{fmt.dimensions}</div>
                    {fmt.details && <p className="text-xs text-slate-400 leading-relaxed">{fmt.details}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            /* Plain Text View */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  Formato de texto plano estructurado listo para copiar y compartir:
                </span>
                <button
                  onClick={handleCopyText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-black/60 border border-white/10 text-slate-200 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-[500px] scrollbar-thin">
                {result.plainTextReport}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            Documento interpretado con Inteligencia Artificial Multimodal
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Texto Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            <button
              onClick={() => downloadBriefAnalysisTXT(result)}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Descargar .TXT</span>
            </button>

            <button
              id="btn-descargar-brief-pdf"
              onClick={() => generateBriefAnalysisPDF(result)}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar Hoja PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
