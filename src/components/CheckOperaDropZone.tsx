import React, { useRef, useState } from 'react';
import { CountryInfo, OperaAnalysisReport } from '../types';
import {
  FolderUp,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  ShieldCheck,
  FolderTree,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import {
  scanAndAnalyzeOperaFolder,
  generateDemoOperaFiles,
  ALLOWED_IMAGE_EXTENSIONS,
} from '../utils/operaChecker';
import { CheckOperaReportModal } from './CheckOperaReportModal';

interface CheckOperaDropZoneProps {
  country: CountryInfo;
  onBack: () => void;
}

export const CheckOperaDropZone: React.FC<CheckOperaDropZoneProps> = ({
  country,
  onBack,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>('');
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [analysisReport, setAnalysisReport] = useState<OperaAnalysisReport | null>(null);

  const folderInputRef = useRef<HTMLInputElement>(null);

  // Filter image files by strictly allowed extensions: JPG, JPEG, PNG, WEBP
  const validImageFiles = selectedFiles.filter((f) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  });

  const omittedCount = selectedFiles.length - validImageFiles.length;

  const handleFolderSelection = (fileList: FileList | File[]) => {
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

    const imgs = files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
    });

    if (imgs.length === 0) {
      setValidationAlert('La carpeta seleccionada no contiene archivos de imagen válidos en formatos permitidos (JPG, JPEG, PNG, WEBP).');
      return;
    }

    setValidationAlert(null);
    setRootFolderName(root);
    setSelectedFiles(files);
  };

  const handleDropFolder = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFolder(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFolderSelection(e.dataTransfer.files);
    }
  };

  // Run duplicate analysis
  const handleStartAnalysis = async () => {
    if (selectedFiles.length === 0) {
      setValidationAlert('Por favor seleccione una carpeta con imágenes para analizar.');
      return;
    }

    setValidationAlert(null);
    setIsAnalyzing(true);
    setAnalysisStatus('Iniciando lectura de subcarpetas, formatos y firmas visuales...');

    try {
      const report = await scanAndAnalyzeOperaFolder(
        selectedFiles,
        (msg, cur, tot) => {
          setAnalysisStatus(msg);
          setAnalysisProgress({ current: cur, total: tot });
        }
      );
      setAnalysisReport(report);
    } catch (err: any) {
      console.error('Error in Opera duplicate analysis:', err);
      setValidationAlert(err?.message || 'Ocurrió un error al procesar las imágenes.');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  // Load sample demo folder (includes subfolders, 100% redundant folder, and non-image omitted files)
  const handleLoadDemo = async () => {
    setIsAnalyzing(true);
    setAnalysisStatus('Generando estructura demo con subcarpetas, carpetas redundantes y formatos varios...');
    try {
      const demoFiles = await generateDemoOperaFiles();
      setRootFolderName('Opera_DAM_Export_Demo');
      setSelectedFiles(demoFiles);
      setValidationAlert(null);
    } catch (e) {
      console.error('Error generating demo:', e);
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setRootFolderName('');
    setValidationAlert(null);
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider transition-colors border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl shadow-inner">
            🎭
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 uppercase tracking-wide">
              Check Opera
            </h2>
            <p className="text-xs text-pink-300 font-medium">
              Auditoría Inteligente de Duplicados en Repositorios & Subcarpetas
            </p>
          </div>
        </div>

        <button
          onClick={handleLoadDemo}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-semibold transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Cargar Carpeta Demo con Subcarpetas</span>
        </button>
      </div>

      {/* Strict Rules & Parameters Callout Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/20 to-slate-900/40 border border-pink-500/30 backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-pink-400" />
            <span>Reglas de Análisis en Check Opera</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[11px] font-mono font-bold border border-pink-500/30">
            Formatos: JPG • JPEG • PNG • WEBP
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          La IA examina todos los archivos del directorio y <strong className="text-pink-300">recorre recursivamente todas sus subcarpetas</strong> para identificar aquellas imágenes que estén <strong className="text-pink-300">repetidas en contenido visual + mismo tamaño exacto</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-slate-300 font-mono">
          <div className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-center gap-2">
            <FolderTree className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
            <span>Soporte de subcarpetas multinivel</span>
          </div>
          <div className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>Alerta de carpetas 100% duplicadas</span>
          </div>
          <div className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-center gap-2">
            <span className="text-amber-400 font-bold">ℹ</span>
            <span>Reporte de formatos omitidos</span>
          </div>
        </div>
      </div>

      {/* Validation Alert */}
      {validationAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 flex items-center justify-between">
          <span>{validationAlert}</span>
          <button onClick={() => setValidationAlert(null)} className="text-rose-400 font-bold hover:underline ml-3">
            Cerrar
          </button>
        </div>
      )}

      {/* Main Folder Selection Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm uppercase tracking-wide">
            <FolderUp className="w-4 h-4 text-pink-400" />
            <span>1. Seleccionar Carpeta del Dispositivo</span>
          </div>
          {selectedFiles.length > 0 && (
            <button
              onClick={handleClear}
              disabled={isAnalyzing}
              className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar carpeta</span>
            </button>
          )}
        </div>

        {/* Hidden inputs for folder and fallback */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFolderSelection(e.target.files);
          }}
        />

        {/* Folder Drop Area */}
        {selectedFiles.length === 0 ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFolder(true);
            }}
            onDragLeave={() => setIsDraggingFolder(false)}
            onDrop={handleDropFolder}
            onClick={() => folderInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDraggingFolder
                ? 'border-pink-400 bg-pink-500/10 scale-[0.99]'
                : 'border-white/10 hover:border-pink-500/40 bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mx-auto mb-4 group-hover:scale-105 transition-transform">
              <FolderUp className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-1">
              Subir Carpeta de Cualquier Dispositivo
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-4">
              Arrastra una carpeta aquí o haz clic para explorar en tu computadora. Se analizarán imágenes en formatos <strong>JPG, JPEG, PNG, WEBP</strong> incluyendo todas las subcarpetas.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-pink-500/20 transition-all">
              <FolderUp className="w-4 h-4" />
              <span>Elegir Carpeta</span>
            </div>
          </div>
        ) : (
          /* Folder Selected Preview Card */
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-pink-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-100 font-mono">
                      /{rootFolderName}/
                    </h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Listo para analizar
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {validImageFiles.length} imágenes válidas (JPG, JPEG, PNG, WEBP)
                    {omittedCount > 0 && ` • ${omittedCount} archivo(s) omitidos por formato`}
                    {' '}({((selectedFiles.reduce((acc, f) => acc + f.size, 0)) / 1024 / 1024).toFixed(1)} MB total)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
                >
                  Cambiar Carpeta
                </button>
              </div>
            </div>

            {/* Quick Preview Grid */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Muestra de Archivos a Inspeccionar ({validImageFiles.length})</span>
                <span className="text-[11px] font-mono text-pink-300">Formatos: JPG, JPEG, PNG, WEBP</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-[220px] overflow-y-auto p-1 scrollbar-thin">
                {validImageFiles.slice(0, 18).map((file, idx) => {
                  const rel = (file as any).webkitRelativePath || file.name;
                  return (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 hover:border-white/20 transition-colors"
                    >
                      <div className="aspect-square w-full rounded-lg bg-black/40 flex items-center justify-center text-slate-500 text-xs font-mono">
                        <ImageIcon className="w-5 h-5 text-pink-400/60" />
                      </div>
                      <div className="text-[10px] font-bold text-slate-200 truncate" title={file.name}>
                        {file.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono truncate" title={rel}>
                        /{rel.split('/').slice(1, -1).join('/') || 'raíz'}
                      </div>
                    </div>
                  );
                })}
                {validImageFiles.length > 18 && (
                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-center">
                    <span className="text-[11px] font-mono text-slate-400">
                      +{validImageFiles.length - 18} más
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>
              {selectedFiles.length === 0
                ? 'Sube una carpeta para habilitar el análisis de duplicados con IA.'
                : `${validImageFiles.length} imágenes listas para chequear repetición en contenido y tamaño.`}
            </span>
          </div>

          <button
            id="btn-comenzar-analisis-opera"
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || selectedFiles.length === 0}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-xl ${
              selectedFiles.length > 0 && !isAnalyzing
                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/25 active:scale-[0.98] border border-pink-400/30'
                : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-pink-300" />
                <span>Analizando Duplicados con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Comenzar Análisis con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Progress Bar */}
      {isAnalyzing && (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-pink-500/30 backdrop-blur-xl space-y-3 animate-pulse">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-pink-300 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-pink-400" />
              {analysisStatus || 'Procesando auditoría de duplicados...'}
            </span>
            {analysisProgress.total > 0 && (
              <span className="font-mono text-slate-400">
                {analysisProgress.current} / {analysisProgress.total} imágenes
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-300"
              style={{
                width:
                  analysisProgress.total > 0
                    ? `${Math.round((analysisProgress.current / analysisProgress.total) * 100)}%`
                    : '50%',
              }}
            />
          </div>
        </div>
      )}

      {/* Analysis Report Modal */}
      <CheckOperaReportModal
        report={analysisReport}
        onClose={() => setAnalysisReport(null)}
      />
    </div>
  );
};
