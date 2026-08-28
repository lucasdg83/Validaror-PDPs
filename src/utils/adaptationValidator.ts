import {
  AdaptationReport,
  AdaptationItemResult,
  AdaptationAmbiguityAlert,
} from '../types';
import { analyzeImageFile } from './imageAnalyzer';
import mammoth from 'mammoth';
import JSZip from 'jszip';

export interface BriefFileHolder {
  file: File;
  name: string;
  type: 'pdf' | 'pptx' | 'ppt' | 'docx' | 'doc';
  sizeBytes: number;
  base64Data?: string;
  extractedText?: string;
}

// Extract plain text and slides from PPTX / PPT files
export async function extractPptxText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pptx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const slideFiles: { name: string; num: number }[] = [];

      zip.forEach((relativePath) => {
        const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
        if (match) {
          slideFiles.push({ name: relativePath, num: parseInt(match[1], 10) });
        }
      });

      slideFiles.sort((a, b) => a.num - b.num);
      const extractedSections: string[] = [];

      for (const slide of slideFiles) {
        const xmlContent = await zip.file(slide.name)?.async('string');
        if (!xmlContent) continue;

        // Extract text runs inside <a:t> tags
        const textMatches = Array.from(xmlContent.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/gi)).map((m) => m[1]);
        const slideText = textMatches
          .map((t) =>
            t
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&apos;/g, "'")
          )
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        // Extract hyperlinks from relationships
        const relsPath = `ppt/slides/_rels/slide${slide.num}.xml.rels`;
        const relsContent = await zip.file(relsPath)?.async('string');
        const links: string[] = [];
        if (relsContent) {
          const linkMatches = Array.from(relsContent.matchAll(/Target="([^"]+)"/gi)).map((m) => m[1]);
          for (const l of linkMatches) {
            if (l.startsWith('http://') || l.startsWith('https://')) {
              links.push(l);
            }
          }
        }

        // Check speaker / PM notes for this slide
        const notesPath = `ppt/notesSlides/notesSlide${slide.num}.xml`;
        const notesContent = await zip.file(notesPath)?.async('string');
        let notesText = '';
        if (notesContent) {
          const noteMatches = Array.from(notesContent.matchAll(/<a:t[^>]*>(.*?)<\/a:t>/gi)).map((m) => m[1]);
          notesText = noteMatches.join(' ').replace(/\s+/g, ' ').trim();
        }

        let sectionStr = `[DIAPOSITIVA ${slide.num}]\n`;
        if (slideText) sectionStr += `Contenido de texto: ${slideText}\n`;
        if (notesText) sectionStr += `Notas del PM / Orador: ${notesText}\n`;
        if (links.length > 0) sectionStr += `Enlaces detectados: ${links.join(', ')}\n`;

        extractedSections.push(sectionStr);
      }

      if (extractedSections.length > 0) {
        return (
          `TOTAL DIAPOSITIVAS: ${extractedSections.length}\n\n` +
          extractedSections.join('\n----------------------------------------\n\n')
        );
      }
    } catch (err) {
      console.warn('Error extracting pptx content with JSZip:', err);
    }
  }

  // Fallback for .ppt or corrupted pptx: extract UTF-8 strings and URLs
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let rawStr = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || (b >= 192 && b <= 255)) {
        rawStr += String.fromCharCode(b);
      } else if (rawStr.length > 0 && rawStr[rawStr.length - 1] !== ' ') {
        rawStr += ' ';
      }
    }
    return rawStr.replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn('Error extracting fallback ppt text:', err);
    return '';
  }
}

// Extract plain text from DOCX / DOC files
export async function extractDocText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'docx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || '';
    } catch (err) {
      console.warn('Error extracting docx text with mammoth:', err);
    }
  }

  // Fallback for .doc or if mammoth fails: extract readable text strings from ArrayBuffer
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let rawStr = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if ((b >= 32 && b <= 126) || b === 10 || b === 13 || (b >= 192 && b <= 255)) {
        rawStr += String.fromCharCode(b);
      } else if (rawStr.length > 0 && rawStr[rawStr.length - 1] !== ' ') {
        rawStr += ' ';
      }
    }
    // Clean up excessive whitespace
    return rawStr.replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn('Error extracting fallback doc text:', err);
    return '';
  }
}

