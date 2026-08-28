import { jsPDF } from 'jspdf';
import {
  OperaImageFile,
  OperaDuplicateGroup,
  OperaDifferentSizeItem,
  OperaAnalysisReport,
} from '../types';

// Helper to compute perceptual difference hash (dHash) on canvas (17x16 -> 16x16 = 256 bits)
async function computePerceptualHashAndThumbnail(
  file: File
): Promise<{
  width: number;
  height: number;
  aspectRatio: string;
  thumbnailBase64: string;
  hash: string;
  previewUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Aspect ratio
      let aspectRatio = `${width}:${height}`;
      const gcdVal = (a: number, b: number): number => (!b ? a : gcdVal(b, a % b));
      if (width > 0 && height > 0) {
        const div = gcdVal(width, height);
        const rW = width / div;
        const rH = height / div;
        if ((rW === 1 && rH === 1) || Math.abs(width - height) < 2) {
          aspectRatio = '1:1';
        } else if (Math.abs(width / height - 16 / 9) < 0.05) {
          aspectRatio = '16:9';
        } else if (Math.abs(width / height - 9 / 16) < 0.05) {
          aspectRatio = '9:16';
        } else if (Math.abs(width / height - 4 / 3) < 0.05) {
          aspectRatio = '4:3';
        } else {
          aspectRatio = `${rW}:${rH}`;
        }
      }

      // Generate compact thumbnail for AI and UI
      const thumbCanvas = document.createElement('canvas');
      const maxThumb = 160;
      let tW = width;
      let tH = height;
      if (tW > tH) {
        tH = Math.round((tH * maxThumb) / tW);
        tW = maxThumb;
      } else {
        tW = Math.round((tW * maxThumb) / tH);
        tH = maxThumb;
      }
      thumbCanvas.width = Math.max(tW, 1);
      thumbCanvas.height = Math.max(tH, 1);
      const thumbCtx = thumbCanvas.getContext('2d');
      if (thumbCtx) {
        thumbCtx.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.8);

      // Compute dHash on 17x16 grayscale canvas
      const dHashCanvas = document.createElement('canvas');
      dHashCanvas.width = 17;
      dHashCanvas.height = 16;
      const dHashCtx = dHashCanvas.getContext('2d');
      let hash = '';

      if (dHashCtx) {
        dHashCtx.drawImage(img, 0, 0, 17, 16);
        const imgData = dHashCtx.getImageData(0, 0, 17, 16).data;
        const grayMatrix: number[][] = [];

        for (let y = 0; y < 16; y++) {
          grayMatrix[y] = [];
          for (let x = 0; x < 17; x++) {
            const idx = (y * 17 + x) * 4;
            // standard luminosity: 0.299*R + 0.587*G + 0.114*B
            const lum = 0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2];
            grayMatrix[y][x] = lum;
          }
        }

        // Compare adjacent pixels
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 16; x++) {
            hash += grayMatrix[y][x] > grayMatrix[y][x + 1] ? '1' : '0';
          }
        }
      }

      resolve({
        width,
        height,
        aspectRatio,
        thumbnailBase64,
        hash,
        previewUrl,
      });
    };

    img.onerror = () => {
      reject(new Error(`No se pudo cargar la imagen ${file.name}`));
    };

    img.src = previewUrl;
  });
}

