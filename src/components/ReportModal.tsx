import React, { useState, useEffect } from 'react';
import { AnalysisReport, RetailerAnalysisResult } from '../types';
import { downloadTextReport } from '../utils/reportFormatter';
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  LayoutGrid,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Folder,
  Image as ImageIcon,
  Video as VideoIcon,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReportModalProps {
  report: AnalysisReport | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ report, onClose }) => {
  const [activeTab, setActiveTab] = useState<'text' | 'visual'>('text');
  const [copied, setCopied] = useState(false);
  const [selectedRetailerFilter, setSelectedRetailerFilter] = useState<string>('all');

  useEffect(() => {
    if (report && report.totalInconsistentFiles === 0 && report.totalRetailersValidated > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }
    }
  }, [report]);

  if (!report) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(report.rawTxtReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handleDownload = () => {
    downloadTextReport(report);
  };

  // Syntax highlight the plain text report lines
  const renderFormattedLine = (line: string, index: number) => {
    if (line.includes('[OK]')) {
      const parts = line.split('[OK]');
      return (
        <div key={index} className="py-0.5 leading-relaxed text-slate-300">
          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 mr-2 text-xs">
            [OK]
          </span>
          <span>{parts[1]}</span>
        </div>
      );
    }
    if (line.includes('[ERROR]')) {
      const parts = line.split('[ERROR]');
      return (
        <div key={index} className="py-0.5 leading-relaxed text-slate-200">
          <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 mr-2 text-xs">
            [ERROR]
          </span>
          <span className="text-rose-200">{parts[1]}</span>
        </div>
      );
    }
    if (line.includes('[ADVERTENCIA]')) {
      const parts = line.split('[ADVERTENCIA]');
      return (
        <div key={index} className="py-0.5 leading-relaxed text-slate-300">
          <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 mr-2 text-xs">
            [ADVERTENCIA]
          </span>
          <span className="text-amber-200/90">{parts[1]}</span>
        </div>
      );
    }
    if (line.includes('[INFO]')) {
      const parts = line.split('[INFO]');
      return (
        <div key={index} className="py-0.5 leading-relaxed text-slate-300">
          <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 mr-2 text-xs">
            [INFO]
          </span>
          <span className="text-indigo-200/90">{parts[1]}</span>
        </div>
      );
    }
    if (line.startsWith('E-RETAILER:')) {
      return (
        <div key={index} className="text-indigo-300 font-bold text-sm tracking-wide pt-2">
          {line}
        </div>
      );
    }
    if (line.startsWith('==') || line.startsWith('--')) {
      return (
        <div key={index} className="text-slate-600 font-mono text-xs select-none">
          {line}
        </div>
      );
    }
    if (line.includes('REPORTE DE VALIDACIÓN PDP')) {
      return (
        <div key={index} className="text-white font-black text-sm tracking-wider uppercase text-center sm:text-left py-1">
          {line}
        </div>
      );
    }
    if (line.startsWith('[+] CARPETA ANALIZADA:')) {
      return (
        <div key={index} className="text-slate-300 font-medium text-xs bg-white/5 p-2 rounded-lg border border-white/10 my-1">
          {line}
        </div>
      );
    }
    if (line.startsWith('RESUMEN DEL ANÁLISIS:')) {
      return (
        <div key={index} className="text-slate-100 font-bold text-sm pt-2">
          {line}
        </div>
      );
    }

    return (
      <div key={index} className="text-slate-400 leading-relaxed">
        {line || '\u00A0'}
      </div>
    );
  };

  const filteredRetailers =
    selectedRetailerFilter === 'all'
      ? report.retailers
      : report.retailers.filter((r) => r.retailerSpec.id === selectedRetailerFilter);

  return (
    <div
      id="report-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl overflow-y-auto"
    >
      <div
        id="report-modal-container"
        className="relative w-full max-w-5xl bg-[#09090b]/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] backdrop-blur-2xl"
      >
        {/* Modal Header with Mac dots */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 mr-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <span>Reporte de Validación PDP</span>
                <span className="text-indigo-400 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  {report.countryName}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Carpeta: {report.rootFolderName ? `/${report.rootFolderName}/` : 'Directorio local'} • {report.analyzedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-close-report-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
              title="Cerrar reporte"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Summary Bar */}
        <div className="grid grid-cols-3 gap-3 px-6 py-3 bg-white/[0.01] border-b border-white/10 text-xs">
          <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/10">
            <Folder className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Retailers Validados</span>
              <span className="text-slate-100 font-bold text-sm">
                {report.totalRetailersValidated} / {report.totalRetailersExpected}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Archivos Conformes</span>
              <span className="text-emerald-400 font-bold text-sm">{report.totalConformFiles}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white/[0.03] px-4 py-2.5 rounded-2xl border border-white/10">
            <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Inconsistencias</span>
              <span className={`font-bold text-sm ${report.totalInconsistentFiles > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {report.totalInconsistentFiles}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 bg-white/[0.01] border-b border-white/10">
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              id="tab-text-report"
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'text'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Reporte Texto (.txt)</span>
            </button>

            <button
              id="tab-visual-audit"
              onClick={() => setActiveTab('visual')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'visual'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Auditoría Visual ({report.retailers.reduce((a, b) => a + b.files.length, 0)})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-report-txt"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-colors uppercase tracking-wider"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>

            <button
              id="btn-download-report-txt"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all active:scale-[0.98] uppercase tracking-wider"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar .txt</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-black/40 custom-scrollbar">
          {activeTab === 'text' ? (
            <div
              id="text-report-output-box"
              className="font-mono text-xs sm:text-sm bg-black/60 p-5 rounded-2xl border border-white/10 shadow-inner whitespace-pre-wrap select-text selection:bg-indigo-500/30 leading-relaxed backdrop-blur-md"
            >
              {report.rawTxtReport.split('\n').map((line, idx) => renderFormattedLine(line, idx))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filter pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
                <button
                  onClick={() => setSelectedRetailerFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    selectedRetailerFilter === 'all'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                  }`}
                >
                  Todos ({report.retailers.length})
                </button>
                {report.retailers.map((r) => (
                  <button
                    key={r.retailerSpec.id}
                    onClick={() => setSelectedRetailerFilter(r.retailerSpec.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedRetailerFilter === r.retailerSpec.id
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{r.retailerSpec.name}</span>
                    {r.hasErrors ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    ) : r.files.length > 0 ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Retailers Visual Cards */}
              {filteredRetailers.map((retailerResult) => {
                const spec = retailerResult.retailerSpec;
                const hasFiles = retailerResult.files.length > 0;

                return (
                  <div
                    key={spec.id}
                    className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden backdrop-blur-xl"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-slate-100">{spec.name}</h3>
                          {retailerResult.matchedFolderName && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-indigo-300 border border-white/10">
                              /{retailerResult.matchedFolderName}/
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          Target: {spec.width}x{spec.height}px ({spec.aspectRatio}) • Máx: {spec.maxImages} imgs
                          {spec.maxFileSizeKB ? ` • Peso máx: ${spec.maxFileSizeKB}KB` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasFiles ? (
                          retailerResult.hasErrors ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              Con Inconsistencias
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Conforme ({retailerResult.conformFilesCount} archivos)
                            </span>
                          )
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-400 border border-white/10">
                            Sin archivos en carpeta
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bullet summary tags */}
                    <div className="space-y-1.5 mb-4">
                      {retailerResult.bulletItems.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2 text-xs">
                          {bullet.type === 'OK' && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold flex-shrink-0">
                              [OK]
                            </span>
                          )}
                          {bullet.type === 'ERROR' && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-bold flex-shrink-0">
                              [ERROR]
                            </span>
                          )}
                          {bullet.type === 'ADVERTENCIA' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-bold flex-shrink-0">
                              [ADVERTENCIA]
                            </span>
                          )}
                          {bullet.type === 'INFO' && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-bold flex-shrink-0">
                              [INFO]
                            </span>
                          )}
                          <span className="text-slate-300">{bullet.message}</span>
                        </div>
                      ))}
                    </div>

                    {/* File Gallery */}
                    {hasFiles && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                        {retailerResult.files.map((file, fIdx) => {
                          const hasErr = file.errors.length > 0;
                          const hasWarn = file.warnings.length > 0;

                          return (
                            <div
                              key={fIdx}
                              className={`group relative rounded-xl border p-2 bg-black/40 flex flex-col justify-between transition-all backdrop-blur-sm ${
                                hasErr
                                  ? 'border-rose-500/50 bg-rose-950/20'
                                  : hasWarn
                                  ? 'border-amber-500/40'
                                  : 'border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white/5 flex items-center justify-center mb-2">
                                {file.isImage && file.previewUrl ? (
                                  <img
                                    src={file.previewUrl}
                                    alt={file.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : file.isVideo ? (
                                  <div className="flex flex-col items-center justify-center text-indigo-400 p-2">
                                    <VideoIcon className="w-8 h-8 mb-1" />
                                    <span className="text-[10px] font-mono">Video MP4</span>
                                  </div>
                                ) : (
                                  <ImageIcon className="w-8 h-8 text-slate-600" />
                                )}

                                {/* Status chip */}
                                <div className="absolute top-1 right-1">
                                  {hasErr ? (
                                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                                      !
                                    </span>
                                  ) : (
                                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <p className="text-[11px] font-medium text-slate-200 truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                                  <span>{file.width ? `${file.width}x${file.height}px` : file.extension}</span>
                                  <span>{file.sizeKB} KB</span>
                                </div>

                                {hasErr && (
                                  <div className="mt-1 text-[10px] text-rose-300 bg-rose-950/50 p-1 rounded border border-rose-800/50 leading-tight">
                                    {file.errors[0]}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <p className="text-xs text-slate-400 font-mono">
            Validador de PDPs • 100% procesado en el navegador
          </p>

          <button
            id="btn-close-footer"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs uppercase tracking-wider font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