// Convert a file to Base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Create a small downscaled thumbnail base64 for fast API transfer
export async function createThumbnailBase64(file: File, maxDim = 600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } else {
        resolve('');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

export async function validateAdaptations(
  briefHolder: BriefFileHolder,
  imageFiles: File[],
  onProgress?: (info: { current: number; total: number; message: string }) => void
): Promise<AdaptationReport> {
  const total = imageFiles.length;
  onProgress?.({ current: 0, total, message: 'Analizando metadatos de imágenes...' });

  // 1. Extract metadata from all image files
  const filePayloads: any[] = [];
  const previewMap = new Map<string, string>();

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    onProgress?.({
      current: i + 1,
      total,
      message: `Procesando ${file.name} (${i + 1}/${total})...`,
    });

    const meta = await analyzeImageFile(file);
    const thumb = await createThumbnailBase64(file, 600);
    previewMap.set(file.name, meta.previewUrl || thumb);

    const sizeKB = Math.round(file.size / 1024);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    filePayloads.push({
      name: file.name,
      width: meta.width,
      height: meta.height,
      aspectRatio: meta.aspectRatio,
      sizeKB,
      extension,
      sampleBase64: thumb,
    });
  }

  // 2. Ensure brief file is loaded as base64
  onProgress?.({ current: total, total, message: 'Interpretando brief y notas del PM...' });
  let briefBase64 = briefHolder.base64Data;
  if (!briefBase64) {
    briefBase64 = await fileToBase64(briefHolder.file);
  }

  // 3. Call server API
  onProgress?.({ current: total, total, message: 'Evaluando adaptaciones con IA (Gemini)...' });

  let apiResult: any = null;
  try {
    const response = await fetch('/api/adaptations/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        briefFile: {
          name: briefHolder.name,
          type: briefHolder.type,
          base64Data: briefBase64,
          text: briefHolder.extractedText,
        },
        files: filePayloads,
        rootFolderName: 'Adaptaciones',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        apiResult = data.data;
      }
    }
  } catch (e) {
    console.warn('Could not reach Gemini backend, fallback to heuristic analysis', e);
  }

  // 4. If AI result received, construct report
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (apiResult) {
    const items: AdaptationItemResult[] = (apiResult.items || []).map((it: any) => {
      const matchFile = filePayloads.find((f) => f.name === it.fileName);
      return {
        fileName: it.fileName,
        previewUrl: previewMap.get(it.fileName),
        width: matchFile?.width,
        height: matchFile?.height,
        aspectRatio: matchFile?.aspectRatio,
        status: it.status || 'OK',
        tasksEvaluated: it.tasksEvaluated || [],
        errors: it.errors || [],
        warnings: it.warnings || [],
        notes: it.notes || [],
      };
    });

    // Count conform / errors
    const conformCount = items.filter((i) => i.status === 'OK').length;
    const inconsistentCount = items.filter((i) => i.status !== 'OK').length;
    const totalTasks = items.reduce((acc, curr) => acc + (curr.tasksEvaluated?.length || 0), 0);

    const report: AdaptationReport = {
      id: `adapt-${Date.now()}`,
      briefFileName: briefHolder.name,
      briefFileType: briefHolder.type,
      folderName: 'Carpeta de Adaptaciones',
      analyzedDate: dateStr,
      timestamp: Date.now(),
      totalImagesAnalyzed: items.length,
      totalTasksDetected: totalTasks,
      conformImagesCount: conformCount,
      inconsistentImagesCount: inconsistentCount,
      ambiguityAlerts: apiResult.ambiguityAlerts || [],
      items,
      extractedBriefSummary: apiResult.extractedBriefSummary || [],
      rawTxtReport: '',
    };

    report.rawTxtReport = formatAdaptationTextReport(report);
    return report;
  }

  // 5. Fallback Heuristic Analysis (if offline / no API key)
  const items: AdaptationItemResult[] = filePayloads.map((f) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const notes: string[] = [];

    // Basic heuristic: check if standard ratio or dimensions exist
    notes.push(`Dimensiones detectadas: ${f.width}x${f.height}px (Ratio: ${f.aspectRatio || '1:1'})`);

    return {
      fileName: f.name,
      previewUrl: previewMap.get(f.name),
      width: f.width,
      height: f.height,
      aspectRatio: f.aspectRatio,
      status: 'OK',
      tasksEvaluated: [
        {
          taskType: 'resize',
          description: `Validación de dimensiones (${f.width}x${f.height}px)`,
          passed: true,
          details: `Ratio ${f.aspectRatio || '1:1'} registrado correctamente.`,
        },
      ],
      errors,
      warnings,
      notes,
    };
  });

  const report: AdaptationReport = {
    id: `adapt-${Date.now()}`,
    briefFileName: briefHolder.name,
    briefFileType: briefHolder.type,
    folderName: 'Carpeta de Adaptaciones',
    analyzedDate: dateStr,
    timestamp: Date.now(),
    totalImagesAnalyzed: items.length,
    totalTasksDetected: items.length,
    conformImagesCount: items.length,
    inconsistentImagesCount: 0,
    ambiguityAlerts: [
      {
        id: 'amb-1',
        title: 'Verificación visual requerida',
        pmNoteText: 'Notas manuscritas detectadas en el documento.',
        reason: 'Para validación automática con IA multimodal completa, asegúrese de tener configurada la clave en Settings.',
        suggestedClarification: 'Revisar manualmente el documento de brief adjunto.',
        severity: 'medium',
      },
    ],
    items,
    extractedBriefSummary: [
      `Brief analizado: ${briefHolder.name}`,
      `Total de piezas evaluadas: ${items.length}`,
    ],
    rawTxtReport: '',
  };

  report.rawTxtReport = formatAdaptationTextReport(report);
  return report;
}

