import React, { useRef, useState } from 'react';
import { CountryInfo } from '../types';
import {
  FolderUp,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Film,
  Copy,
  Check,
  RotateCcw,
  FileCheck2,
} from 'lucide-react';
import {
  analyzeImageSizes,
  ImageCounterResult,
  COUNTER_ASSET_EXTENSIONS,
} from '../utils/imageCounter';

interface ImageCounterDropZoneProps {
  country: CountryInfo;
  onBack: () => void;
}

export const ImageCounterDropZone: React.FC<ImageCounterDropZoneProps> = ({
  onBack,
}) => {
  const [, setSelectedFiles] = useState<File[]>([]);
  const [, setRootFolderName] = useState<string>('');
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

    const validAssets = files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return COUNTER_ASSET_EXTENSIONS.includes(ext);
    });

    if (validAssets.length === 0) {
      setValidationAlert('La carpeta seleccionada no contiene archivos de imagen o video válidos (JPG, PNG, WEBP, MP4, MOV, etc.).');
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
      setValidationAlert(err?.message || 'Ocurrió un error al analizar los tamaños de los assets.');
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
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (filesInputRef.current) filesInputRef.current.value = '';
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
                CONTADOR DE ASSETS
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Imágenes y Videos
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Selecciona una carpeta para contar cuántos assets (imágenes y videos) hay de cada tamaño y obtener una lista fácil de copiar.
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
            className={`p-8 sm:p-12 rounded-2xl border-2 border-dashed transition-all text-center backdrop-blur-xl ${
              isDraggingFolder
                ? 'border-cyan-400 bg-cyan-500/10 scale-[1.005]'
                : 'border-white/15 bg-white/[0.02] hover:border-cyan-500/40 hover:bg-white/[0.04]'
            }`}
          >
            {/* Hidden native input with webkitdirectory for full folder selection */}
            <input
              type="file"
              ref={folderInputRef}
              onChange={(e) => e.target.files && handleFolderSelection(e.target.files)}
              {...({ webkitdirectory: '', directory: '' } as any)}
              multiple
              className="hidden"
            />

            {/* Hidden files-only input as fallback */}
            <input
              type="file"
              ref={filesInputRef}
              onChange={(e) => e.target.files && handleFolderSelection(e.target.files)}
              multiple
              accept="image/*,video/*"
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
                  Analiza de inmediato todos los archivos de imagen y video contenidos en la carpeta y subcarpetas para identificar sus resoluciones (ancho x alto).
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
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <ImageIcon className="w-4 h-4" />
                    <Film className="w-4 h-4" />
                  </div>
                  <span>O seleccionar archivos</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 font-mono pt-1">
                Formatos: JPG, PNG, WEBP, GIF, SVG, BMP, MP4, MOV, WEBM, MKV
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
              Contando assets por tamaño...
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
                {currentProgress.current} de {currentProgress.total} assets ({Math.round((currentProgress.current / currentProgress.total) * 100)}%)
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
                Assets analizados
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
                  {result.totalAssets}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({result.totalImages} img · {result.totalVideos} vid)
                </span>
              </div>
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
                {result.totalUnsupported}
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
                  Lista formateada con viñetas y total, lista para copiar con un clic.
                </p>
              </div>

              <button
                onClick={handleCopyText}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border shadow-md active:scale-[0.98] ${
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
                {result.formattedText || 'No se encontraron imágenes o videos en la carpeta seleccionada.'}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>{result.sizeCounts.length} {result.sizeCounts.length === 1 ? 'resolución encontrada' : 'resoluciones encontradas'}</span>
              <span>Haz clic en "Copiar lista" para copiar todo el texto</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
