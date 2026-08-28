import React, { useState, useEffect } from 'react';
import { COUNTRIES } from './data/retailerSpecs';
import { CountryInfo, AnalysisReport, CountryCode, AdaptationReport } from './types';
import { Header } from './components/Header';
import { CountryModuleCard } from './components/CountryModuleCard';
import { FolderDropZone } from './components/FolderDropZone';
import { AdaptationsDropZone } from './components/AdaptationsDropZone';
import { CheckOperaDropZone } from './components/CheckOperaDropZone';
import { ReportModal } from './components/ReportModal';
import { AdaptationReportModal } from './components/AdaptationReportModal';
import { SpecsViewerModal } from './components/SpecsViewerModal';
import { PendingCountryModal } from './components/PendingCountryModal';
import { auditFilesForCountry } from './utils/folderScanner';
import { generateDemoFiles } from './utils/demoDataGenerator';
import { validateAdaptations, BriefFileHolder } from './utils/adaptationValidator';
import { History } from 'lucide-react';

const SESSION_HISTORY_STORAGE_KEY = 'pdp_session_reports_v1';

export default function App() {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo | null>(null);
  const [pendingModalCountry, setPendingModalCountry] = useState<CountryInfo | null>(null);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [specsModalInitialCountry, setSpecsModalInitialCountry] = useState<CountryCode>('AR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentFile: string } | undefined>(undefined);
  const [adaptationProgress, setAdaptationProgress] = useState<{ current: number; total: number; message: string } | undefined>(undefined);
  const [currentReport, setCurrentReport] = useState<AnalysisReport | null>(null);
  const [currentAdaptationReport, setCurrentAdaptationReport] = useState<AdaptationReport | null>(null);
  const [reportHistory, setReportHistory] = useState<AnalysisReport[]>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to load history from sessionStorage', e);
    }
    return [];
  });

  const saveReportToHistory = (report: AnalysisReport) => {
    setReportHistory((prev) => {
      const updated = [report, ...prev.filter((r) => r.id !== report.id).slice(0, 7)];
      try {
        sessionStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save history in sessionStorage', e);
      }
      return updated;
    });
  };

  const handleSelectCountry = (country: CountryInfo) => {
    if (country.status === 'pending') {
      setPendingModalCountry(country);
    } else {
      setSelectedCountry(country);
    }
  };

  const handleOpenEditSpecsForCountry = (country: CountryInfo) => {
    if (country.code === 'ADAPTACIONES' || country.code === 'CHECK_OPERA') return;
    setSpecsModalInitialCountry(country.code);
    setIsSpecsModalOpen(true);
  };

  const handleFilesSelected = async (files: File[]) => {
    if (!selectedCountry) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: files.length, currentFile: 'Iniciando análisis...' });

    try {
      await new Promise((r) => setTimeout(r, 100));

      const report = await auditFilesForCountry(
        files,
        selectedCountry.code,
        (prog) => setProgress(prog)
      );

      setCurrentReport(report);
      saveReportToHistory(report);
    } catch (err) {
      console.error('Error during file audit:', err);
    } finally {
      setIsProcessing(false);
      setProgress(undefined);
    }
  };

  const handleValidateAdaptations = async (brief: BriefFileHolder, imageFiles: File[]) => {
    setIsProcessing(true);
    setAdaptationProgress({
      current: 0,
      total: imageFiles.length,
      message: 'Iniciando validación de adaptaciones...',
    });

    try {
      const report = await validateAdaptations(brief, imageFiles, (prog) => {
        setAdaptationProgress(prog);
      });
      setCurrentAdaptationReport(report);
    } catch (err) {
      console.error('Error during adaptation validation:', err);
    } finally {
      setIsProcessing(false);
      setAdaptationProgress(undefined);
    }
  };

  const handleDemoRun = async () => {
    if (!selectedCountry) return;
    setIsProcessing(true);
    setProgress({ current: 0, total: 100, currentFile: 'Generando archivos demo...' });

    try {
      const demoFiles = await generateDemoFiles(selectedCountry.code);
      const report = await auditFilesForCountry(
        demoFiles,
        selectedCountry.code,
        (prog) => setProgress(prog)
      );

      setCurrentReport(report);
      saveReportToHistory(report);
    } catch (err) {
      console.error('Error running demo audit:', err);
    } finally {
      setIsProcessing(false);
      setProgress(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-slate-200 flex flex-col font-sans antialiased relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Frosted Glass Ambient Glowing Orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed top-[40%] left-[25%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Top Navbar */}
      <Header onOpenSpecs={() => {
        setSpecsModalInitialCountry(selectedCountry?.code === 'ADAPTACIONES' ? 'AR' : selectedCountry?.code || 'AR');
        setIsSpecsModalOpen(true);
      }} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        {!selectedCountry ? (
          /* Dashboard Home View */
          <div className="space-y-10">
            {/* Hero / Intro Section */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              {/* Main Typography Lockup */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-100 uppercase">
                DESIGN <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-pink-300 drop-shadow-[0_0_25px_rgba(129,140,248,0.25)]">HUB</span>
              </h1>

              {/* Minimal Editorial Subtitle */}
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
                Herramienta de verificación de specs para PDPs (ATF y BTF), detección de imágenes duplicadas para subida de Opera y control de adaptaciones.
              </p>
            </div>

            {/* Dashboard Modules Grid (6 Modules) */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COUNTRIES.map((country) => (
                  <CountryModuleCard
                    key={country.code}
                    country={country}
                    onSelect={handleSelectCountry}
                    onEditSpecs={handleOpenEditSpecsForCountry}
                    isLoading={isProcessing}
                  />
                ))}
              </div>
            </div>

            {/* Session History (if any report was generated) */}
            {reportHistory.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Resultados de la Última Sesión
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setReportHistory([]);
                      sessionStorage.removeItem(SESSION_HISTORY_STORAGE_KEY);
                    }}
                    className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Limpiar historial
                  </button>
                </div>
                <div className="space-y-2">
                  {reportHistory.map((rep, idx) => (
                    <div
                      key={rep.id || idx}
                      onClick={() => setCurrentReport(rep)}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-indigo-500/40 cursor-pointer transition-all backdrop-blur-md"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {COUNTRIES.find((c) => c.code === rep.country)?.flag || '📋'}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                            PDP {rep.country} ({rep.countryName})
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Carpeta: /{rep.rootFolderName || 'Local'}/ • {rep.totalRetailersValidated} retailers auditados
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-emerald-400 font-semibold font-mono">{rep.totalConformFiles} conformes</span>
                        {rep.totalInconsistentFiles > 0 && (
                          <span className="text-rose-400 font-semibold font-mono">{rep.totalInconsistentFiles} errores</span>
                        )}
                        <button className="px-3 py-1 rounded-lg bg-white/10 text-slate-200 text-xs font-semibold hover:bg-white/20 uppercase tracking-wider border border-white/10">
                          Ver Reporte
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : selectedCountry.code === 'ADAPTACIONES' ? (
          /* Active ADAPTACIONES Drop Zone View */
          <AdaptationsDropZone
            country={selectedCountry}
            onValidate={handleValidateAdaptations}
            onBack={() => setSelectedCountry(null)}
            isProcessing={isProcessing}
            progress={adaptationProgress}
          />
        ) : selectedCountry.code === 'CHECK_OPERA' ? (
          /* Active CHECK OPERA Drop Zone View */
          <CheckOperaDropZone
            country={selectedCountry}
            onBack={() => setSelectedCountry(null)}
          />
        ) : (
          /* Active Country Drop Zone & Audit View */
          <FolderDropZone
            country={selectedCountry}
            onFilesSelected={handleFilesSelected}
            onDemoRun={handleDemoRun}
            onBack={() => setSelectedCountry(null)}
            isProcessing={isProcessing}
            progress={progress}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-white/5 flex items-center justify-center px-6 sm:px-8 bg-black/40 text-[10px] text-slate-500 font-mono relative z-10 backdrop-blur-md">
        <div>&copy; 2026 VALIDADOR DE PDPS Y ADAPTACIONES • DIGITAL E-RETAIL SOLUTIONS</div>
      </footer>

      {/* Primary Report Modal (Text & Visual views) */}
      <ReportModal
        report={currentReport}
        onClose={() => setCurrentReport(null)}
      />

      {/* Adaptations Report Modal */}
      <AdaptationReportModal
        report={currentAdaptationReport}
        onClose={() => setCurrentAdaptationReport(null)}
      />

      {/* Specs Reference & Editor Guide Modal */}
      <SpecsViewerModal
        isOpen={isSpecsModalOpen}
        onClose={() => setIsSpecsModalOpen(false)}
        initialCountry={specsModalInitialCountry}
      />

      {/* Pending Country Info Modal */}
      <PendingCountryModal
        country={pendingModalCountry}
        onClose={() => setPendingModalCountry(null)}
      />
    </div>
  );
}


