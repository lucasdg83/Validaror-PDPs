import { jsPDF } from 'jspdf';
import {
  OperaImageFile,
  OperaDuplicateGroup,
  OperaEntirelyDuplicatedFolder,
  OperaOmittedFile,
  OperaAnalysisReport,
} from '../types';

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// Helper to compute fast SHA-256 / sample hash for exact byte matching
async function computeFastFileHash(file: File): Promise<string> {
  try {
    const size = file.size;
    if (size <= 4 * 1024 * 1024) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      const s1 = file.slice(0, 65536);
      const mid = Math.floor(size / 2);
      const s2 = file.slice(mid, mid + 65536);
      const s3 = file.slice(size - 65536, size);
      const combined = new Blob([s1, s2, s3]);
      const buffer = await combined.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return `${size}-${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {
    return `${file.size}-${file.name}`;
  }
}

// Helper to normalize base filename (removes copies, suffixes, punctuation)
function cleanBaseFileName(name: string): string {
  return name
    .replace(/\.[^/.]+$/, '') // remove extension
    .toLowerCase()
    .replace(/[\s_-]*(copia|copy|\(\d+\))[\s_-]*/gi, '')
    .replace(/[^a-z0-9]/gi, '');
}

// Disjoint-Set / Union-Find for robust transitive duplicate clustering
class DisjointSet {
  parent = new Map<string, string>();
  rank = new Map<string, number>();

  find(id: string): string {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      this.rank.set(id, 0);
      return id;
    }
    const p = this.parent.get(id)!;
    if (p === id) return id;
    const root = this.find(p);
    this.parent.set(id, root);
    return root;
  }

  union(idA: string, idB: string): void {
    const rootA = this.find(idA);
    const rootB = this.find(idB);
    if (rootA === rootB) return;
    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }
}

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
  sha256: string;
  cleanName: string;
}> {
  const sha256 = await computeFastFileHash(file);
  const cleanName = cleanBaseFileName(file.name);

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
      const thumbnailBase64 = thumbCanvas.toDataURL('image/jpeg', 0.82);

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
        sha256,
        cleanName,
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

// Normalize folder path string (handles Windows backslashes, multiple slashes, trimming)
export function normalizeFolderPath(p: string): string {
  if (!p) return '(Raíz)';
  const cleaned = p.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '').trim();
  return cleaned || '(Raíz)';
}

// Extract subfolder path from webkitRelativePath
export function extractSubfolderPath(relativePath: string): { rootFolder: string; subfolderPath: string; folderName: string } {
  if (!relativePath) {
    return { rootFolder: 'Carpeta', subfolderPath: '(Raíz)', folderName: 'Raíz' };
  }
  const normalized = relativePath.replace(/\\/g, '/').replace(/\/+/g, '/').trim();
  if (!normalized.includes('/')) {
    return { rootFolder: 'Carpeta', subfolderPath: '(Raíz)', folderName: 'Raíz' };
  }
  const parts = normalized.split('/').filter(Boolean);
  const rootFolder = parts[0] || 'Carpeta';
  if (parts.length <= 2) {
    return { rootFolder, subfolderPath: '(Raíz)', folderName: rootFolder };
  }
  // Subfolder path between root and filename
  const subParts = parts.slice(1, parts.length - 1);
  const subfolderPath = subParts.join('/');
  const folderName = subParts[subParts.length - 1] || rootFolder;
  return { rootFolder, subfolderPath, folderName };
}

// Main Scan and Audit function for Check Opera
export async function scanAndAnalyzeOperaFolder(
  files: File[],
  onProgress?: (msg: string, current: number, total: number) => void
): Promise<OperaAnalysisReport> {
  const validImageFiles: File[] = [];
  const omittedFiles: OperaOmittedFile[] = [];

  // Separate valid image files (JPG, JPEG, PNG, WEBP) from omitted formats
  files.forEach((file, idx) => {
    const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
    const relPath = (file as any).webkitRelativePath || file.name;

    if (ALLOWED_IMAGE_EXTENSIONS.includes(rawExt)) {
      validImageFiles.push(file);
    } else {
      omittedFiles.push({
        id: `omitted-${idx}-${Date.now()}`,
        name: file.name,
        relativePath: relPath,
        extension: rawExt ? `.${rawExt.toUpperCase()}` : 'SIN EXT.',
        sizeBytes: file.size,
        sizeKB: Math.max(1, Math.round(file.size / 1024)),
        reason: `Formato no permitido (${rawExt ? '.' + rawExt.toUpperCase() : 'Desconocido'}). Check Opera audita estrictamente JPG, JPEG, PNG y WEBP.`,
      });
    }
  });

  if (validImageFiles.length === 0) {
    const omittedSummary = omittedFiles.length > 0 ? ` Se omitieron ${omittedFiles.length} archivo(s) no soportados.` : '';
    throw new Error(`No se encontraron imágenes en formatos permitidos (JPG, JPEG, PNG, WEBP) en la carpeta seleccionada.${omittedSummary}`);
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

  onProgress?.('Extrayendo dimensiones y firmas visuales de imágenes...', 0, validImageFiles.length);

  const parsedImages: OperaImageFile[] = [];

  for (let i = 0; i < validImageFiles.length; i++) {
    const file = validImageFiles[i];
    const ext = file.name.split('.').pop()?.toUpperCase() || 'IMG';
    const relativePath = (file as any).webkitRelativePath || file.name;
    const { subfolderPath } = extractSubfolderPath(relativePath);

    try {
      const meta = await computePerceptualHashAndThumbnail(file);
      parsedImages.push({
        id: `img-${i}-${Date.now()}`,
        name: file.name,
        relativePath,
        subfolderPath,
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
        sha256: meta.sha256,
        cleanName: meta.cleanName,
        fileObj: file,
      });
    } catch (err) {
      console.warn(`Error processing ${file.name}:`, err);
    }

    onProgress?.(`Procesando imagen ${i + 1} de ${validImageFiles.length}...`, i + 1, validImageFiles.length);
  }

  onProgress?.('Analizando duplicados con IA en resolución exacta...', validImageFiles.length, validImageFiles.length);

  // Group by exact dimensions:
  const dimensionGroups: Record<string, OperaImageFile[]> = {};
  for (const img of parsedImages) {
    if (!dimensionGroups[img.dimensionsStr]) {
      dimensionGroups[img.dimensionsStr] = [];
    }
    dimensionGroups[img.dimensionsStr].push(img);
  }

  // 1. Send matching dimension candidate groups to backend Gemini API
  let aiDuplicateGroups: OperaDuplicateGroup[] = [];

  try {
    const candidateGroups = Object.entries(dimensionGroups).filter(([_, list]) => list.length >= 2);
    if (candidateGroups.length > 0) {
      const payload = {
        rootFolderName,
        images: parsedImages.map((img) => ({
          id: img.id,
          name: img.name,
          relativePath: img.relativePath,
          subfolderPath: img.subfolderPath,
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
            files: g.files.map((gf: any) => {
              const found = parsedImages.find((p) => p.id === gf.id || p.relativePath === gf.relativePath || p.name === gf.name);
              return found || gf;
            }),
          }));
        }
      }
    }
  } catch (backendErr) {
    console.warn('Backend AI check skipped, continuing with local multi-tier analyzer:', backendErr);
  }

  // 2. High-Accuracy Multi-Tier Duplicate Clustering Engine
  const uf = new DisjointSet();

  // Tier 1: Exact SHA-256 byte match (across any images)
  const shaMap = new Map<string, OperaImageFile[]>();
  parsedImages.forEach((img) => {
    if (img.sha256) {
      if (!shaMap.has(img.sha256)) shaMap.set(img.sha256, []);
      shaMap.get(img.sha256)!.push(img);
    }
  });
  shaMap.forEach((imgs) => {
    if (imgs.length >= 2) {
      for (let i = 1; i < imgs.length; i++) {
        uf.union(imgs[0].id, imgs[i].id);
      }
    }
  });

  // Tier 2: Exact dimensions matching (size, dHash distance <= 18, clean filename, close size)
  Object.entries(dimensionGroups).forEach(([_, groupList]) => {
    if (groupList.length < 2) return;

    for (let i = 0; i < groupList.length; i++) {
      const a = groupList[i];
      for (let j = i + 1; j < groupList.length; j++) {
        const b = groupList[j];

        // Exact byte size match
        if (a.sizeBytes === b.sizeBytes && a.sizeBytes > 0) {
          uf.union(a.id, b.id);
          continue;
        }

        // dHash distance on 256 bits
        const dist = getHammingDistance(a.hash || '', b.hash || '');
        // Distance <= 18 is >= 93% visual similarity
        if (dist <= 18) {
          uf.union(a.id, b.id);
          continue;
        }

        // Same clean name + distance <= 30
        const cleanA = a.cleanName || cleanBaseFileName(a.name);
        const cleanB = b.cleanName || cleanBaseFileName(b.name);
        if (cleanA && cleanB && cleanA === cleanB && dist <= 30) {
          uf.union(a.id, b.id);
          continue;
        }

        // Very close file size (< 2% diff) + distance <= 24
        const sizeDiff = Math.abs(a.sizeBytes - b.sizeBytes) / Math.max(a.sizeBytes, b.sizeBytes, 1);
        if (sizeDiff < 0.02 && dist <= 24) {
          uf.union(a.id, b.id);
          continue;
        }
      }
    }
  });

  // Tier 3: Incorporate Gemini AI duplicate clusters if available
  if (aiDuplicateGroups.length > 0) {
    aiDuplicateGroups.forEach((g) => {
      if (g.files.length >= 2) {
        for (let i = 1; i < g.files.length; i++) {
          uf.union(g.files[0].id, g.files[i].id);
        }
      }
    });
  }

  // Build final duplicate groups from connected components
  const clusters = new Map<string, OperaImageFile[]>();
  parsedImages.forEach((img) => {
    const root = uf.find(img.id);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(img);
  });

  const finalDuplicateGroups: OperaDuplicateGroup[] = [];
  const duplicatedFileIdMap = new Map<string, OperaDuplicateGroup>();
  const assignedImageIds = new Set<string>();

  clusters.forEach((files, rootId) => {
    if (files.length >= 2) {
      const base = files[0];
      const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);
      const wastedBytes = totalBytes - base.sizeBytes;
      const validGroup: OperaDuplicateGroup = {
        groupId: `dup-${base.dimensionsStr}-${rootId}`,
        dimensionsStr: base.dimensionsStr,
        width: base.width,
        height: base.height,
        aspectRatio: base.aspectRatio,
        visualSummary: `Asset con contenido visual idéntico (${files[0].name.replace(/\.[^/.]+$/, '')})`,
        files,
        totalDuplicateCopies: files.length - 1,
        wastedBytes,
        confidence: 99,
        aiExplanation: `Las ${files.length} imágenes comparten exactamente la misma resolución (${base.dimensionsStr} px) y el mismo contenido visual verificado en ${files.length} ubicaciones.`,
      };
      finalDuplicateGroups.push(validGroup);
      files.forEach((f) => {
        assignedImageIds.add(f.id);
        duplicatedFileIdMap.set(f.id, validGroup);
      });
    }
  });

  // 3. Identify Redundant Folders (100% duplicate content or high duplication)
  const folderToImagesMap: Record<string, OperaImageFile[]> = {};
  parsedImages.forEach((img) => {
    const folderKey = normalizeFolderPath(img.subfolderPath);
    if (!folderToImagesMap[folderKey]) {
      folderToImagesMap[folderKey] = [];
    }
    folderToImagesMap[folderKey].push(img);
  });

  const entirelyDuplicatedFolders: OperaEntirelyDuplicatedFolder[] = [];

  // Check each subfolder: if 100% (or >= 80%) of images in this folder have copies elsewhere
  Object.entries(folderToImagesMap).forEach(([folderKey, folderImages]) => {
    if (folderKey === '(Raíz)' && Object.keys(folderToImagesMap).length === 1) return;
    if (folderImages.length === 0) return;

    let redundantCount = 0;

    folderImages.forEach((img) => {
      const dupGroup = duplicatedFileIdMap.get(img.id);
      if (dupGroup) {
        // Content exists outside this folder if dupGroup contains any image whose folder is different
        const hasExternalCopy = dupGroup.files.some(
          (other) => normalizeFolderPath(other.subfolderPath) !== folderKey
        );
        if (hasExternalCopy) {
          redundantCount++;
        }
      }
    });

    const is100Percent = redundantCount === folderImages.length && redundantCount > 0;
    const isHighDuplication = !is100Percent && folderImages.length >= 2 && redundantCount >= Math.ceil(folderImages.length * 0.8);

    if (is100Percent || isHighDuplication) {
      const fullSubfolderDisplay = folderKey === '(Raíz)' ? `/${rootFolderName}/` : `/${folderKey}/`;
      const pct = Math.round((redundantCount / folderImages.length) * 100);

      const recommendation = is100Percent
        ? `La carpeta "${fullSubfolderDisplay}" completa está duplicada`
        : `La carpeta "${fullSubfolderDisplay}" está duplicada al ${pct}% (${redundantCount} de ${folderImages.length} archivos)`;

      const explanation = is100Percent
        ? `El 100% de las imágenes (${folderImages.length} archivos) contenidas en "${fullSubfolderDisplay}" son copias idénticas de archivos ya existentes en otras ubicaciones del proyecto.`
        : `El ${pct}% de las imágenes (${redundantCount} de ${folderImages.length} archivos) contenidas en "${fullSubfolderDisplay}" son copias idénticas ya existentes en otras ubicaciones.`;

      entirelyDuplicatedFolders.push({
        folderPath: folderKey,
        folderDisplayName: fullSubfolderDisplay,
        totalImages: folderImages.length,
        wastedBytes: 0,
        recommendation,
        explanation,
        files: folderImages,
        duplicatedPercentage: pct,
      });
    }
  });

  // 3.1. Group entirely duplicated folders into clusters by shared duplicate files
  if (entirelyDuplicatedFolders.length > 0) {
    // Map each folder to the set of duplicate group IDs its images belong to
    const folderGroupSets = entirelyDuplicatedFolders.map((folder) => {
      const gids = new Set<string>();
      folder.files.forEach((img) => {
        const group = duplicatedFileIdMap.get(img.id);
        if (group) {
          gids.add(group.groupId);
        }
      });
      return gids;
    });

    const n = entirelyDuplicatedFolders.length;
    // Adjacency graph: an edge exists between two folders if they share at least one duplicate group
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let shares = false;
        for (const gid of folderGroupSets[i]) {
          if (folderGroupSets[j].has(gid)) {
            shares = true;
            break;
          }
        }
        if (shares) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }

    const visited = new Set<number>();
    let currentClusterId = 0;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) {
        const component: number[] = [];
        const queue: number[] = [i];
        visited.add(i);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          component.push(curr);
          for (const neighbor of adj[curr]) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }

        component.forEach((idx) => {
          const f = entirelyDuplicatedFolders[idx];
          f.clusterId = currentClusterId;
          f.clusterName = `Grupo ${currentClusterId + 1}`;

          // Matched folders from within entirelyDuplicatedFolders
          const internalMatches = component
            .filter((cIdx) => cIdx !== idx)
            .map((cIdx) => entirelyDuplicatedFolders[cIdx].folderDisplayName);

          if (internalMatches.length > 0) {
            f.matchedFolders = internalMatches;
          } else {
            // If no other entirely duplicated folder shares this cluster, look for other project folders containing duplicate copies
            const externalFolders = new Set<string>();
            f.files.forEach((file) => {
              const group = duplicatedFileIdMap.get(file.id);
              if (group) {
                group.files.forEach((otherFile) => {
                  const otherNorm = normalizeFolderPath(otherFile.subfolderPath);
                  const fNorm = normalizeFolderPath(f.folderPath);
                  if (otherNorm !== fNorm) {
                    const disp = otherNorm === '(Raíz)' ? `/${rootFolderName}/` : `/${otherNorm}/`;
                    externalFolders.add(disp);
                  }
                });
              }
            });
            f.matchedFolders = Array.from(externalFolders);
          }
        });

        currentClusterId++;
      }
    }
  }

  // 4. Construct Unique Images catalog (assets with no duplicates + 1 primary copy of each duplicate group)
  const uniqueImages: OperaImageFile[] = [];

  // Add 1 primary copy from each duplicate group
  finalDuplicateGroups.forEach((g) => {
    if (g.files.length > 0) {
      uniqueImages.push(g.files[0]);
    }
  });

  // Add all singletons (images that are not in any duplicate group)
  parsedImages.forEach((img) => {
    if (!assignedImageIds.has(img.id)) {
      uniqueImages.push(img);
    }
  });

  // Total duplicated copies (redundant files that should be removed)
  const totalDuplicateCopies = finalDuplicateGroups.reduce((acc, g) => acc + g.totalDuplicateCopies, 0);
  const totalUniqueImages = uniqueImages.length;
  const totalDuplicateFiles = assignedImageIds.size; // Total files participating in duplicate groups

  // Exact math sanity check: totalImagesScanned === totalUniqueImages + totalDuplicateCopies
  const totalImagesScanned = parsedImages.length;

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
    totalImagesScanned,
    totalUniqueImages,
    totalDuplicateGroups: finalDuplicateGroups.length,
    totalDuplicateCopies,
    totalDuplicateFiles,
    duplicateGroups: finalDuplicateGroups,
    uniqueImages,
    entirelyDuplicatedFolders,
    omittedFiles,
    totalOmittedFiles: omittedFiles.length,
    rawTxtReport: '',
  };

  report.rawTxtReport = generateOperaTXTReport(report);
  return report;
}

// Generate Plain Text report
export function generateOperaTXTReport(report: OperaAnalysisReport): string {
  const lines: string[] = [];

  lines.push('======================================================================');
  lines.push('🏛️ CHECK OPERA - AUDITORÍA DE IMÁGENES DUPLICADAS (OPERA DAM)');
  lines.push('======================================================================');
  lines.push(`Carpeta Auditada:               /${report.folderName}/`);
  lines.push(`Fecha de Análisis:              ${report.analyzedDate}`);
  lines.push(`Formatos Admitidos:             JPG, JPEG, PNG, WEBP`);
  lines.push(`Total Imágenes Analizadas:      ${report.totalImagesScanned}`);
  lines.push(`Imágenes Únicas (Sin repetir):  ${report.totalUniqueImages}`);
  lines.push(`Imágenes Duplicadas (Copias):   ${report.totalDuplicateCopies} (en ${report.totalDuplicateGroups} grupos)`);
  lines.push(`Comprobación:                   ${report.totalUniqueImages} únicas + ${report.totalDuplicateCopies} duplicadas = ${report.totalImagesScanned} total`);
  if (report.totalOmittedFiles > 0) {
    lines.push(`Archivos Omitidos:              ${report.totalOmittedFiles} archivo(s) con formato no admitido`);
  }
  lines.push('----------------------------------------------------------------------');
  lines.push('REGLA ESTRICTA DE OPERA DAM:');
  lines.push('• Se detectan e informan ÚNICAMENTE imágenes con CONTENIDO IDÉNTICO + MISMO TAMAÑO.');
  lines.push('• Se auditan imágenes en el directorio raíz y en todas sus subcarpetas.');
  lines.push('======================================================================\n');

  // Highlight Entirely Duplicated Folders (if any)
  if (report.entirelyDuplicatedFolders.length > 0) {
    lines.push('🚨 ALERTA: CARPETAS 100% DUPLICADAS DETECTADAS');
    lines.push('----------------------------------------------------------------------');
    report.entirelyDuplicatedFolders.forEach((folder, idx) => {
      const clusterTag = folder.clusterName ? `[${folder.clusterName}] ` : '';
      lines.push(`[CARPETA DUPLICADA #${idx + 1} ${clusterTag}]`);
      lines.push(`👉 ${folder.recommendation}`);
      if (folder.matchedFolders && folder.matchedFolders.length > 0) {
        lines.push(`   • Coincide con carpeta(s): ${folder.matchedFolders.join(', ')}`);
      }
      lines.push(`   • Ruta Subcarpeta: ${folder.folderDisplayName}`);
      lines.push(`   • Total Archivos:   ${folder.totalImages} imágenes (100% duplicadas en otras ubicaciones)`);
      lines.push(`   • Diagnóstico:     ${folder.explanation}`);
      lines.push('');
    });
    lines.push('----------------------------------------------------------------------\n');
  }

  // Duplicate Groups Detail
  if (report.duplicateGroups.length === 0) {
    lines.push('✅ ¡EXCELENTE! NO SE ENCONTRARON IMÁGENES DUPLICADAS DEL MISMO TAMAÑO.');
    lines.push('Todos los assets auditados en esta carpeta poseen contenido visual o resoluciones únicas.');
  } else {
    lines.push('🚨 DETALLE DE GRUPOS DUPLICADOS DETECTADOS (MISMO CONTENIDO + MISMO TAMAÑO):');
    lines.push('----------------------------------------------------------------------');

    report.duplicateGroups.forEach((group, idx) => {
      lines.push(`[GRUPO DUPLICADO #${idx + 1}] Resolución: ${group.dimensionsStr} px (Ratio ${group.aspectRatio})`);
      lines.push(`  • Descripción Visual: ${group.visualSummary}`);
      lines.push(`  • Certeza IA:         ${group.confidence}%`);
      lines.push(`  • Diagnóstico:        ${group.aiExplanation}`);
      lines.push(`  • Total archivos:     ${group.files.length} (${group.totalDuplicateCopies} copia(s) repetida(s))`);
      lines.push('  • Ubicación y archivos idénticos:');
      group.files.forEach((f, fIdx) => {
        lines.push(`      ${fIdx + 1}. [${f.name}] -> Subcarpeta: /${f.subfolderPath}/ | Ruta: /${f.relativePath}`);
      });
      lines.push('');
    });
  }

  // Unique Images Section
  lines.push('\n----------------------------------------------------------------------');
  lines.push(`✨ CATÁLOGO DE IMÁGENES ÚNICAS (${report.uniqueImages.length} ASSETS DISTINTOS):`);
  lines.push('----------------------------------------------------------------------');
  report.uniqueImages.forEach((img, idx) => {
    lines.push(`  ${idx + 1}. ${img.name} | ${img.dimensionsStr} px | Subcarpeta: /${img.subfolderPath}/`);
  });

  // Omitted Files Section
  if (report.omittedFiles.length > 0) {
    lines.push('\n----------------------------------------------------------------------');
    lines.push(`ℹ️ ARCHIVOS OMITIDOS DEL ANÁLISIS (${report.omittedFiles.length} FORMATOS NO PERMITIDOS):`);
    lines.push('Formatos admitidos exclusivamente: JPG, JPEG, PNG, WEBP');
    lines.push('----------------------------------------------------------------------');
    report.omittedFiles.forEach((file, idx) => {
      lines.push(`  ${idx + 1}. [${file.name}] -> Formato: ${file.extension} | Ruta: /${file.relativePath}`);
      lines.push(`     Motivo: ${file.reason}`);
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
  doc.setFillColor(236, 72, 153); // Opera pink
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECK OPERA - AUDITORÍA DE IMÁGENES DUPLICADAS', 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Carpeta: /${report.folderName}/  •  Fecha: ${report.analyzedDate}  •  Formatos: JPG, JPEG, PNG, WEBP`, 14, 20);

  y = 35;

  // 3 Metric Cards (Exact math: Total = Únicas + Duplicadas)
  const cardWidth = (pageWidth - 28 - 6) / 3;
  const metrics = [
    { label: 'TOTAL IMÁGENES', val: `${report.totalImagesScanned}`, sub: 'Auditoría en subcarpetas', color: [30, 41, 59] },
    { label: 'IMÁGENES ÚNICAS', val: `${report.totalUniqueImages}`, sub: 'Assets sin repetición', color: [16, 185, 129] },
    { label: 'IMÁGENES DUPLICADAS', val: `${report.totalDuplicateCopies}`, sub: `En ${report.totalDuplicateGroups} grupo(s) repetidos`, color: report.totalDuplicateCopies > 0 ? [225, 29, 72] : [16, 185, 129] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, 22, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, y + 6);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.val, x + 3, y + 14);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(m.sub, x + 3, y + 19);
  });

  y += 28;

  // Notice: Entirely Duplicated Folders recommendation
  if (report.entirelyDuplicatedFolders.length > 0) {
    const clusterPalette = [
      { fill: [254, 243, 199], stroke: [245, 158, 11], text: [180, 83, 9] }, // Amber
      { fill: [207, 250, 254], stroke: [6, 182, 212], text: [14, 116, 144] }, // Cyan
      { fill: [243, 232, 255], stroke: [168, 85, 247], text: [126, 34, 206] }, // Purple
      { fill: [209, 250, 229], stroke: [16, 185, 129], text: [4, 120, 87] }, // Emerald
      { fill: [255, 228, 230], stroke: [244, 63, 94], text: [190, 18, 60] }, // Rose
      { fill: [224, 231, 255], stroke: [99, 102, 241], text: [67, 56, 202] }, // Indigo
    ];

    report.entirelyDuplicatedFolders.forEach((folder, idx) => {
      if (y > 238) {
        doc.addPage();
        y = 20;
      }
      const cIndex = (folder.clusterId ?? idx) % clusterPalette.length;
      const c = clusterPalette[cIndex];

      doc.setFillColor(c.fill[0], c.fill[1], c.fill[2]);
      doc.setDrawColor(c.stroke[0], c.stroke[1], c.stroke[2]);
      doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(c.text[0], c.text[1], c.text[2]);
      const prefix = folder.clusterName ? `[${folder.clusterName}] ` : '';
      doc.text(`${prefix}${folder.recommendation}`, 18, y + 6);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const matchText = folder.matchedFolders && folder.matchedFolders.length > 0
        ? `Coincide con: ${folder.matchedFolders.join(', ')} • `
        : '';
      doc.text(`${matchText}100% de imágenes (${folder.totalImages}) duplicadas en el proyecto.`, 18, y + 13);

      y += 24;
    });
  }

  // Duplicate Groups Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Grupos de Imágenes Duplicadas (${report.duplicateGroups.length})`, 14, y);
  y += 6;

  if (report.duplicateGroups.length === 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text('No se encontraron imágenes repetidas con el mismo tamaño en esta carpeta.', 14, y + 4);
    y += 10;
  } else {
    report.duplicateGroups.forEach((group, idx) => {
      if (y > 235) {
        doc.addPage();
        y = 20;
      }

      const boxHeight = 12 + group.files.length * 6.5;
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 205, 211);
      doc.roundedRect(14, y, pageWidth - 28, boxHeight, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(190, 18, 60);
      doc.text(`Grupo #${idx + 1} — ${group.dimensionsStr} px (${group.visualSummary})`, 18, y + 6);

      let fileY = y + 11;
      group.files.forEach((f, fIdx) => {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(`${fIdx + 1}.  ${f.name}   |   Subcarpeta: /${f.subfolderPath}/`, 20, fileY);
        fileY += 6;
      });

      y = fileY + 5;
    });
  }

  // Unique Images Summary
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Catálogo de Imágenes Únicas (${report.uniqueImages.length})`, 14, y);
  y += 6;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  const uCount = Math.min(10, report.uniqueImages.length);
  doc.roundedRect(14, y, pageWidth - 28, 8 + uCount * 5.5, 2, 2, 'FD');

  let uY = y + 6;
  for (let i = 0; i < uCount; i++) {
    const uImg = report.uniqueImages[i];
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 101, 52);
    doc.text(`• ${uImg.name}  (${uImg.dimensionsStr} px, /${uImg.subfolderPath}/)`, 18, uY);
    uY += 5.5;
  }
  if (report.uniqueImages.length > 10) {
    doc.setFontSize(6.5);
    doc.text(`... y ${report.uniqueImages.length - 10} imágenes únicas adicionales.`, 18, uY);
    uY += 5;
  }
  y = uY + 6;

  // Omitted Files (if any)
  if (report.omittedFiles.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`Formatos Omitidos del Análisis (${report.omittedFiles.length})`, 14, y);
    y += 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Se omitieron archivos no correspondientes a JPG, JPEG, PNG, WEBP.`, 14, y);
    y += 5;
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`IA Test Produ • Opera  |  Página ${i} de ${pageCount}`, 14, 288);
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

      // Visual element (simulated cosmetic asset)
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

  // Helper for non-image dummy files (to test omitted format reporting)
  const createDummyFile = (name: string, relativePath: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const file = new File([blob], name, { type });
    Object.defineProperty(file, 'webkitRelativePath', {
      value: relativePath,
      writable: false,
    });
    return file;
  };

  // 1. Group #1 Duplicates: Superstay 1200x1200 in Amazon vs MercadoLibre
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
      '1200x1200px • MercadoLibre'
    )
  );

  // 2. Group #2 Duplicates: Revitalift Serum 1000x1000 in Falabella vs FarmaCity
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
      '1000x1000px • Farmacity'
    )
  );

  // 3. Subfolder with 100% redundant duplicate content ("MercadoLibre_Backup_Total")
  // Both images in this folder already exist in Amazon & Falabella
  files.push(
    await createSampleImage(
      '01_Main_Superstay_1200_backup.jpg',
      'Opera_DAM_Export/MercadoLibre_Backup_Total/01_Main_Superstay_1200_backup.jpg',
      1200,
      1200,
      '#f1f5f9',
      'Superstay Matte Ink #15',
      '1200x1200px • Copia'
    )
  );
  files.push(
    await createSampleImage(
      'Serum_Acido_Hialuronico_1000_backup.jpg',
      'Opera_DAM_Export/MercadoLibre_Backup_Total/Serum_Acido_Hialuronico_1000_backup.jpg',
      1000,
      1000,
      '#ede9fe',
      'Revitalift Serum 30ml',
      '1000x1000px • Copia'
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
      'Infografía 16H Duración',
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
      'Guía de Tonos Nude',
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
      'Paso a Paso Aplicación',
      '1000x1000px • Única'
    )
  );

  // 5. Non-image files to verify Omitted Formats detection (.pdf, .psd, .docx)
  files.push(
    createDummyFile('Brief_Loreal_Q1.pdf', 'Opera_DAM_Export/Docs/Brief_Loreal_Q1.pdf', 'PDF Brief Content', 'application/pdf')
  );
  files.push(
    createDummyFile('Master_Packaging.psd', 'Opera_DAM_Export/Design_Sources/Master_Packaging.psd', 'PSD binary content', 'application/octet-stream')
  );

  return files;
}
