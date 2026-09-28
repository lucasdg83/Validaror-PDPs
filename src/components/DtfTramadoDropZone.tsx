import React, { useRef, useState, useEffect } from 'react';
import { CountryInfo } from '../types';
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Download,
  RotateCcw,
  Check,
  Eye,
  Sliders,
  Layers,
  Info,
  Maximize2,
  FileCheck,
} from 'lucide-react';
import {
  DtfImageAnalysis,
  DtfProcessingOptions,
  DtfTramadoType,
  DtfColorMode,
  analyzeImageForDtf,
  applyDtfTramado,
} from '../utils/dtfTramado';

interface DtfTramadoDropZoneProps {
  country: CountryInfo;
  onBack: () => void;
}

export const DtfTramadoDropZone: React.FC<DtfTramadoDropZoneProps> = ({ onBack }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [loadedImageElement, setLoadedImageElement] = useState<HTMLImageElement | null>(null);
  const [analysis, setAnalysis] = useState<DtfImageAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // View state
  const [activeTab, setActiveTab] = useState<'tramado' | 'original' | 'split'>('tramado');
  const [previewGarment, setPreviewGarment] = useState<'checker' | '#000000' | '#ffffff' | '#0f172a' | '#881337'>('checker');

  // Tramado Settings
  const [tramadoType, setTramadoType] = useState<DtfTramadoType>('stochastic');
  const [lpi, setLpi] = useState<number>(45);
  const [dotAngle, setDotAngle] = useState<number>(45);
  const [colorMode, setColorMode] = useState<DtfColorMode>('full_color');
  const [alphaSensitivity, setAlphaSensitivity] = useState<number>(50);

  // Result output
  const [processedResult, setProcessedResult] = useState<{
    blob: Blob;
    previewUrl: string;
    width: number;
    height: number;
    dpi: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelection = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorAlert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP, etc.).');
      return;
    }

    setErrorAlert(null);
    setSelectedFile(file);
    setIsAnalyzing(true);
    setProcessedResult(null);
    setDownloadSuccess(false);

    try {
      const origUrl = URL.createObjectURL(file);
      setOriginalImageUrl(origUrl);

      const res = await analyzeImageForDtf(file);
      setAnalysis(res.analysis);
      setLoadedImageElement(res.imageElement);

      // Auto-configure optimal prepress settings
      setTramadoType(res.analysis.recommendedType);
      setLpi(res.analysis.recommendedLpi);
      setDotAngle(45);
      setColorMode('full_color');
      setAlphaSensitivity(50);

      // Process tramado automatically
      const options: DtfProcessingOptions = {
        tramadoType: res.analysis.recommendedType,
        lpi: res.analysis.recommendedLpi,
        dotAngle: 45,
        colorMode: 'full_color',
        alphaSensitivity: 50,
        garmentColor: 'checker',
      };

      setIsProcessing(true);
      const tramadoResult = await applyDtfTramado(res.imageElement, options, res.analysis.dpi);
      setProcessedResult(tramadoResult);
    } catch (err: any) {
      console.error('Error analyzing image for DTF:', err);
      setErrorAlert(err?.message || 'Error al procesar la imagen para tramado DTF.');
    } finally {
      setIsAnalyzing(false);
      setIsProcessing(false);
    }
  };

  // Re-run tramado on option change
  const reapplyCurrentOptions = async () => {
    if (!loadedImageElement || !analysis) return;
    setIsProcessing(true);

    try {
      const options: DtfProcessingOptions = {
        tramadoType,
        lpi,
        dotAngle,
        colorMode,
        alphaSensitivity,
        garmentColor: previewGarment,
      };

      const result = await applyDtfTramado(loadedImageElement, options, analysis.dpi);
      setProcessedResult(result);
    } catch (err: any) {
      console.error('Error applying DTF tramado:', err);
      setErrorAlert('No se pudo actualizar el tramado con los parámetros seleccionados.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger re-processing whenever key parameters change (with debounce)
  useEffect(() => {
    if (!loadedImageElement || !analysis) return;
    const timer = setTimeout(() => {
      reapplyCurrentOptions();
    }, 150);
    return () => clearTimeout(timer);
  }, [tramadoType, lpi, dotAngle, colorMode, alphaSensitivity]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDownload = () => {
    if (!processedResult || !selectedFile) return;

    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
    const filename = `${baseName}_tramado_dtf_${tramadoType}_${analysis?.dpi || 300}dpi.png`;

    const a = document.createElement('a');
    a.href = processedResult.previewUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handleReset = () => {
    if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    if (processedResult?.previewUrl) URL.revokeObjectURL(processedResult.previewUrl);
    setSelectedFile(null);
    setOriginalImageUrl(null);
    setLoadedImageElement(null);
    setAnalysis(null);
    setProcessedResult(null);
    setErrorAlert(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-2xl">👕</span>
                TRAMADO DTF
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Armado Textil DTF (PNG)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Análisis experto de originales para DTF: tramado de gradientes, bordes transparentes y preservación 1:1 de dimensiones y DPI.
            </p>
          </div>
        </div>

        {selectedFile && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all text-xs font-medium self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cargar otra imagen</span>
          </button>
        )}
      </div>

      {/* Error alert if any */}
      {errorAlert && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <span>{errorAlert}</span>
          <button onClick={() => setErrorAlert(null)} className="text-rose-400 hover:text-white font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Upload Drop Zone if no image is loaded */}
      {!selectedFile && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-10 sm:p-16 rounded-2xl border-2 border-dashed transition-all text-center backdrop-blur-xl ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10 scale-[1.005]'
              : 'border-white/15 bg-white/[0.02] hover:border-amber-500/40 hover:bg-white/[0.04]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && e.target.files[0] && handleFileSelection(e.target.files[0])}
            accept="image/*"
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-100">
                Arrastra tu imagen o elígela del dispositivo
              </h3>
              <p className="text-xs text-slate-400">
                Formatos recomendados: PNG con fondo transparente, TIFF, JPG o WEBP en alta resolución.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                Elegir archivo del dispositivo
              </button>
            </div>

            <div className="pt-4 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-center gap-4">
              <span>✓ Preserva fondo transparente</span>
              <span>•</span>
              <span>✓ Mantiene tamaño exacto</span>
              <span>•</span>
              <span>✓ Mantiene DPI original</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace when image is uploaded */}
      {selectedFile && (
        <div className="space-y-6">
          {/* Prepress Expert Diagnostic Card */}
          {analysis && (
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-amber-500/30 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                {/* Left: Expert Advice */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Diagnóstico del Diseñador Experto en DTF
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Tramado Automático Aplicado
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {analysis.expertDiagnosis}
                  </p>

                  <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <strong className="text-amber-300">¿Por qué este tramado? </strong>
                    {analysis.expertReason}
                  </p>

                  {/* Prepress key points */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {analysis.prepressTips.slice(0, 3).map((tip, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-slate-300 bg-white/[0.02] border border-white/5 p-2 rounded-lg flex items-start gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Technical Metadata pillbox */}
                <div className="lg:w-72 shrink-0 bg-black/40 border border-white/10 rounded-xl p-4 space-y-2.5 text-xs font-mono">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-white/10 pb-1.5 flex items-center justify-between">
                    <span>Ficha Técnica Original</span>
                    <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 font-sans">Archivo:</span>
                    <span className="truncate max-w-[140px]" title={selectedFile.name}>
                      {selectedFile.name}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 font-sans">Dimensiones:</span>
                    <span className="text-emerald-400 font-bold">
                      {analysis.width} × {analysis.height} px
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 font-sans">Resolución:</span>
                    <span className="text-cyan-400 font-bold">{analysis.dpi} DPI</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400 font-sans">Canal Alfa / Fondo:</span>
                    <span
                      className={`font-semibold ${
                        analysis.hasTransparency ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      {analysis.hasTransparency
                        ? `Transparente (${analysis.transparencyPercent}%)`
                        : 'Sólido'}
                    </span>
                  </div>

                  {analysis.semiTransparencyPercent > 0 && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 font-sans">Degradados a Alfa:</span>
                      <span className="text-pink-400 font-bold">
                        {analysis.semiTransparencyPercent}% (Tramados)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Workspace: Visualizer + Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visualizer (Left/Main, 8 cols) */}
            <div className="lg:col-span-8 space-y-3">
              {/* Preview Bar Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                {/* View switcher tabs */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs">
                  <button
                    onClick={() => setActiveTab('tramado')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      activeTab === 'tramado'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tramado DTF
                  </button>
                  <button
                    onClick={() => setActiveTab('original')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      activeTab === 'original'
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setActiveTab('split')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all ${
                      activeTab === 'split'
                        ? 'bg-white/20 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Lado a Lado
                  </button>
                </div>

                {/* Garment Color / Backdrop Simulator */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Simular Prenda:</span>
                  <div className="flex items-center gap-1.5">
                    {/* Checkerboard */}
                    <button
                      type="button"
                      title="Fondo Transparente (Ajedrez)"
                      onClick={() => setPreviewGarment('checker')}
                      className={`w-6 h-6 rounded-md border text-[10px] font-bold flex items-center justify-center ${
                        previewGarment === 'checker' ? 'ring-2 ring-amber-400 border-white' : 'border-white/20'
                      }`}
                      style={{
                        backgroundImage:
                          'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                        backgroundColor: '#111',
                      }}
                    />

                    {/* Black garment */}
                    <button
                      type="button"
                      title="Prenda Negra"
                      onClick={() => setPreviewGarment('#000000')}
                      className={`w-6 h-6 rounded-md border bg-black ${
                        previewGarment === '#000000' ? 'ring-2 ring-amber-400 border-white' : 'border-white/20'
                      }`}
                    />

                    {/* White garment */}
                    <button
                      type="button"
                      title="Prenda Blanca"
                      onClick={() => setPreviewGarment('#ffffff')}
                      className={`w-6 h-6 rounded-md border bg-white ${
                        previewGarment === '#ffffff' ? 'ring-2 ring-amber-400 border-black' : 'border-white/20'
                      }`}
                    />

                    {/* Navy garment */}
                    <button
                      type="button"
                      title="Prenda Azul Marino"
                      onClick={() => setPreviewGarment('#0f172a')}
                      className={`w-6 h-6 rounded-md border bg-slate-900 ${
                        previewGarment === '#0f172a' ? 'ring-2 ring-amber-400 border-white' : 'border-white/20'
                      }`}
                    />

                    {/* Burgundy garment */}
                    <button
                      type="button"
                      title="Prenda Bordo"
                      onClick={() => setPreviewGarment('#881337')}
                      className={`w-6 h-6 rounded-md border bg-rose-900 ${
                        previewGarment === '#881337' ? 'ring-2 ring-amber-400 border-white' : 'border-white/20'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Canvas Preview Container */}
              <div
                className="relative rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center min-h-[420px] max-h-[640px] p-4 select-none"
                style={{
                  backgroundColor: previewGarment === 'checker' ? '#141417' : previewGarment,
                  backgroundImage:
                    previewGarment === 'checker'
                      ? 'linear-gradient(45deg, #1f1f23 25%, transparent 25%), linear-gradient(-45deg, #1f1f23 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1f23 75%), linear-gradient(-45deg, transparent 75%, #1f1f23 75%)'
                      : 'none',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              >
                {/* Processing overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-amber-300 font-mono tracking-wider">
                      Calculando tramado DTF 1:1...
                    </span>
                  </div>
                )}

                {/* Display active tab */}
                {activeTab === 'tramado' && processedResult && (
                  <div className="relative max-h-[580px] flex items-center justify-center">
                    <img
                      src={processedResult.previewUrl}
                      alt="Tramado DTF"
                      className="max-h-[560px] max-w-full object-contain rounded-lg shadow-2xl"
                    />
                  </div>
                )}

                {activeTab === 'original' && originalImageUrl && (
                  <div className="relative max-h-[580px] flex items-center justify-center">
                    <img
                      src={originalImageUrl}
                      alt="Original"
                      className="max-h-[560px] max-w-full object-contain rounded-lg shadow-2xl"
                    />
                  </div>
                )}

                {activeTab === 'split' && originalImageUrl && processedResult && (
                  <div className="grid grid-cols-2 gap-3 w-full max-h-[580px] p-2">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-mono uppercase bg-black/70 px-2 py-0.5 rounded text-slate-300 mb-1">
                        Original
                      </span>
                      <img
                        src={originalImageUrl}
                        alt="Original"
                        className="max-h-[520px] max-w-full object-contain rounded shadow"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-mono uppercase bg-amber-500/80 px-2 py-0.5 rounded text-slate-950 font-bold mb-1">
                        Tramado DTF
                      </span>
                      <img
                        src={processedResult.previewUrl}
                        alt="Tramado DTF"
                        className="max-h-[520px] max-w-full object-contain rounded shadow"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Download & Spec Info Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-xs text-slate-300 space-y-0.5">
                  <div className="flex items-center gap-2 font-mono font-semibold">
                    <span className="text-emerald-400">PNG Transparente Listo</span>
                    <span>•</span>
                    <span>{analysis?.width} × {analysis?.height} px</span>
                    <span>•</span>
                    <span className="text-cyan-400">{analysis?.dpi} DPI</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Listo para cargar directamente en AcroRIP, CADlink, Digital Factory o Photoshop.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!processedResult || isProcessing}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-slate-950" />
                      <span>¡Descargado con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Descargar PNG con Tramado</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Prepress Controls Sidebar (Right, 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-5">
                <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                    Ajustes de Tramado Textil
                  </h4>
                </div>

                {/* 1. Tramado Type Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Tipo de Tramado</span>
                    {analysis?.recommendedType === tramadoType && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        ★ Recomendado
                      </span>
                    )}
                  </label>

                  <div className="space-y-1.5">
                    {[
                      {
                        id: 'stochastic',
                        name: 'Estocástico FM (Blue Noise)',
                        desc: 'Micropuntos orgánicos sin moiré. Ideal para fotos y degradados complejos.',
                      },
                      {
                        id: 'halftone_dots',
                        name: 'Halftone Clásico (Puntos AM)',
                        desc: 'Puntos redondos serigráficos. Estética vintage / retro y alta definición.',
                      },
                      {
                        id: 'alpha_fade',
                        name: 'Alpha Fade (Esfumados & Sombras)',
                        desc: 'Protege sólidos al 100% y trama sólo bordes semitransparentes.',
                      },
                      {
                        id: 'lines',
                        name: 'Líneas DTF (Streetwear)',
                        desc: 'Tramado lineal a 45° para diseños tipográficos o urbanos.',
                      },
                      {
                        id: 'micropores',
                        name: 'Micro-poros (Respirabilidad)',
                        desc: 'Micro-perforaciones para bloques sólidos. Tacto suave y elástico.',
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTramadoType(item.id as DtfTramadoType)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                          tramadoType === item.id
                            ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="font-semibold flex items-center justify-between">
                          <span>{item.name}</span>
                          {analysis?.recommendedType === item.id && (
                            <span className="text-[10px] text-amber-400 font-mono">Óptimo</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. LPI Slider (Lines Per Inch) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Frecuencia de Trama:</span>
                    <span className="font-mono text-amber-400 font-bold">{lpi} LPI</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={65}
                    step={1}
                    value={lpi}
                    onChange={(e) => setLpi(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>25 LPI (Puntos Gruesos)</span>
                    <span>45 LPI (Estándar DTF)</span>
                    <span>65 LPI (Ultra Fino)</span>
                  </div>
                </div>

                {/* 3. Dot Angle for Halftone / Lines */}
                {(tramadoType === 'halftone_dots' || tramadoType === 'lines') && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Ángulo de Trama:</span>
                      <span className="font-mono text-cyan-400 font-bold">{dotAngle}°</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                      {[0, 22.5, 45, 75].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setDotAngle(deg)}
                          className={`py-1.5 rounded-lg border text-center transition-all ${
                            dotAngle === deg
                              ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                              : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Alpha Sensitivity */}
                {(tramadoType === 'alpha_fade' || tramadoType === 'stochastic') && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Sensibilidad de Difuminados:</span>
                      <span className="font-mono text-pink-400 font-bold">{alphaSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={alphaSensitivity}
                      onChange={(e) => setAlphaSensitivity(Number(e.target.value))}
                      className="w-full accent-pink-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400">
                      Controla el umbral de corte para sombras sutiles y bordes esfumados.
                    </p>
                  </div>
                )}

                {/* 5. Color Mode (Full Color, White Ink, Black Ink) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-xs font-semibold text-slate-300">Modo de Tinta / Color</label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setColorMode('full_color')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        colorMode === 'full_color'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Color DTF
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode('white_ink')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        colorMode === 'white_ink'
                          ? 'bg-white/20 border-white text-white'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Tinta Blanca
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode('black_ink')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        colorMode === 'black_ink'
                          ? 'bg-slate-800 border-slate-600 text-slate-200'
                          : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      Tinta Negra
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