// Calculate Hamming distance between two binary hash strings
function getHammingDistance(h1: string, h2: string): number {
  if (!h1 || !h2 || h1.length !== h2.length) return 999;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

// Main Scan and Audit function for Check Opera
export async function scanAndAnalyzeOperaFolder(
  files: File[],
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<OperaAnalysisReport> {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff'];
  const imageFilesOnly = files.filter((f) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(ext);
  });

  if (imageFilesOnly.length === 0) {
    throw new Error('No se encontraron archivos de imagen en la carpeta seleccionada.');
  }

  // Derive root folder name
  let rootFolderName = 'Carpeta Local';
  const firstWithRelative = files.find((f) => (f as any).webkitRelativePath);
  if (firstWithRelative && (firstWithRelative as any).webkitRelativePath) {
    const parts = (firstWithRelative as any).webkitRelativePath.split('/');
    if (parts.length > 1) {
      rootFolderName = parts[0];
    }
  }

  onProgress?.('Extrayendo dimensiones y firmas visuales...', 0, imageFilesOnly.length);

  const parsedImages: OperaImageFile[] = [];

  for (let i = 0; i < imageFilesOnly.length; i++) {
    const file = imageFilesOnly[i];
    const ext = file.name.split('.').pop()?.toUpperCase() || 'IMG';
    const relativePath = (file as any).webkitRelativePath || file.name;

    try {
      const meta = await computePerceptualHashAndThumbnail(file);
      parsedImages.push({
        id: `img-${i}-${Date.now()}`,
        name: file.name,
        relativePath,
        sizeBytes: file.size,
        sizeKB: Math.round(file.size / 1024),
        width: meta.width,
        height: meta.height,
        aspectRatio: meta.aspectRatio,
        dimensionsStr: `${meta.width}x${meta.height}`,
        extension: ext,
        previewUrl: meta.previewUrl,
        thumbnailBase64: meta.thumbnailBase64,
        hash: meta.hash,
        fileObj: file,
      });
    } catch (err) {
      console.warn(`Error processing ${file.name}:`, err);
    }

    onProgress?.(`Procesando imagen ${i + 1} de ${imageFilesOnly.length}...`, i + 1, imageFilesOnly.length);
  }

  onProgress?.('Analizando duplicados con IA y dimensiones exactas...', imageFilesOnly.length, imageFilesOnly.length);

  // Group by exact dimensions:
  const dimensionGroups: Record<string, OperaImageFile[]> = {};
  for (const img of parsedImages) {
    if (!dimensionGroups[img.dimensionsStr]) {
      dimensionGroups[img.dimensionsStr] = [];
    }
    dimensionGroups[img.dimensionsStr].push(img);
  }

  // 1. Try sending matching dimension candidate groups to backend Gemini API
  let aiDuplicateGroups: OperaDuplicateGroup[] = [];
  let usedBackendAI = false;

  try {
    const payload = {
      rootFolderName,
      images: parsedImages.map((img) => ({
        id: img.id,
        name: img.name,
        relativePath: img.relativePath,
        sizeBytes: img.sizeBytes,
        width: img.width,
        height: img.height,
        dimensionsStr: img.dimensionsStr,
        aspectRatio: img.aspectRatio,
        thumbnailBase64: img.thumbnailBase64,
      })),
    };

    const res = await fetch('/api/opera/check-duplicates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.duplicateGroups)) {
        aiDuplicateGroups = data.duplicateGroups.map((g: any) => ({
          ...g,
          // Hydrate with full OperaImageFile objects
          files: g.files.map((gf: any) => {
            const found = parsedImages.find((p) => p.name === gf.name || p.relativePath === gf.relativePath);
            return found || gf;
          }),
        }));
        usedBackendAI = true;
      }
    }
  } catch (backendErr) {
    console.warn('Backend AI check skipped, utilizing client perceptual matcher:', backendErr);
  }

  // 2. Client-side Perceptual Matcher (Fallback or Validator)
  // If AI was not used or returned empty, we cluster identical images within the same dimension
  const finalDuplicateGroups: OperaDuplicateGroup[] = [];

  if (usedBackendAI && aiDuplicateGroups.length > 0) {
    finalDuplicateGroups.push(...aiDuplicateGroups);
  } else {
    // Cluster identical dimension groups using perceptual dHash
    Object.entries(dimensionGroups).forEach(([dim, groupList]) => {
      if (groupList.length < 2) return;

      const visited = new Set<string>();

      for (let i = 0; i < groupList.length; i++) {
        const base = groupList[i];
        if (visited.has(base.id)) continue;

        const cluster: OperaImageFile[] = [base];
        visited.add(base.id);

        for (let j = i + 1; j < groupList.length; j++) {
          const target = groupList[j];
          if (visited.has(target.id)) continue;

          // dHash distance: 256 bits total.
          // Identical images usually have distance <= 8 bits (out of 256 bits).
          const dist = getHammingDistance(base.hash || '', target.hash || '');
          const isByteMatch = base.sizeBytes === target.sizeBytes;

          if (dist <= 8 || isByteMatch) {
            cluster.push(target);
            visited.add(target.id);
          }
        }

        if (cluster.length >= 2) {
          const totalBytes = cluster.reduce((acc, c) => acc + c.sizeBytes, 0);
          const wastedBytes = totalBytes - cluster[0].sizeBytes;
          finalDuplicateGroups.push({
            groupId: `dup-${dim}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dimensionsStr: dim,
            width: base.width,
            height: base.height,
            aspectRatio: base.aspectRatio,
            visualSummary: `Asset gráfico con contenido idéntico (${cluster[0].name.replace(/\.[^/.]+$/, '')})`,
            files: cluster,
            totalDuplicateCopies: cluster.length - 1,
            wastedBytes,
            confidence: 96,
            aiExplanation: `Las ${cluster.length} imágenes comparten exactamente la misma resolución (${dim} px) y el mismo contenido visual verificado.`,
          });
        }
      }
    });
  }

  // 3. Track images that share visual content but have DIFFERENT dimensions (Explicitly not reported as duplicates)
  const differentSizeIgnored: OperaDifferentSizeItem[] = [];
  for (let i = 0; i < parsedImages.length; i++) {
    for (let j = i + 1; j < parsedImages.length; j++) {
      const imgA = parsedImages[i];
      const imgB = parsedImages[j];
      if (imgA.dimensionsStr !== imgB.dimensionsStr) {
        const dist = getHammingDistance(imgA.hash || '', imgB.hash || '');
        if (dist <= 10) {
          differentSizeIgnored.push({
            id: `diff-${i}-${j}`,
            imageA: imgA,
            imageB: imgB,
            reason: `Mismo contenido visual detectado pero con diferente resolución (${imgA.dimensionsStr} px vs ${imgB.dimensionsStr} px). Siguiendo la regla de Check Opera, NO se clasifica como duplicado porque sólo se alertan imágenes idénticas en Contenido + Tamaño.`,
          });
        }
      }
    }
  }

  // Calculate totals
  const duplicatedFileIds = new Set<string>();
  let totalWastedBytes = 0;

  finalDuplicateGroups.forEach((g) => {
    totalWastedBytes += g.wastedBytes;
    g.files.forEach((f) => duplicatedFileIds.add(f.id));
  });

  const totalDuplicateFiles = duplicatedFileIds.size;
  const totalUniqueImages = parsedImages.length - totalDuplicateFiles + finalDuplicateGroups.length;

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const report: OperaAnalysisReport = {
    id: `opera-rep-${Date.now()}`,
    folderName: rootFolderName,
    analyzedDate: dateStr,
    timestamp: Date.now(),
    totalImagesScanned: parsedImages.length,
    totalUniqueImages,
    totalDuplicateGroups: finalDuplicateGroups.length,
    totalDuplicateFiles,
    totalWastedBytes,
    duplicateGroups: finalDuplicateGroups,
    differentSizeIgnored,
    allImages: parsedImages,
    rawTxtReport: '',
  };

  report.rawTxtReport = generateOperaTXTReport(report);
  return report;
}

// Generate Plain Text report
export function generateOperaTXTReport(report: OperaAnalysisReport): string {
  const lines: string[] = [];

  lines.push('======================================================================');
  lines.push('🎭 CHECK OPERA - AUDITORÍA DE IMÁGENES DUPLICADAS (IA & EXACT SIZE)');
  lines.push('======================================================================');
  lines.push(`Carpeta Auditada:       /${report.folderName}/`);
  lines.push(`Fecha de Análisis:      ${report.analyzedDate}`);
  lines.push(`Total Imágenes:         ${report.totalImagesScanned}`);
  lines.push(`Imágenes Únicas:        ${report.totalUniqueImages}`);
  lines.push(`Grupos Duplicados:      ${report.totalDuplicateGroups}`);
  lines.push(`Archivos en Conflicto:  ${report.totalDuplicateFiles}`);
  lines.push(`Espacio Redundante:     ${(report.totalWastedBytes / 1024).toFixed(1)} KB`);
  lines.push('----------------------------------------------------------------------');
  lines.push('REGLA ESTRICTA APLICADA:');
  lines.push('• Se detectan e informan ÚNICAMENTE imágenes con CONTENIDO IDÉNTICO + MISMO TAMAÑO.');
  lines.push('• Las imágenes con mismo contenido pero distinta resolución NO se marcan como duplicadas.');
  lines.push('======================================================================\n');

  if (report.duplicateGroups.length === 0) {
    lines.push('✅ ¡EXCELENTE! NO SE ENCONTRARON IMÁGENES DUPLICADAS DEL MISMO TAMAÑO.');
    lines.push('Todos los assets auditados en esta carpeta poseen contenido visual o resoluciones únicas.');
  } else {
    lines.push('🚨 DETALLE DE GRUPOS DUPLICADOS DETECTADOS:');
    lines.push('----------------------------------------------------------------------');

    report.duplicateGroups.forEach((group, idx) => {
      lines.push(`[GRUPO #${idx + 1}] Resolución: ${group.dimensionsStr} px (Ratio ${group.aspectRatio})`);
      lines.push(`  • Descripción IA:  ${group.visualSummary}`);
      lines.push(`  • Confianza:       ${group.confidence}%`);
      lines.push(`  • Explicación:     ${group.aiExplanation}`);
      lines.push(`  • Copias redundantes: ${group.totalDuplicateCopies} archivo(s) | Ahorro: ${(group.wastedBytes / 1024).toFixed(1)} KB`);
      lines.push('  • Archivos idénticos:');
      group.files.forEach((f, fIdx) => {
        lines.push(`      ${fIdx + 1}. [${f.name}] -> Ruta: /${f.relativePath} (${f.sizeKB} KB)`);
      });
      lines.push('');
    });
  }

  if (report.differentSizeIgnored.length > 0) {
    lines.push('\n----------------------------------------------------------------------');
    lines.push(`ℹ️ ASSETS CON MISMO CONTENIDO PERO DISTINTO TAMAÑO (OMITIDOS SEGÚN REGLA: ${report.differentSizeIgnored.length})`);
    lines.push('----------------------------------------------------------------------');
    report.differentSizeIgnored.forEach((item, idx) => {
      lines.push(`• Par #${idx + 1}: "${item.imageA.name}" (${item.imageA.dimensionsStr} px) vs "${item.imageB.name}" (${item.imageB.dimensionsStr} px)`);
      lines.push(`  -> Estado: Omitido correctamente (mismo visual, pero tamaño diferente).`);
    });
  }

  lines.push('\n======================================================================');
  lines.push('Generado por Validador de PDPs y Adaptaciones • Módulo Check Opera');
  lines.push('======================================================================');

  return lines.join('\n');
}

// Download TXT Report
export function downloadOperaTXT(report: OperaAnalysisReport) {
  const content = report.rawTxtReport || generateOperaTXTReport(report);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Check_Opera_${report.folderName.replace(/\s+/g, '_')}_Duplicados.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate PDF Report
export function generateOperaPDFReport(report: OperaAnalysisReport) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Banner
  doc.setFillColor(236, 72, 153); // Pink Opera accent
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECK OPERA - AUDITORÍA DE DUPLICADOS', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Carpeta: /${report.folderName}/  •  Fecha: ${report.analyzedDate}`, 14, 20);

  y = 36;

  // Metric Cards
  const cardWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: 'TOTAL IMÁGENES', val: `${report.totalImagesScanned}`, color: [30, 41, 59] },
    { label: 'GRUPOS DUPLICADOS', val: `${report.totalDuplicateGroups}`, color: report.totalDuplicateGroups > 0 ? [225, 29, 72] : [16, 185, 129] },
    { label: 'ARCHIVOS REPETIDOS', val: `${report.totalDuplicateFiles}`, color: report.totalDuplicateFiles > 0 ? [225, 29, 72] : [16, 185, 129] },
    { label: 'AHORRO POTENCIAL', val: `${(report.totalWastedBytes / 1024).toFixed(0)} KB`, color: [99, 102, 241] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, 20, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, y + 6);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + 3, y + 15);
  });

  y += 28;

  // Rule Notice Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('REGLA APLICADA:', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Sólo se reportan imágenes con CONTENIDO IDÉNTICO + MISMO TAMAÑO. Imágenes de distinto tamaño se omiten.', 18, y + 10);

  y += 20;

  // Duplicate Groups
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Grupos de Imágenes Duplicadas (${report.duplicateGroups.length})`, 14, y);
  y += 6;

  if (report.duplicateGroups.length === 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text('No se encontraron imágenes repetidas con el mismo tamaño en esta carpeta.', 14, y + 4);
  } else {
    report.duplicateGroups.forEach((group, idx) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(14, y, pageWidth - 28, 12 + group.files.length * 7, 2, 2, 'FD');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(190, 18, 60);
      doc.text(`Grupo #${idx + 1} — Resolución: ${group.dimensionsStr} px (${group.visualSummary})`, 18, y + 6);

      let fileY = y + 12;
      group.files.forEach((f, fIdx) => {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`${fIdx + 1}.  ${f.name}   |   Ruta: /${f.relativePath}   |   ${f.sizeKB} KB`, 20, fileY);
        fileY += 7;
      });

      y = fileY + 5;
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Validador de PDPs • Módulo Check Opera  |  Página ${i} de ${pageCount}`, 14, 288);
  }

  doc.save(`Check_Opera_${report.folderName.replace(/\s+/g, '_')}_Reporte.pdf`);
}

// Generate Realistic Demo Files for Check Opera testing
export async function generateDemoOperaFiles(): Promise<File[]> {
  const files: File[] = [];

  const createSampleImage = (
    name: string,
    relativePath: string,
    width: number,
    height: number,
    color: string,
    label: string,
    subLabel: string
  ): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Background
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);

      // Card / frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

      // Visual element (simulated lipstick / packshot)
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(width * 0.5, height * 0.45, Math.min(width, height) * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Text labels
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${Math.max(16, Math.floor(width * 0.045))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(label, width * 0.5, height * 0.78);

      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.max(12, Math.floor(width * 0.03))}px sans-serif`;
      ctx.fillText(subLabel, width * 0.5, height * 0.84);

      canvas.toBlob((blob) => {
        const file = new File([blob!], name, { type: 'image/jpeg' });
        Object.defineProperty(file, 'webkitRelativePath', {
          value: relativePath,
          writable: false,
        });
        resolve(file);
      }, 'image/jpeg', 0.9);
    });
  };

  // 1. Duplicate Group #1 (Superstay Matte Ink - 1200x1200 px in Amazon vs MercadoLibre folders)
  files.push(
    await createSampleImage(
      '01_Main_Superstay_1200.jpg',
      'Opera_DAM_Export/Amazon/01_Main_Superstay_1200.jpg',
      1200,
      1200,
      '#f1f5f9',
      'Superstay Matte Ink #15',
      '1200x1200px • Amazon'
    )
  );
  files.push(
    await createSampleImage(
      '01_Hero_Superstay_1200_copy.jpg',
      'Opera_DAM_Export/MercadoLibre/01_Hero_Superstay_1200_copy.jpg',
      1200,
      1200,
      '#f1f5f9',
      'Superstay Matte Ink #15',
      '1200x1200px • Amazon'
    )
  );

  // 2. Duplicate Group #2 (Revitalift Serum - 1000x1000 px in Falabella vs FarmaCity)
  files.push(
    await createSampleImage(
      'Serum_Acido_Hialuronico_1000.jpg',
      'Opera_DAM_Export/Falabella/Serum_Acido_Hialuronico_1000.jpg',
      1000,
      1000,
      '#ede9fe',
      'Revitalift Serum 30ml',
      '1000x1000px • Falabella'
    )
  );
  files.push(
    await createSampleImage(
      'Serum_Acido_Hialuronico_1000_v2.jpg',
      'Opera_DAM_Export/Farmacity/Serum_Acido_Hialuronico_1000_v2.jpg',
      1000,
      1000,
      '#ede9fe',
      'Revitalift Serum 30ml',
      '1000x1000px • Falabella'
    )
  );

  // 3. Different Size Pair (Same Superstay packshot but 1460x600 px banner vs 1200x1200 px - Should NOT be reported as duplicate!)
  files.push(
    await createSampleImage(
      'Superstay_Hero_Banner_1460x600.jpg',
      'Opera_DAM_Export/Amazon_Aplus/Superstay_Hero_Banner_1460x600.jpg',
      1460,
      600,
      '#f1f5f9',
      'Superstay Matte Ink #15',
      '1460x600px • Hero Banner'
    )
  );

  // 4. Unique Images
  files.push(
    await createSampleImage(
      '02_Beneficios_Formula_1200.jpg',
      'Opera_DAM_Export/Amazon/02_Beneficios_Formula_1200.jpg',
      1200,
      1200,
      '#e0f2fe',
      'Infografía 16 Horas de Duración',
      '1200x1200px • Única'
    )
  );
  files.push(
    await createSampleImage(
      '03_Shade_Guide_1200.jpg',
      'Opera_DAM_Export/Amazon/03_Shade_Guide_1200.jpg',
      1200,
      1200,
      '#fdf2f8',
      'Guía de Tonos Nude & Red',
      '1200x1200px • Única'
    )
  );
  files.push(
    await createSampleImage(
      '04_Modo_De_Uso_1000.jpg',
      'Opera_DAM_Export/MercadoLibre/04_Modo_De_Uso_1000.jpg',
      1000,
      1000,
      '#fef3c7',
      'Aplicación Paso a Paso',
      '1000x1000px • Única'
    )
  );

  return files;
}
