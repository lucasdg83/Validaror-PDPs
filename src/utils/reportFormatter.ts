import { AnalysisReport, RetailerAnalysisResult, CountryCode } from '../types';

export function getCountryDisplayName(country: CountryCode): string {
  switch (country) {
    case 'AR':
      return 'ARGENTINA';
    case 'UY':
      return 'URUGUAY';
    case 'CL':
      return 'CHILE';
    case 'MX':
      return 'MÉXICO';
    case 'CERAN':
      return 'CERAN (CENTROAMÉRICA & REGIÓN ANDINA)';
    default:
      return country;
  }
}

export function generateTextReport(
  country: CountryCode,
  rootFolderName: string,
  retailers: RetailerAnalysisResult[],
  totalRetailersExpected: number
): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const countryName = getCountryDisplayName(country);

  let validatedRetailersCount = 0;
  let totalConformFiles = 0;
  let totalInconsistentFiles = 0;

  retailers.forEach((r) => {
    if (r.files.length > 0 || r.matchedFolderName) {
      validatedRetailersCount++;
    }
    totalConformFiles += r.conformFilesCount;
    totalInconsistentFiles += r.inconsistentFilesCount;
  });

  const lines: string[] = [];
  lines.push('==================================================');
  lines.push(`  REPORTE DE VALIDACIÓN PDP - ${countryName}`);
  lines.push(`  Fecha de análisis: ${dateStr}`);
  lines.push('==================================================\n');

  lines.push(`[+] CARPETA ANALIZADA: ${rootFolderName ? `/${rootFolderName}/` : '/Carpeta_Seleccionada/'}\n`);

  retailers.forEach((r) => {
    lines.push('--------------------------------------------------');
    lines.push(`E-RETAILER: ${r.retailerSpec.name}`);
    lines.push('--------------------------------------------------');

    if (r.bulletItems.length === 0) {
      lines.push('  [ADVERTENCIA] Subcarpeta no encontrada o vacía.');
    } else {
      r.bulletItems.forEach((b) => {
        lines.push(`  [${b.type}] ${b.message}`);
      });
    }
    lines.push('');
  });

  lines.push('--------------------------------------------------');
  lines.push('RESUMEN DEL ANÁLISIS:');
  lines.push(`- E-retailers validados: ${validatedRetailersCount}/${totalRetailersExpected}`);
  lines.push(`- Archivos conformes: ${totalConformFiles}`);
  lines.push(`- Archivos con inconsistencias: ${totalInconsistentFiles}`);
  lines.push('==================================================');

  return lines.join('\n');
}

export function downloadTextReport(report: AnalysisReport) {
  const blob = new Blob([report.rawTxtReport], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Reporte_PDP_${report.country}_${report.analyzedDate.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
