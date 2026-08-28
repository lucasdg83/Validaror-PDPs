import React, { useState } from 'react';
import {
  OperaAnalysisReport,
  OperaImageFile,
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
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Info,
  Trash2,
  FolderX,
  AlertTriangle,
  Image as ImageIcon,
  FolderOpen,
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
  const [activeTab, setActiveTab] = useState<'duplicates' | 'uniques' | 'text'>('duplicates');
  const [copiedText, setCopiedText] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [selectedPreviewImg, setSelectedPreviewImg] = useState<string | null>(null);
  const [showOmittedDetails, setShowOmittedDetails] = useState(false);

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
  const hasDuplicatedFolders = report.entirelyDuplicatedFolders && report.entirelyDuplicatedFolders.length > 0;
  const hasOmittedFiles = report.totalOmittedFiles > 0;

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
                {report.totalImagesScanned} imágenes válidas analizadas (JPG, JPEG, PNG, WEBP) • {report.analyzedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs - Strictly Duplicates, Unique, and Text */}
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
                <span>Imágenes Duplicadas ({report.duplicateGroups.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('uniques')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'uniques'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Imágenes Únicas ({report.uniqueImages.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'text'
                    ? 'bg-pink-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Reporte Texto</span>
              </button>
            </div>

            {/* Close Button */}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Imágenes</div>
              <div className="text-2xl font-black text-slate-100 font-mono">{report.totalImagesScanned}</div>
              <div className="text-[11px] text-slate-400">Auditoría en subcarpetas</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Imágenes Únicas</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">{report.totalUniqueImages}</div>
              <div className="text-[11px] text-slate-400">Assets sin repetición</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Imágenes Duplicadas</div>
              <div
                className={`text-2xl font-black font-mono ${
                  report.totalDuplicateCopies > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {report.totalDuplicateCopies}
              </div>
              <div className="text-[11px] text-slate-400">
                En {report.totalDuplicateGroups} grupo(s) con mismo contenido + tamaño
              </div>
            </div>
          </div>

          {/* CRITICAL ALERT: Entirely Duplicated Folders Banner ("Se debe eliminar la carpeta ... completa") */}
          {hasDuplicatedFolders && (
            <div className="space-y-3">
              {report.entirelyDuplicatedFolders.map((folder, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-rose-900/40 to-slate-900/80 border-2 border-rose-500/60 shadow-xl space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex-shrink-0 mt-0.5">
                        <FolderX className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-500 text-[10px] font-black text-white uppercase tracking-wider">
                            Acción Recomendada
                          </span>
                          <h4 className="text-base sm:text-lg font-black text-rose-200">
                            {folder.recommendation}
                          </h4>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {folder.explanation}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-rose-300 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 inline-block">
                        {folder.totalImages} archivos 100% repetidos
                      </span>
                    </div>
                  </div>

                  {/* Redundant Folder Files List */}
                  <div className="p-3 rounded-xl bg-black/40 border border-rose-500/20 text-xs text-slate-300 space-y-1.5">
                    <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5" />
                      Archivos duplicados contenidos en {folder.folderDisplayName} ({folder.totalImages} archivos):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {folder.files.map((file, fIdx) => (
                        <div
                          key={file.id || fIdx}
                          className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 text-[11px]"
                        >
                          <span className="truncate max-w-[220px] font-mono text-slate-200 font-semibold" title={file.name}>
                            {file.name}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">
                            {file.dimensionsStr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Omitted Formats Notice Banner */}
          {hasOmittedFiles && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-amber-200 font-medium">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    <strong>Formatos omitidos del análisis:</strong> Se detectaron {report.totalOmittedFiles} archivo(s) cuyo formato no corresponde a las extensiones permitidas (<strong>JPG, JPEG, PNG, WEBP</strong>).
                  </span>
                </div>
                <button
                  onClick={() => setShowOmittedDetails(!showOmittedDetails)}
                  className="text-xs text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1"
                >
                  {showOmittedDetails ? 'Ocultar detalle' : `Ver ${report.totalOmittedFiles} archivo(s) omitidos`}
                </button>
              </div>

              {showOmittedDetails && (
                <div className="pt-2 border-t border-amber-500/20 space-y-1.5 max-h-48 overflow-y-auto">
                  {report.omittedFiles.map((file, idx) => (
                    <div
                      key={file.id || idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-amber-500/10 text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                          {file.extension}
                        </span>
                        <span className="truncate text-slate-200 font-medium" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono truncate hidden sm:inline">
                          (/{file.relativePath})
                        </span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px] flex-shrink-0 ml-2">
                        {file.sizeKB} KB • Omitido
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rule Reminder Banner */}
          <div className="p-3.5 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-between text-xs text-pink-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <span>
                <strong>Regla de Check Opera:</strong> Se detectan e informan únicamente imágenes con <strong>contenido visual idéntico + mismo tamaño</strong> en píxeles. Imágenes con distinto tamaño no se consideran duplicadas.
              </span>
            </div>
          </div>

          {/* 1. DUPLICATE IMAGES TAB */}
          {activeTab === 'duplicates' && (
            <div className="space-y-4">
              {!hasDuplicates ? (
                <div className="p-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-slate-100">
                    ¡No se encontraron imágenes duplicadas del mismo tamaño!
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Todos los assets en este directorio y sus subcarpetas tienen contenidos visuales distintos o resoluciones adaptadas a diferentes canales.
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
                            Grupo Duplicado #{idx + 1}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-200 border border-white/10 text-xs font-mono font-bold">
                            {group.dimensionsStr} px ({group.aspectRatio})
                          </span>
                          <h5 className="text-sm font-bold text-slate-100">{group.visualSummary}</h5>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">
                            {group.files.length} archivos ({group.totalDuplicateCopies} copia{group.totalDuplicateCopies > 1 ? 's' : ''} repetida{group.totalDuplicateCopies > 1 ? 's' : ''})
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-mono font-bold">
                            IA {group.confidence}% certeza
                          </span>
                        </div>
                      </div>

                      {/* AI Diagnosis */}
                      <p className="text-xs text-slate-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <strong className="text-pink-400">Diagnóstico IA:</strong> {group.aiExplanation}
                      </p>

                      {/* Visual Side-by-Side Cards with Subfolder indicators */}
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
                                {fIdx === 0 ? 'Original / Copia 1' : `Copia #${fIdx + 1}`}
                              </span>
                              <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-400 backdrop-blur-sm">
                                {file.dimensionsStr} px
                              </span>
                            </div>

                            {/* File Meta */}
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-slate-100 truncate" title={file.name}>
                                {file.name}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>{file.sizeKB} KB</span>
                                <span className="px-1.5 py-0.2 rounded bg-white/5 font-mono text-[10px] text-slate-300">
                                  {file.extension}
                                </span>
                              </div>

                              {/* Subfolder location badge */}
                              <div className="p-1.5 rounded-lg bg-black/30 border border-white/5 flex items-center gap-1.5 text-[10px] text-pink-300 font-mono">
                                <FolderOpen className="w-3 h-3 text-pink-400 flex-shrink-0" />
                                <span className="truncate" title={file.subfolderPath}>
                                  /{file.subfolderPath}/
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]" title={file.relativePath}>
                                  /{file.relativePath}
                                </span>
                                <button
                                  onClick={() => handleCopyPath(file.relativePath)}
                                  className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold"
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

          {/* 2. UNIQUE IMAGES TAB */}
          {activeTab === 'uniques' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    Catálogo de Imágenes Únicas ({report.uniqueImages.length} Assets)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Assets gráficos con contenido visual único o representativos del catálogo sin duplicados redundantes.
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  {report.totalUniqueImages} únicos
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {report.uniqueImages.map((img: OperaImageFile, idx: number) => (
                  <div
                    key={img.id || idx}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-colors space-y-2"
                  >
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center relative group">
                      {img.previewUrl || img.thumbnailBase64 ? (
                        <img
                          src={img.previewUrl || img.thumbnailBase64}
                          alt={img.name}
                          className="w-full h-full object-contain cursor-pointer"
                          onClick={() => setSelectedPreviewImg(img.previewUrl || img.thumbnailBase64 || null)}
                        />
                      ) : (
                        <div className="text-[10px] text-slate-500">Preview</div>
                      )}
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-emerald-400 backdrop-blur-sm">
                        {img.dimensionsStr}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] font-bold text-slate-200 truncate" title={img.name}>
                        {img.name}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="truncate max-w-[100px]" title={img.subfolderPath}>
                          /{img.subfolderPath}/
                        </span>
                        <span>{img.sizeKB} KB</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. PLAIN TEXT REPORT TAB */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">
                  Formato texto plano • Listo para exportar o enviar por Slack / Teams
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
              {report.totalDuplicateCopies} imágenes duplicadas en {report.totalDuplicateGroups} grupo(s) • {report.totalImagesScanned} total analizadas
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
