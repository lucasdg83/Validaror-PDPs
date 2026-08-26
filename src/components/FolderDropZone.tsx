import React, { useRef, useState } from 'react';
import { CountryInfo } from '../types';
import {
  FolderUp,
  FolderTree,
  Sparkles,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { downloadDemoZip } from '../utils/demoDataGenerator';

interface FolderDropZoneProps {
  country: CountryInfo;
  onFilesSelected: (files: File[]) => void;
  onDemoRun: () => void;
  onBack: () => void;
  isProcessing: boolean;
  progress?: { current: number; total: number; currentFile: string };
}

export const FolderDropZone: React.FC<FolderDropZoneProps> = ({
  country,
  onFilesSelected,
  onDemoRun,
  onBack,
  isProcessing,
  progress,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloadingDemo, setIsDownloadingDemo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const fileList: File[] = [];

    if (items && items.length > 0) {
      const traverseEntry = async (entry: any, path = '') => {
        if (entry.isFile) {
          return new Promise<void>((resolve) => {
            entry.file((file: File) => {
              // Polyfill webkitRelativePath
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
          if (entry) {
            await traverseEntry(entry);
          }
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

    if (fileList.length > 0) {
      onFilesSelected(fileList);
    }
  };

  const handleNativeFolderSelect = async () => {
    // If native File System Access API is supported
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const fileList: File[] = [];

        async function getFilesRecursively(handle: any, path: string) {
          for await (const entry of handle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              Object.defineProperty(file, 'webkitRelativePath', {
                value: `${dirHandle.name}/${entryPath}`,
                writable: false,
              });
              fileList.push(file);
            } else if (entry.kind === 'directory') {
              await getFilesRecursively(entry, entryPath);
            }
          }
        }

        await getFilesRecursively(dirHandle, '');
        if (fileList.length > 0) {
          onFilesSelected(fileList);
        }
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('showDirectoryPicker failed, falling back to input element:', err);
        } else {
          return;
        }
      }
    }

    // Fallback to hidden input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };

  const handleDownloadSampleZip = async () => {
    try {
      setIsDownloadingDemo(true);
      await downloadDemoZip(country.code);
    } finally {
      setIsDownloadingDemo(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Back button & Country Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <button
          id="btn-back-dashboard"
          onClick={onBack}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-3xl">{country.flag}</span>
          <div>
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">
              Validación PDP - <span className="text-indigo-400">{country.name}</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {country.expectedRetailersCount} subcarpetas esperadas de e-retailers
            </p>
          </div>
        </div>
      </div>

      {/* Hidden standard file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 backdrop-blur-xl ${
          isDragging
            ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01] shadow-2xl shadow-indigo-500/20'
            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
        }`}
      >
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative mb-6">
              <Loader2 className="w-14 h-14 text-indigo-400 animate-spin" />
              <Sparkles className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">
              Auditando especificaciones técnicas...
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              {progress
                ? `Procesando archivo ${progress.current} de ${progress.total}`
                : 'Inspeccionando dimensiones, ratios, DPI y secuencias...'}
            </p>

            {progress && (
              <div className="w-full max-w-xs bg-white/10 rounded-full h-2 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-200"
                  style={{
                    width: `${Math.round((progress.current / Math.max(1, progress.total)) * 100)}%`,
                  }}
                />
              </div>
            )}
            {progress?.currentFile && (
              <p className="text-xs text-indigo-400/90 mt-2 font-mono truncate max-w-sm">
                {progress.currentFile}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
              <FolderUp className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-100 mb-2">
              Arrastra y suelta tu carpeta de campaña aquí
            </h3>
            <p className="text-sm text-slate-400 max-w-lg mb-8 leading-relaxed">
              Selecciona la carpeta principal de la campaña (o una subcarpeta de e-retailer). La app auditará automáticamente las imágenes y videos locales sin subir nada a servidores.
            </p>

            {/* Primary Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
              <button
                id="btn-select-local-folder"
                onClick={handleNativeFolderSelect}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all active:scale-[0.98]"
              >
                <FolderTree className="w-4 h-4" />
                <span>Seleccionar Directorio</span>
              </button>

              <button
                id="btn-run-demo-folder"
                onClick={onDemoRun}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 transition-all font-bold text-xs uppercase tracking-wider active:scale-[0.98]"
                title="Generar y analizar carpeta de prueba con casos de éxito y errores"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Cargar Carpeta Demo</span>
              </button>
            </div>

            {/* Helper tips */}
            <div className="mt-8 pt-6 border-t border-white/5 w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Reconoce variaciones como "MeLi", "Mercado Libre", "FarmaCity", etc.
              </span>

              <button
                onClick={handleDownloadSampleZip}
                disabled={isDownloadingDemo}
                className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar muestra .ZIP</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Expected subfolders checklist reminder */}
      <div className="mt-6 p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
        <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-3 flex items-center gap-2">
          <span>Subcarpetas evaluadas para {country.name}:</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {country.description.split(', ').map((retailer, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-300"
            >
              {retailer}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