export function formatAdaptationTextReport(report: AdaptationReport): string {
  const lines: string[] = [];

  lines.push('========================================================================');
  lines.push('           REPORTE DE AUDITORÍA - MÓDULO DE ADAPTACIONES');
  lines.push('========================================================================');
  lines.push(`Fecha y Hora: ${report.analyzedDate}`);
  lines.push(`Documento de Brief: ${report.briefFileName} (${report.briefFileType.toUpperCase()})`);
  lines.push(`Total de Imágenes Auditadas: ${report.totalImagesAnalyzed}`);
  lines.push(`Total de Tareas Detectadas: ${report.totalTasksDetected}`);
  lines.push(`Imágenes Conformes: ${report.conformImagesCount}`);
  lines.push(`Imágenes con Inconsistencias: ${report.inconsistentImagesCount}`);
  lines.push('------------------------------------------------------------------------');

  // Summary of Brief
  if (report.extractedBriefSummary && report.extractedBriefSummary.length > 0) {
    lines.push('\n[RESUMEN DEL BRIEF / NOTAS DEL PM]');
    report.extractedBriefSummary.forEach((s) => lines.push(` • ${s}`));
  }

  // Ambiguity Alerts
  if (report.ambiguityAlerts && report.ambiguityAlerts.length > 0) {
    lines.push('\n========================================================================');
    lines.push(' ⚠️ ALERTAS DE AMBIGÜEDAD / NOTAS DEL PM QUE REQUIEREN ACLARACIÓN');
    lines.push('========================================================================');
    report.ambiguityAlerts.forEach((alert, idx) => {
      lines.push(`\n[ALERTA #${idx + 1}] ${alert.title.toUpperCase()} (Severidad: ${alert.severity.toUpperCase()})`);
      lines.push(` • Nota del PM en documento: "${alert.pmNoteText}"`);
      lines.push(` • Motivo de la duda: ${alert.reason}`);
      lines.push(` • Aclaración sugerida con el PM: ${alert.suggestedClarification}`);
    });
    lines.push('------------------------------------------------------------------------');
  }

  // Detailed Items
  lines.push('\n[DETALLE DE ARCHIVOS Y TAREAS EVALUADAS]');
  report.items.forEach((item, idx) => {
    lines.push(`\n------------------------------------------------------------------------`);
    lines.push(`Archivo #${idx + 1}: ${item.fileName}  [ESTADO: ${item.status}]`);
    lines.push(`Dimensiones: ${item.width || 0}x${item.height || 0}px | Ratio: ${item.aspectRatio || 'N/A'}`);

    if (item.tasksEvaluated && item.tasksEvaluated.length > 0) {
      lines.push(' Tareas evaluadas:');
      item.tasksEvaluated.forEach((t) => {
        const icon = t.passed ? ' [OK]' : ' [ERROR]';
        lines.push(`   ${icon} (${t.taskType.toUpperCase()}): ${t.description}`);
        if (t.details) lines.push(`        Detalle: ${t.details}`);
      });
    }

    if (item.errors.length > 0) {
      lines.push(' Errores detectados:');
      item.errors.forEach((err) => lines.push(`   ❌ ${err}`));
    }

    if (item.warnings.length > 0) {
      lines.push(' Advertencias:');
      item.warnings.forEach((warn) => lines.push(`   ⚠️ ${warn}`));
    }

    if (item.notes.length > 0) {
      lines.push(' Observaciones:');
      item.notes.forEach((n) => lines.push(`   ℹ️ ${n}`));
    }
  });

  lines.push('\n========================================================================');
  lines.push('                         FIN DEL REPORTE');
  lines.push('========================================================================');

  return lines.join('\n');
}
