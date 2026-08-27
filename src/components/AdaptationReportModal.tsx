import React, { useState } from 'react';
import { AdaptationReport } from '../types';
import {
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  Maximize2,
  Sparkles,
  Layers,
  Crop,
  Languages,
  Eraser,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdaptationReportModalProps {
  report: AdaptationReport | null;
  onClose: () => void;
}

export const AdaptationReportModal: React.FC<AdaptationReportModalProps> = ({
  report,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ok' | 'error' | 'ambiguous'>('all');
  const [viewMode, setViewMode] = useState<'visual' | 'text'>('visual');

  if (!report) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(report.rawTxtReport);
    setCopied(true);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.85 } });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([report.rawTxtReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Reporte_Adaptaciones_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const filteredItems = report.items.filter((item) => {
    if (filter === 'ok') return item.status === 'OK';
    if (filter === 'error') return item.status === 'ERROR';
    if (filter === 'ambiguous') return item.status === 'AMBIGUOUS';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0e0e12] border border-white/10 shadow-2xl shadow-black/80 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xl">
              🔄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100 uppercase tracking-tight">
                  Reporte de Adaptaciones
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  {report.briefFileType.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Brief: <strong className="text-slate-200">{report.briefFileName}</strong> • {report.analyzedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switch (Visual / Raw text) */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  viewMode === 'visual'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Visual
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  viewMode === 'text'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Texto Plano
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* Executive Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Piezas</p>
              <p className="text-2xl font-black text-slate-100 mt-1 font-mono">{report.totalImagesAnalyzed}</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Conformes</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{report.conformImagesCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">Inconsistencias</p>
              <p className="text-2xl font-black text-rose-400 mt-1 font-mono">{report.inconsistentImagesCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Alertas PM</p>
              <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {report.ambiguityAlerts?.length || 0}
              </p>
            </div>
          </div>

          {/* AMBIGUITY ALERTS SECTION (Prominent Warning Box) */}
          {report.ambiguityAlerts && report.ambiguityAlerts.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  ⚠️ Alertas de Ambigüedad en el Brief (Aclaración Requerida con el PM)
                </h3>
              </div>
              <p className="text-xs text-amber-200/90">
                Las siguientes indicaciones manuscritas o notas del PM en el documento no se comprenden con exactitud o presentan contradicciones:
              </p>

              <div className="space-y-2.5 pt-1">
                {report.ambiguityAlerts.map((alert, idx) => (
                  <div
                    key={alert.id || idx}
                    className="p-3.5 rounded-xl bg-black/40 border border-amber-500/30 space-y-1.5 text-xs text-slate-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-300 uppercase tracking-wide">
                        {alert.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Severidad {alert.severity}
                      </span>
                    </div>
                    <p className="text-slate-300 italic">
                      " {alert.pmNoteText} "
                    </p>
                    <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-white/5">
                      <p><strong className="text-amber-200/80">Motivo:</strong> {alert.reason}</p>
                      <p><strong className="text-emerald-300">Aclaración sugerida:</strong> {alert.suggestedClarification}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Brief Summary Box */}
          {report.extractedBriefSummary && report.extractedBriefSummary.length > 0 && (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Instrucciones Detectadas en el Brief</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                {report.extractedBriefSummary.map((sum, i) => (
                  <li key={i} className="text-slate-300">{sum}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Visual View: Items Grid */}
          {viewMode === 'visual' ? (
            <div className="space-y-4">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Piezas Auditadas ({filteredItems.length})
                </h4>

                <div className="flex gap-1 text-xs font-semibold">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      filter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({report.items.length})
                  </button>
                  <button
                    onClick={() => setFilter('ok')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      filter === 'ok' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Conformes ({report.conformImagesCount})
                  </button>
                  <button
                    onClick={() => setFilter('error')}
                    className={`px-3 py-1 rounded-lg transition-colors ${
                      filter === 'error' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Inconsistencias ({report.inconsistentImagesCount})
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {filteredItems.map((item, idx) => {
                  const isOk = item.status === 'OK';
                  const isAmb = item.status === 'AMBIGUOUS';

                  return (
                    <div
                      key={idx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isOk
                          ? 'bg-emerald-500/[0.02] border-emerald-500/20'
                          : isAmb
                          ? 'bg-amber-500/[0.02] border-amber-500/30'
                          : 'bg-rose-500/[0.02] border-rose-500/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.fileName}
                              className="w-14 h-14 object-cover rounded-xl border border-white/10 bg-white/5"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                              <FileText className="w-6 h-6" />
                            </div>
                          )}

                          <div>
                            <h5 className="text-sm font-bold text-slate-100">{item.fileName}</h5>
                            <p className="text-xs text-slate-400 font-mono">
                              {item.width && item.height ? `${item.width}x${item.height}px` : 'N/A'} • Ratio: {item.aspectRatio || '1:1'}
                            </p>
                          </div>
                        </div>

                        <div>
                          {isOk ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Conforme
                            </span>
                          ) : isAmb ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Requiere Aclaración
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <XCircle className="w-3.5 h-3.5" />
                              Inconsistente
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tasks Check Table */}
                      {item.tasksEvaluated && item.tasksEvaluated.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Validación de Adaptación:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {item.tasksEvaluated.map((task, tIdx) => {
                              const icon =
                                task.taskType === 'resize' ? (
                                  <Crop className="w-3.5 h-3.5" />
                                ) : task.taskType === 'translation' ? (
                                  <Languages className="w-3.5 h-3.5" />
                                ) : task.taskType === 'element_removal' ? (
                                  <Eraser className="w-3.5 h-3.5" />
                                ) : (
                                  <Layers className="w-3.5 h-3.5" />
                                );

                              return (
                                <div
                                  key={tIdx}
                                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                                    task.passed
                                      ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                                      : 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                                  }`}
                                >
                                  <span className={task.passed ? 'text-emerald-400' : 'text-rose-400'}>
                                    {icon}
                                  </span>
                                  <div className="flex-1">
                                    <p className="font-semibold text-xs">{task.description}</p>
                                    {task.details && (
                                      <p className="text-[11px] text-slate-400 mt-0.5">{task.details}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Errors list */}
                      {item.errors.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.errors.map((err, eIdx) => (
                            <p key={eIdx} className="text-xs text-rose-400 flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{err}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Raw TXT View */
            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs text-slate-300 whitespace-pre overflow-x-auto leading-relaxed select-all">
              {report.rawTxtReport}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider border border-white/10 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar Reporte TXT'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-bold uppercase tracking-wider border border-white/10 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar TXT</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-indigo-500/20"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
