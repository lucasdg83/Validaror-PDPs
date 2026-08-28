import React, { useRef, useState } from 'react';
import { CountryInfo, BriefAnalysisResult } from '../types';
import {
  FolderUp,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Search,
  Download,
  FileCode,
  Layers,
} from 'lucide-react';
import { BriefFileHolder, extractDocText } from '../utils/adaptationValidator';
import { analyzePMBrief } from '../utils/briefAnalyzer';
import { BriefAnalysisModal } from './BriefAnalysisModal';

interface AdaptationsDropZoneProps {
  country: CountryInfo;
  onValidate: (brief: BriefFileHolder, imageFiles: File[]) => void;
  onBack: () => void;
  isProcessing: boolean;
  progress?: { current: number; total: number; message: string };
}

export const AdaptationsDropZone: React.FC<AdaptationsDropZoneProps> = ({
  country,
  onValidate,
  onBack,
  isProcessing,
  progress,
}) => {
  // Mode: 'audit' (Images vs Specs) or 'analyze_brief' (Standalone PM Brief Analyzer)
  const [activeMode, setActiveMode] = useState<'audit' | 'analyze_brief'>('audit');

  // State for Audit Mode
  const [briefHolder, setBriefHolder] = useState<BriefFileHolder | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  const [isDraggingBrief, setIsDraggingBrief] = useState(false);
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);

  // State for Standalone Brief Analyzer Mode
  const [standaloneBriefFile, setStandaloneBriefFile] = useState<File | null>(null);
  const [isAnalyzingBrief, setIsAnalyzingBrief] = useState(false);
  const [briefAnalyzeStatus, setBriefAnalyzeStatus] = useState<string>('');
  const [briefAnalysisResult, setBriefAnalysisResult] = useState<BriefAnalysisResult | null>(null);
  const [isDraggingStandaloneBrief, setIsDraggingStandaloneBrief] = useState(false);

  const briefInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const standaloneBriefInputRef = useRef<HTMLInputElement>(null);

  // Handle Brief File selection (PDF, PPTX, PPT, DOCX, DOC)
  const handleBriefFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'pptx', 'ppt', 'docx', 'doc'].includes(ext)) {
      setValidationAlert('Formato no soportado para el brief. Por favor adjunte un archivo PDF, PPTX, PPT, DOCX o DOC.');
      return;
    }

    setValidationAlert(null);
    let extractedText = '';
    if (ext === 'docx' || ext === 'doc') {
      extractedText = await extractDocText(file);
    }

    setBriefHolder({
      file,
      name: file.name,
      type: ext === 'pdf' ? 'pdf' : ext === 'pptx' ? 'pptx' : ext === 'ppt' ? 'ppt' : ext === 'docx' ? 'docx' : 'doc',
      sizeBytes: file.size,
      extractedText: extractedText || undefined,
    });
  };

  // Handle Standalone Brief File
  const handleStandaloneBriefFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['pdf', 'pptx', 'ppt', 'docx', 'doc'].includes(ext)) {
      setValidationAlert('Formato no soportado. Por favor adjunte un archivo de presentación o documento (PDF, PPT, PPTX, DOC o DOCX).');
      return;
    }
    setValidationAlert(null);
    setStandaloneBriefFile(file);
  };

  // Run standalone PM brief analysis
  const handleRunBriefAnalysis = async (fileToAnalyze?: File) => {
    const targetFile = fileToAnalyze || standaloneBriefFile || briefHolder?.file;
    if (!targetFile) {
      setValidationAlert('Por favor seleccione o arrastre un archivo de brief (PDF, PPT o Word) para analizar.');
      return;
    }

    setValidationAlert(null);
    setIsAnalyzingBrief(true);
    setBriefAnalyzeStatus('Iniciando análisis del brief...');

    try {
      const result = await analyzePMBrief(targetFile, (msg) => {
        setBriefAnalyzeStatus(msg);
      });
      setBriefAnalysisResult(result);
    } catch (err: any) {
      console.error('Error analyzing PM brief:', err);
      setValidationAlert('Ocurrió un error al analizar el documento. Por favor intente nuevamente.');
    } finally {
      setIsAnalyzingBrief(false);
      setBriefAnalyzeStatus('');
    }
  };

  // Handle Folder selection
  const handleImageFiles = (files: File[]) => {
    const validImages = files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    });

    if (validImages.length === 0) {
      setValidationAlert('No se encontraron imágenes válidas (JPG, PNG, WEBP) en la carpeta seleccionada.');
      return;
    }

    setValidationAlert(null);
    setImageFiles(validImages);
  };

  // Drag & drop handlers for Brief in Audit mode
  const handleBriefDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBrief(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBriefFile(e.dataTransfer.files[0]);
    }
  };

  // Drag & drop handlers for Standalone Brief
  const handleStandaloneBriefDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingStandaloneBrief(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleStandaloneBriefFile(e.dataTransfer.files[0]);
    }
  };

  // Drag & drop handlers for Images Folder
  const handleFolderDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFolder(false);

    const items = e.dataTransfer.items;
    const fileList: File[] = [];

    if (items && items.length > 0) {
      const traverseEntry = async (entry: any, path = '') => {
        if (entry.isFile) {
          return new Promise<void>((resolve) => {
            entry.file((file: File) => {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: path ? `${path}/${file.name}` : file.name,
                writable: false,
              });
              fileList.push(file);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const readEntries = async (): Promise<any[]> => {
            return new Promise((resolve) => {
              dirReader.readEntries((entries: any[]) => resolve(entries));
            });
          };
          let entries = await readEntries();
          while (entries.length > 0) {
            for (const subEntry of entries) {
              await traverseEntry(subEntry, path ? `${path}/${entry.name}` : entry.name);
            }
            entries = await readEntries();
          }
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.webkitGetAsEntry) {
          const entry = item.webkitGetAsEntry();
          if (entry) await traverseEntry(entry);
        } else {
          const file = item.getAsFile();
          if (file) fileList.push(file);
        }
      }
    } else if (e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        fileList.push(e.dataTransfer.files[i]);
      }
    }

    handleImageFiles(fileList);
  };

  // Trigger Validation Button Check
  const handleStartValidation = () => {
    const hasBrief = !!briefHolder;
    const hasImages = imageFiles.length > 0;

    if (!hasBrief && !hasImages) {
      setValidationAlert('⚠️ Debe adjuntar el archivo de especificaciones (PPT, PDF, DOC o DOCX) y seleccionar la carpeta con imágenes antes de iniciar la validación.');
      return;
    }

    if (!hasBrief) {
      setValidationAlert('⚠️ Falta adjuntar el archivo de especificaciones (PPT, PDF, DOC o DOCX con las notas del PM) para poder iniciar la validación.');
      return;
    }

    if (!hasImages) {
      setValidationAlert('⚠️ Falta seleccionar la carpeta con las imágenes a evaluar.');
      return;
    }

    setValidationAlert(null);
    onValidate(briefHolder, imageFiles);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Bar with Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={isProcessing || isAnalyzingBrief}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold uppercase tracking-wider border border-white/10 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </button>
      </div>

      {/* Header Info & Mode Switcher */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-3xl shadow-inner">
              🔄
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight">
                Módulo de Adaptaciones
              </h2>
              <p className="text-xs text-slate-400">
                Auditoría contra Brief y Análisis de Requerimientos de PM
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center p-1.5 rounded-xl bg-black/40 border border-white/10 text-xs self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveMode('audit');
                setValidationAlert(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeMode === 'audit'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Auditar Imágenes vs. Specs</span>
            </button>

            <button
              id="tab-analizar-brief-pm"
              onClick={() => {
                setActiveMode('analyze_brief');
                setValidationAlert(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeMode === 'analyze_brief'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Analizar Presentación / Brief PM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Validation Alert */}
      {validationAlert && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3 text-xs sm:text-sm font-medium animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{validationAlert}</div>
          <button
            onClick={() => setValidationAlert(null)}
            className="text-amber-300 hover:text-amber-100 text-xs uppercase font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode 1: AUDITAR IMÁGENES VS SPECS */}
      {activeMode === 'audit' ? (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Dual Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Brief Specs File (PPT / PDF / DOC / DOCX) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingBrief(true);
              }}
              onDragLeave={() => setIsDraggingBrief(false)}
              onDrop={handleBriefDrop}
              className={`flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
                isDraggingBrief
                  ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                  : briefHolder
                  ? 'bg-emerald-500/[0.03] border-emerald-500/30'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                        1. Archivo de Specs (PPT / PDF / Word)
                      </h3>
                      <p className="text-[11px] text-slate-400">Brief con las notas del PM</p>
                    </div>
                  </div>

                  {briefHolder && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Cargado
                    </span>
                  )}
                </div>

                {briefHolder ? (
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 mb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-2xl">
                          {briefHolder.type === 'pdf'
                            ? '📄'
                            : briefHolder.type === 'docx' || briefHolder.type === 'doc'
                            ? '📝'
                            : '📊'}
                        </span>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-slate-200 truncate">{briefHolder.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {(briefHolder.sizeBytes / 1024).toFixed(1)} KB • {briefHolder.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleRunBriefAnalysis(briefHolder.file)}
                          title="Analizar solo este brief"
                          disabled={isAnalyzingBrief}
                          className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 border border-indigo-500/30 transition-colors"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Analizar</span>
                        </button>
                        <button
                          onClick={() => setBriefHolder(null)}
                          title="Eliminar archivo"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-white/10 rounded-xl mb-4 hover:border-indigo-500/40 transition-colors">
                    <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Arrastra aquí el archivo PPT, PDF, DOC o DOCX
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Conteniendo las notas manuscritas o textos del PM
                    </p>
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={briefInputRef}
                  type="file"
                  accept=".pdf,.pptx,.ppt,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleBriefFile(e.target.files[0]);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => briefInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>{briefHolder ? 'Cambiar Archivo' : 'Seleccionar Archivo (PPT / PDF / Word)'}</span>
                </button>
              </div>
            </div>

            {/* Card 2: Folder of Images to Audit */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFolder(true);
              }}
              onDragLeave={() => setIsDraggingFolder(false)}
              onDrop={handleFolderDrop}
              className={`flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
                isDraggingFolder
                  ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                  : imageFiles.length > 0
                  ? 'bg-emerald-500/[0.03] border-emerald-500/30'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <FolderUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                        2. Carpeta con Imágenes
                      </h3>
                      <p className="text-[11px] text-slate-400">Piezas adaptadas a validar</p>
                    </div>
                  </div>

                  {imageFiles.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      {imageFiles.length} imgs
                    </span>
                  )}
                </div>

                {imageFiles.length > 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 mb-4 max-h-[140px] overflow-y-auto space-y-1.5 scrollbar-thin">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1 border-b border-white/5">
                      <span>{imageFiles.length} archivos cargados:</span>
                      <button
                        onClick={() => setImageFiles([])}
                        title="Vaciar lista"
                        className="text-[11px] text-slate-400 hover:text-rose-400"
                      >
                        Vaciar
                      </button>
                    </div>
                    {imageFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="font-mono">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-white/10 rounded-xl mb-4 hover:border-indigo-500/40 transition-colors">
                    <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-200">
                      Arrastra aquí la carpeta de imágenes
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Formatos soportados: JPG, JPEG, PNG, WEBP
                    </p>
                  </div>
                )}
              </div>

              <div>
                <input
                  ref={folderInputRef}
                  type="file"
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleImageFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FolderUp className="w-4 h-4 text-indigo-400" />
                  <span>{imageFiles.length > 0 ? 'Cambiar Carpeta' : 'Seleccionar Carpeta'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Validation Trigger CTA */}
          <div className="flex justify-center pt-2">
            <button
              id="btn-iniciar-validacion-adaptaciones"
              onClick={handleStartValidation}
              disabled={isProcessing || isAnalyzingBrief}
              className="w-full sm:w-auto min-w-[280px] px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white border border-indigo-400/30 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Validar Adaptaciones</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Mode 2: ANALIZADOR DE BRIEF / PRESENTACIÓN PM (Standalone) */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingStandaloneBrief(true);
            }}
            onDragLeave={() => setIsDraggingStandaloneBrief(false)}
            onDrop={handleStandaloneBriefDrop}
            className={`p-8 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
              isDraggingStandaloneBrief
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                : standaloneBriefFile
                ? 'bg-indigo-500/[0.03] border-indigo-500/40'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }`}
          >
            <div className="max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8 text-indigo-300" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-100 uppercase tracking-tight">
                  Analizador Inteligente de Briefs y Pedidos de PM
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
                  Sube cualquier archivo PPT, PDF, DOC o DOCX para evaluar la claridad del pedido,
                  extraer todos los enlaces (DAM Opera, KV, descargas) y desglosar cada acción solicitada en texto plano y PDF.
                </p>
              </div>

              {standaloneBriefFile ? (
                <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 max-w-md mx-auto flex items-center justify-between text-left">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-3xl">
                      {standaloneBriefFile.name.endsWith('.pdf')
                        ? '📄'
                        : standaloneBriefFile.name.endsWith('.docx') || standaloneBriefFile.name.endsWith('.doc')
                        ? '📝'
                        : '📊'}
                    </span>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-200 truncate">
                        {standaloneBriefFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {(standaloneBriefFile.size / 1024).toFixed(1)} KB • Documento seleccionado
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStandaloneBriefFile(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                    title="Quitar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl hover:border-indigo-500/40 transition-colors">
                  <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-200">
                    Arrastra aquí el archivo de Brief / Presentación
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Formatos soportados: .pdf, .pptx, .ppt, .docx, .doc
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <input
                  ref={standaloneBriefInputRef}
                  type="file"
                  accept=".pdf,.pptx,.ppt,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleStandaloneBriefFile(e.target.files[0]);
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => standaloneBriefInputRef.current?.click()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>{standaloneBriefFile ? 'Cambiar Archivo' : 'Examinar Archivo'}</span>
                </button>

                <button
                  id="btn-analizar-pedido-pm"
                  onClick={() => handleRunBriefAnalysis()}
                  disabled={!standaloneBriefFile || isAnalyzingBrief}
                  className="w-full sm:w-auto min-w-[240px] px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  {isAnalyzingBrief ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{briefAnalyzeStatus || 'Analizando Documento...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Analizar Pedido del PM</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Access to Last Analyzed Result if available */}
          {briefAnalysisResult && (
            <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Último Análisis Generado: {briefAnalysisResult.productOrBrand}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Archivo: {briefAnalysisResult.fileName} • Claridad: {briefAnalysisResult.clarityScore}% ({briefAnalysisResult.clarityStatus.toUpperCase()})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBriefAnalysisResult(briefAnalysisResult)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  Ver Reporte Completo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar (if processing audit) */}
      {isProcessing && (
        <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-slate-200 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="flex items-center gap-2 text-indigo-300">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              {progress?.message || 'Procesando auditoría...'}
            </span>
            <span className="font-mono text-indigo-300">
              {progress ? `${progress.current} / ${progress.total}` : 'Iniciando...'}
            </span>
          </div>
          <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
              style={{
                width: progress && progress.total > 0
                  ? `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`
                  : '30%',
              }}
            />
          </div>
        </div>
      )}

      {/* Brief Analysis Modal Viewer */}
      <BriefAnalysisModal
        result={briefAnalysisResult}
        onClose={() => setBriefAnalysisResult(null)}
      />
    </div>
  );
};


