import React, { useRef, useState } from 'react';
import { CountryInfo } from '../types';
import {
  FolderUp,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Copy,
  Check,
  RotateCcw,
  Layers,
  FileCheck2,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  analyzeImageSizes,
  ImageCounterResult,
  COUNTER_IMAGE_EXTENSIONS,
} from '../utils/imageCounter';

interface ImageCounterDropZoneProps {
  country: CountryInfo;
  onBack: () => void;
}

export const ImageCounterDropZone: React.FC<ImageCounterDropZoneProps> = ({
  onBack,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>('');
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<{ current: number; total: number; fileName: string }>({
    current: 0,
    total: 0,
    fileName: '',
  });
  const [result, setResult] = useState<ImageCounterResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedSizes, setExpandedSizes] = useState<Record<string, boolean>>({});

  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelection = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // Derive root folder name
    let root = 'Carpeta Local';
    const firstWithRelative = files.find((f) => (f as any).webkitRelativePath);
    if (firstWithRelative && (firstWithRelative as any).webkitRelativePath) {
      const parts = (firstWithRelative as any).webkitRelativePath.split('/');
      if (parts.length > 1) {
        root = parts[0];
      }
    }

    const imageFiles = files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return COUNTER_IMAGE_EXTENSIONS.includes(ext);
    });

    if (imageFiles.length === 0) {
      setValidationAlert('La carpeta seleccionada no contiene archivos de imagen válidos (JPG, PNG, WEBP, etc.).');
      return;
    }

    setValidationAlert(null);
    setRootFolderName(root);
    setSelectedFiles(files);
    setCopied(false);

    // Automatically trigger analysis for seamless experience
    runAnalysis(files);
  };

  const runAnalysis = async (files: File[]) => {
    setIsAnalyzing(true);
    setCurrentProgress({ current: 0, total: files.length, fileName: 'Iniciando lectura...' });

    try {
      const res = await analyzeImageSizes(files, (curr, tot, name) => {
        setCurrentProgress({ current: curr, total: tot, fileName: name });
      });
      setResult(res);
    } catch (err: any) {
      console.error('Error in analyzeImageSizes:', err);
      setValidationAlert(err?.message || 'Ocurrió un error al analizar los tamaños de las imágenes.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFolder(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFolderSelection(e.dataTransfer.files);
    }
  };

  const handleCopyText = async () => {
    if (!result || !result.formattedText) return;
    try {
      await navigator.clipboard.writeText(result.formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Error copying text:', err);
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = result.formattedText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setRootFolderName('');
    setResult(null);
    setValidationAlert(null);
    setCopied(false);
    setExpandedSizes({});
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (filesInputRef.current) filesInputRef.current.value = '';
  };

  const toggleSizeExpand = (key: string) => {
    setExpandedSizes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors text-xs font-semibold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-2xl">🔢</span>
                CONTADOR DE TAMAÑOS
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Píxeles
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona una carpeta para contar cuántas imágenes hay de cada tamaño y obtener una lista fácil de copiar.
            </p>
          </div>
        </div>

        {result && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-xs font-medium self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Elegir otra carpeta</span>
          </button>
        )}
      </div>

      {/* Alert message if any */}
      {validationAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>{validationAlert}</span>
          <button
            onClick={() => setValidationAlert(null)}
            className="text-rose-400 hover:text-white font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* If No Result Yet and Not Analyzing: Show Folder Selection DropZone */}
      {!result && !isAnalyzing && (
        <div className="space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFolder(true);
            }}
            onDragLeave={() => setIsDraggingFolder(false)}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-10 sm:p-14 text-center transition-all backdrop-blur-xl ${
              isDraggingFolder
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.005]'
                : 'border-white/15 bg-white/[0.02] hover:border-cyan-500/40 hover:bg-white/[0.04]'
            }`}
          >
            {/* Hidden native folder input */}
            <input
              type="file"
              ref={folderInputRef}
              onChange={(e) => e.target.files && handleFolderSelection(e.target.files)}
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
            />

            {/* Hidden files-only input as fallback */}
            <input
              type="file"
              ref={filesInputRef}
              onChange={(e) => e.target.files && handleFolderSelection(e.target.files)}
              multiple
              accept="image/*"
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
                <FolderUp className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-100">
                  Arrastra o selecciona la carpeta a contar
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Analiza de inmediato todos los archivos de imagen contenidos en la carpeta y subcarpetas para identificar sus resoluciones (ancho x alto).
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-600/25 border border-cyan-400/40 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>Seleccionar Carpeta</span>
                </button>

                <button
                  type="button"
                  onClick={() => filesInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all border border-white/10 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-slate-400" />
                  <span>O seleccionar archivos</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-mono pt-1">
                Formatos soportados: JPG, JPEG, PNG, WEBP, GIF, SVG, BMP, AVIF
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress / Loading State */}
      {isAnalyzing && (
        <div className="p-10 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-center space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-100">
              Contando imágenes por tamaño...
            </h3>
            <p className="text-xs text-slate-400 font-mono truncate max-w-md mx-auto">
              {currentProgress.fileName || 'Procesando dimensiones...'}
            </p>
          </div>

          {currentProgress.total > 0 && (
            <div className="max-w-xs mx-auto space-y-1.5 pt-2">
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-150"
                  style={{
                    width: `${Math.min(100, Math.round((currentProgress.current / currentProgress.total) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {currentProgress.current} de {currentProgress.total} imágenes ({Math.round((currentProgress.current / currentProgress.total) * 100)}%)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Result View */}
      {result && !isAnalyzing && (
        <div className="space-y-6">
          {/* Summary Pills Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                Carpeta
              </span>
              <span className="text-sm sm:text-base font-bold text-white truncate block font-mono">
                /{result.rootFolderName}/
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                Imágenes analizadas
              </span>
              <span className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono block">
                {result.totalImages}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                Tamaños diferentes
              </span>
              <span className="text-xl sm:text-2xl font-bold text-indigo-400 font-mono block">
                {result.uniqueSizesCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">
                Otros archivos
              </span>
              <span className="text-xl sm:text-2xl font-bold text-slate-400 font-mono block">
                {result.totalNonImages}
              </span>
            </div>
          </div>

          {/* Primary Feature: Easy to Read and Copyable Text Output */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-6 sm:p-8 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-cyan-400" />
                  Resultado del conteo de tamaños
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lista formateada y lista para copiar con el desglose exacto de imágenes.
                </p>
              </div>

              <button
                onClick={handleCopyText}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border shadow-md active:scale-[0.98] ${
                  copied
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-emerald-500/10'
                    : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-400/30 text-white shadow-cyan-600/25'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>¡Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar lista</span>
                  </>
                )}
              </button>
            </div>

            {/* Formatted Text Box */}
            <div className="relative">
              <div className="p-4 sm:p-6 rounded-xl bg-black/40 border border-white/10 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed select-all whitespace-pre-wrap">
                {result.formattedText || 'No se encontraron imágenes en la carpeta seleccionada.'}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>{result.sizeCounts.length} resoluciones encontradas</span>
              <span>Haz clic en "Copiar lista" para copiar todo el texto</span>
            </div>
          </div>

          {/* Detailed Visual Breakdown (Optional per-dimension inspection) */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Desglose por resolución ({result.sizeCounts.length})
              </h4>
            </div>

            <div className="space-y-2">
              {result.sizeCounts.map((item, idx) => {
                const key = `${item.width}x${item.height}`;
                const isExpanded = expandedSizes[key] || false;

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 transition-all"
                  >
                    <div
                      onClick={() => toggleSizeExpand(key)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white">
                              {item.width} × {item.height} px
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/5 text-slate-300 border border-white/10">
                              Ratio {item.aspectRatio}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {item.count} {item.count === 1 ? 'imagen' : 'imágenes'} ({Math.round((item.count / result.totalImages) * 100)}% del total)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm text-cyan-300 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          {item.count} {item.count === 1 ? 'archivo' : 'archivos'}
                        </span>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-white p-1"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible list of filenames for this size */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-1 pl-11">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                          Archivos con esta resolución ({item.files.length}):
                        </span>
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                          {item.files.map((file, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-center justify-between text-xs font-mono text-slate-300 p-1.5 rounded bg-black/20 hover:bg-black/30"
                            >
                              <span className="truncate pr-2">{file.relativePath}</span>
                              <span className="text-[10px] text-slate-400 flex-shrink-0">
                                {file.sizeKB} KB
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
