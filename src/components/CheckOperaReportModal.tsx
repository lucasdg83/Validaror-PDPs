import React, { useState } from 'react';
import {
  OperaAnalysisReport,
  OperaDuplicateGroup,
} from '../types';
import {
  X,
  Copy,
  Check,
  Download,
  FileText,
  Sparkles,
  Layers,
  HardDrive,
  Eye,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Info,
  Maximize2,
} from 'lucide-react';
import { generateOperaPDFReport, downloadOperaTXT } from '../utils/operaChecker';

interface CheckOperaReportModalProps {
  report: OperaAnalysisReport | null;
  onClose: () => void;
}

export const CheckOperaReportModal: React.FC<CheckOperaReportModalProps> = ({
  report,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'duplicates' | 'all' | 'different_size' | 'text'>('duplicates');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [selectedPreviewImg, setSelectedPreviewImg] = useState<string | null>(null);

  if (!report) return null;

  const handleCopyText = () => {
    navigator.clipboard.writeText(report.rawTxtReport);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyPath = (pathStr: string) => {
    navigator.clipboard.writeText(pathStr);
    setCopiedPath(pathStr);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const hasDuplicates = report.duplicateGroups.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                  Check Opera: Auditoría de Imágenes Duplicadas
                </h3>
                <span className="text-[11px] font-semibold text-pink-300 font-mono px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                  {report.folderName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {report.totalImagesScanned} imágenes analizadas • {report.analyzedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab('duplicates')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'duplicates'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Duplicados ({report.duplicateGroups.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Todas ({report.allImages.length})</span>
              </button>
              {report.differentSizeIgnored.length > 0 && (
                <button
                  onClick={() => setActiveTab('different_size')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    activeTab === 'different_size'
                      ? 'bg-pink-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Distinto Tamaño ({report.differentSizeIgnored.length})</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'text'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Texto Plano</span>
              </button>
            </div>

            {/* Close */}
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
          {/* Executive Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Imágenes</div>
              <div className="text-2xl font-black text-slate-100 font-mono">{report.totalImagesScanned}</div>
              <div className="text-[11px] text-slate-400">Escaneadas en la carpeta</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Imágenes Únicas</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{report.totalUniqueImages}</div>
              <div className="text-[11px] text-slate-400">Assets sin repetición</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Grupos Duplicados</div>
              <div
                className={`text-2xl font-black font-mono ${
                  hasDuplicates ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {report.totalDuplicateGroups}
              </div>
              <div className="text-[11px] text-slate-400">Mismo contenido + tamaño</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Ahorro de Espacio</div>
              <div className="text-2xl font-black text-pink-400 font-mono">
                {(report.totalWastedBytes / 1024).toFixed(0)} KB
              </div>
              <div className="text-[11px] text-slate-400">Peso en copias redundantes</div>
            </div>
          </div>

          {/* Rule Reminder Banner */}
          <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between text-xs text-pink-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <span>
                <strong>Regla de Check Opera aplicada:</strong> Se detectan e informan únicamente aquellas imágenes con <strong>contenido visual idéntico y del mismo tamaño en píxeles</strong>. Imágenes con contenido similar pero diferente tamaño se omiten.
              </span>
            </div>
          </div>

          {/* Duplicates Tab */}
          {activeTab === 'duplicates' && (
            <div className="space-y-4">
              {!hasDuplicates ? (
                <div className="p-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-slate-100">
                    ¡No se encontraron imágenes duplicadas del mismo tamaño!
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Todos los assets en este directorio tienen contenidos visuales distintos o resoluciones adaptadas a diferentes canales.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {report.duplicateGroups.map((group, idx) => (
                    <div
                      key={group.groupId || idx}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-rose-500/30 space-y-4"
                    >
                      {/* Group Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
                            Grupo #{idx + 1}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-200 border border-white/10 text-xs font-mono font-bold">
                            {group.dimensionsStr} px ({group.aspectRatio})
                          </span>
                          <h5 className="text-sm font-bold text-slate-100">{group.visualSummary}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">
                            {group.files.length} copias idénticas • {(group.wastedBytes / 1024).toFixed(0)} KB redundantes
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-bold">
                            IA {group.confidence}% certeza
                          </span>
                        </div>
                      </div>

                      {/* AI Explanation */}
                      <p className="text-xs text-slate-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <strong className="text-pink-400">Diagnóstico IA:</strong> {group.aiExplanation}
                      </p>

                      {/* Visual Side-by-Side Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.files.map((file, fIdx) => (
                          <div
                            key={file.id || fIdx}
                            className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-pink-500/40 transition-colors"
                          >
                            {/* Image Preview */}
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-black/40 border border-white/5 group flex items-center justify-center">
                              {file.previewUrl ? (
                                <img
                                  src={file.previewUrl}
                                  alt={file.name}
                                  className="w-full h-full object-contain cursor-pointer"
                                  onClick={() => setSelectedPreviewImg(file.previewUrl || null)}
                                />
                              ) : file.thumbnailBase64 ? (
                                <img
                                  src={file.thumbnailBase64}
                                  alt={file.name}
                                  className="w-full h-full object-contain cursor-pointer"
                                  onClick={() => setSelectedPreviewImg(file.thumbnailBase64 || null)}
                                />
                              ) : (
                                <div className="text-xs text-slate-500">Sin vista previa</div>
                              )}
                              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-200 backdrop-blur-sm">
                                Copia #{fIdx + 1}
                              </span>
                              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-400 backdrop-blur-sm">
                                {file.dimensionsStr} px
                              </span>
                            </div>

                            {/* File Meta */}
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-slate-100 truncate" title={file.name}>
                                {file.name}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>{file.sizeKB} KB</span>
                                <span>{file.extension}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]" title={file.relativePath}>
                                  /{file.relativePath}
                                </span>
                                <button
                                  onClick={() => handleCopyPath(file.relativePath)}
                                  className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1"
                                >
                                  {copiedPath === file.relativePath ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copiada</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      <span>Copiar ruta</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* All Images Tab */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-pink-400" />
                  Todos los Assets Analizados ({report.allImages.length})
                </h4>
                <span className="text-xs text-slate-400">
                  {report.totalUniqueImages} únicos • {report.totalDuplicateFiles} en conflicto
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {report.allImages.map((img, idx) => {
                  const isDuplicated = report.duplicateGroups.some((g) =>
                    g.files.some((f) => f.id === img.id || f.name === img.name)
                  );

                  return (
                    <div
                      key={img.id || idx}
                      className={`p-3 rounded-xl border transition-colors ${
                        isDuplicated
                          ? 'bg-rose-500/[0.03] border-rose-500/30'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 border border-white/5 mb-2 flex items-center justify-center relative">
                        {img.previewUrl || img.thumbnailBase64 ? (
                          <img
                            src={img.previewUrl || img.thumbnailBase64}
                            alt={img.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-[10px] text-slate-500">Preview</div>
                        )}
                        {isDuplicated && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-rose-500 text-[9px] font-bold text-white uppercase">
                            Duplicado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-slate-200 truncate" title={img.name}>
                        {img.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{img.dimensionsStr}</span>
                        <span>{img.sizeKB} KB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Different Size Ignored Tab */}
          {activeTab === 'different_size' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200 space-y-1">
                  <p className="font-bold text-slate-100">
                    Assets con el mismo contenido pero diferente resolución (Excluidos de duplicados)
                  </p>
                  <p>
                    Tal como solicitaste, Check Opera <strong>NO alerta como duplicadas</strong> aquellas imágenes que tengan el mismo arte visual pero diferente tamaño (por ejemplo, un packshot cuadrado de 1200x1200 px vs un hero banner de 1460x600 px). Aquí puedes verificar los pares detectados que fueron omitidos de la lista de errores:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {report.differentSizeIgnored.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail A */}
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-14 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                          {item.imageA.previewUrl || item.imageA.thumbnailBase64 ? (
                            <img
                              src={item.imageA.previewUrl || item.imageA.thumbnailBase64}
                              alt={item.imageA.name}
                              className="w-full h-full object-contain"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100">{item.imageA.name}</div>
                          <div className="text-[10px] font-mono text-indigo-300">{item.imageA.dimensionsStr} px</div>
                        </div>
                      </div>

                      <span className="text-slate-500 font-bold">≠</span>

                      {/* Thumbnail B */}
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-14 rounded-lg bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                          {item.imageB.previewUrl || item.imageB.thumbnailBase64 ? (
                            <img
                              src={item.imageB.previewUrl || item.imageB.thumbnailBase64}
                              alt={item.imageB.name}
                              className="w-full h-full object-contain"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-100">{item.imageB.name}</div>
                          <div className="text-[10px] font-mono text-emerald-300">{item.imageB.dimensionsStr} px</div>
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 self-start sm:self-center">
                      Omitido (Distinto Tamaño)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text View */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Formato texto plano • Ideal para compartir por Slack / Teams
                </span>
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado al portapapeles</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Reporte</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                {report.rawTxtReport}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer with Export Buttons */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HardDrive className="w-4 h-4 text-pink-400" />
            <span>
              {report.totalDuplicateGroups} grupos duplicados ({report.totalDuplicateFiles} archivos)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadOperaTXT(report)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Descargar .TXT</span>
            </button>
            <button
              onClick={() => generateOperaPDFReport(report)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold transition-all shadow-lg shadow-pink-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Large Image Preview Modal */}
      {selectedPreviewImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg"
          onClick={() => setSelectedPreviewImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-2 bg-slate-900 border border-white/20 rounded-2xl overflow-hidden">
            <img
              src={selectedPreviewImg}
              alt="Zoom Preview"
              className="w-full h-full max-h-[85vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedPreviewImg(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
