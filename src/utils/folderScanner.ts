import {
  CountryCode,
  RetailerSpec,
  RetailerAnalysisResult,
  AnalyzedFile,
  BulletItem,
  AnalysisReport,
} from '../types';
import { getSpecsForCountry } from '../data/retailerSpecs';
import { analyzeImageFile, analyzeVideoFile } from './imageAnalyzer';
import { generateTextReport, getCountryDisplayName } from './reportFormatter';

/**
 * Normalizes string for fuzzy folder matching
 */
function normalizeName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');      // strip spaces, underscores, hyphens
}

/**
 * Checks if a folder name matches any retailer aliases
 */
function matchRetailerAlias(folderName: string, spec: RetailerSpec): boolean {
  const normFolder = normalizeName(folderName);
  const normRetailerName = normalizeName(spec.name);

  if (normFolder === normRetailerName || normFolder.includes(normRetailerName) || normRetailerName.includes(normFolder)) {
    return true;
  }

  for (const alias of spec.aliases) {
    const normAlias = normalizeName(alias);
    if (normFolder === normAlias || normFolder.includes(normAlias) || normAlias.includes(normFolder)) {
      return true;
    }
  }

  return false;
}

/**
 * Scans and groups files, then audits them against country specifications
 */
export async function auditFilesForCountry(
  files: File[],
  country: CountryCode,
  onProgress?: (progress: { current: number; total: number; currentFile: string }) => void
): Promise<AnalysisReport> {
  const specs = getSpecsForCountry(country);
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Determine root folder name
  let rootFolderName = '';
  if (files.length > 0) {
    const firstPath = files[0].webkitRelativePath || files[0].name;
    const parts = firstPath.split('/');
    if (parts.length > 1) {
      rootFolderName = parts[0];
    }
  }

  // 2. Group files by retailer
  const retailerFilesMap = new Map<string, { matchedFolder: string; fileList: File[] }>();
  specs.forEach((s) => retailerFilesMap.set(s.id, { matchedFolder: '', fileList: [] }));

  // Also track files that might be at root or in unrecognized folders
  const unmatchedFiles: { path: string; file: File }[] = [];

  for (const file of files) {
    const relPath = file.webkitRelativePath || file.name;
    const pathParts = relPath.split('/').filter(Boolean);

    // Look through path segments for a retailer match
    let matchedSpecId: string | null = null;
    let matchedFolderSegment = '';

    for (let i = 0; i < pathParts.length - 1; i++) {
      const segment = pathParts[i];
      for (const spec of specs) {
        if (matchRetailerAlias(segment, spec)) {
          matchedSpecId = spec.id;
          matchedFolderSegment = segment;
          break;
        }
      }
      if (matchedSpecId) break;
    }

    // Special case: if folder only has 1 segment (e.g. user selected "MeLi" folder directly)
    if (!matchedSpecId && pathParts.length === 1) {
      const singleName = pathParts[0];
      for (const spec of specs) {
        if (matchRetailerAlias(singleName, spec)) {
          matchedSpecId = spec.id;
          matchedFolderSegment = singleName;
          break;
        }
      }
    }

    if (matchedSpecId) {
      const current = retailerFilesMap.get(matchedSpecId)!;
      current.fileList.push(file);
      if (!current.matchedFolder) {
        current.matchedFolder = matchedFolderSegment;
      }
    } else {
      unmatchedFiles.push({ path: relPath, file });
    }
  }

  // If all files were in a single root folder that matched a retailer alias
  if (unmatchedFiles.length === files.length && rootFolderName) {
    for (const spec of specs) {
      if (matchRetailerAlias(rootFolderName, spec)) {
        const current = retailerFilesMap.get(spec.id)!;
        current.matchedFolder = rootFolderName;
        current.fileList = [...files];
        break;
      }
    }
  }

  const results: RetailerAnalysisResult[] = [];
  const totalFilesToAnalyze = files.length;
  let filesAnalyzedCount = 0;

  // 3. Process each retailer spec
  for (const spec of specs) {
    const data = retailerFilesMap.get(spec.id)!;
    const retailerFiles = data.fileList;
    const matchedFolderName = data.matchedFolder || null;

    if (retailerFiles.length === 0) {
      results.push({
        retailerSpec: spec,
        matchedFolderName: null,
        files: [],
        imageCount: 0,
        videoCount: 0,
        hasErrors: false,
        hasWarnings: true,
        conformFilesCount: 0,
        inconsistentFilesCount: 0,
        bulletItems: [],
      });
      continue;
    }

    // Sort files naturally by filename (01_..., 02_..., img1, etc.)
    retailerFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    const analyzedFileList: AnalyzedFile[] = [];
    const bulletItems: BulletItem[] = [];

    let imageCount = 0;
    let videoCount = 0;
    let conformFilesCount = 0;
    let inconsistentFilesCount = 0;

    let allDimensionsMatch = true;
    let allRatiosMatch = true;
    let dimensionsSample = `${spec.width}x${spec.height}px`;
    let ratioSample = spec.aspectRatio;

    const imageFiles: AnalyzedFile[] = [];
    const videoFiles: AnalyzedFile[] = [];

    // Analyze individual files
    for (const file of retailerFiles) {
      filesAnalyzedCount++;
      if (onProgress) {
        onProgress({
          current: filesAnalyzedCount,
          total: totalFilesToAnalyze,
          currentFile: `${spec.name} / ${file.name}`,
        });
      }

      const ext = file.name.split('.').pop()?.toUpperCase() || '';
      const sizeKB = Math.round(file.size / 1024);
      const isImg = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'AVIF'].includes(ext);
      const isVid = ['MP4', 'MOV', 'WEBM', 'AVI'].includes(ext);

      const fileItem: AnalyzedFile = {
        name: file.name,
        relativePath: file.webkitRelativePath || file.name,
        sizeBytes: file.size,
        sizeKB,
        extension: ext,
        isImage: isImg,
        isVideo: isVid,
        errors: [],
        warnings: [],
        okNotes: [],
        fileObj: file,
      };

      if (isImg) {
        imageCount++;
        const imgData = await analyzeImageFile(file);
        fileItem.width = imgData.width;
        fileItem.height = imgData.height;
        fileItem.aspectRatio = imgData.aspectRatio;
        fileItem.dpi = imgData.dpi;
        fileItem.whiteBgRatio = imgData.whiteBgRatio;
        fileItem.packshotBoundingSize = imgData.packshotBoundingSize;
        fileItem.previewUrl = imgData.previewUrl;

        // Check Dimensions
        const widthMatches = imgData.width === spec.width;
        const heightMatches = imgData.height === spec.height;
        if (!widthMatches || !heightMatches) {
          allDimensionsMatch = false;
          fileItem.errors.push(`Dimensiones incorrectas: ${imgData.width}x${imgData.height}px (Requerido: ${spec.width}x${spec.height}px)`);
        }

        // Check Aspect Ratio
        if (imgData.aspectRatio !== spec.aspectRatio && !(spec.aspectRatio === '1:1' && imgData.width === imgData.height)) {
          allRatiosMatch = false;
          fileItem.errors.push(`Aspect ratio incorrecto: ${imgData.aspectRatio} (Requerido: ${spec.aspectRatio})`);
        }

        // Check Allowed Formats
        if (!spec.allowedFormats.includes(ext as any)) {
          fileItem.errors.push(`Formato "${ext}" no permitido (Permitidos: ${spec.allowedFormats.join(', ')})`);
        }

        // Check Max File Size
        if (spec.maxFileSizeKB && sizeKB > spec.maxFileSizeKB) {
          fileItem.errors.push(`Supera el peso máximo permitido (${sizeKB}KB > ${spec.maxFileSizeKB}KB)`);
        }

        // Check Packshot Centering (e.g. Farmacity)
        if (spec.packshotCentering) {
          const { minPackshotSize } = spec.packshotCentering;
          if (imgData.packshotBoundingSize && imgData.packshotBoundingSize < minPackshotSize) {
            fileItem.warnings.push(
              `Campo de packshot de "${file.name}" es de ${imgData.packshotBoundingSize}px (Mínimo requerido: ${minPackshotSize}px)`
            );
          }
        }

        if (fileItem.errors.length > 0) {
          inconsistentFilesCount++;
        } else {
          conformFilesCount++;
        }

        imageFiles.push(fileItem);
      } else if (isVid) {
        videoCount++;
        const vidData = await analyzeVideoFile(file);
        fileItem.videoDuration = vidData.duration;
        fileItem.videoWidth = vidData.width;
        fileItem.videoHeight = vidData.height;
        fileItem.isVerticalVideo = vidData.isVertical;

        if (spec.videoType === 'vertical_30s') {
          if (!vidData.isVertical && vidData.width > 0) {
            fileItem.errors.push(`El video debe ser Vertical 9:16 (Detectado: ${vidData.width}x${vidData.height}px)`);
          }
          if (vidData.duration > 31) {
            fileItem.warnings.push(`Duración del video supera los 30s (${Math.round(vidData.duration)}s)`);
          }
        }

        if (fileItem.errors.length > 0) {
          inconsistentFilesCount++;
        } else {
          conformFilesCount++;
        }

        videoFiles.push(fileItem);
      } else {
        // Non-media file (e.g. .DS_Store, text, etc)
        fileItem.warnings.push(`Archivo no reconocido como medio PDP: ${file.name}`);
      }

      analyzedFileList.push(fileItem);
    }

    // --- Build Formatted Bullet Points for this Retailer ---

    // 1. Dimensions check bullet
    if (imageFiles.length > 0) {
      if (allDimensionsMatch) {
        bulletItems.push({
          type: 'OK',
          message: `Dimensiones: ${dimensionsSample}.`,
        });
      } else {
        const errorImgs = imageFiles.filter((f) => f.width !== spec.width || f.height !== spec.height);
        if (errorImgs.length === imageFiles.length) {
          bulletItems.push({
            type: 'ERROR',
            message: `Dimensiones incorrectas en todas las imágenes (${imageFiles[0].width}x${imageFiles[0].height}px en vez de ${spec.width}x${spec.height}px).`,
          });
        } else {
          errorImgs.forEach((img) => {
            bulletItems.push({
              type: 'ERROR',
              message: `"${img.name}" tiene dimensiones incorrectas: ${img.width}x${img.height}px (Esperado: ${spec.width}x${spec.height}px).`,
              fileName: img.name,
            });
          });
        }
      }

      // 2. Aspect Ratio bullet
      if (allRatiosMatch) {
        bulletItems.push({
          type: 'OK',
          message: `Ratio ${ratioSample} correcto.`,
        });
      }
    }

    // 3. Image count check
    if (imageCount <= spec.maxImages) {
      bulletItems.push({
        type: 'OK',
        message: `Cantidad de imágenes (${imageCount}/${spec.maxImages}).`,
      });
    } else {
      bulletItems.push({
        type: 'ERROR',
        message: `Se encontraron ${imageCount} imágenes (Máximo permitido: ${spec.maxImages}).`,
      });
    }

    // 4. File size errors
    imageFiles.forEach((img) => {
      if (spec.maxFileSizeKB && img.sizeKB > spec.maxFileSizeKB) {
        bulletItems.push({
          type: 'ERROR',
          message: `"${img.name}" supera el peso máximo (${img.sizeKB}KB > ${spec.maxFileSizeKB}KB).`,
          fileName: img.name,
        });
      }
    });

    // 5. Formats check
    imageFiles.forEach((img) => {
      if (!spec.allowedFormats.includes(img.extension as any)) {
        bulletItems.push({
          type: 'ERROR',
          message: `"${img.name}" tiene formato no permitido (${img.extension}). Requerido: ${spec.allowedFormats.join('/')}.`,
          fileName: img.name,
        });
      }
    });

    // 6. Packshot bounding box warnings (Farmacity)
    imageFiles.forEach((img) => {
      if (spec.packshotCentering && img.packshotBoundingSize && img.packshotBoundingSize < spec.packshotCentering.minPackshotSize) {
        bulletItems.push({
          type: 'ADVERTENCIA',
          message: `Campo de packshot de "${img.name}" es de ${img.packshotBoundingSize}px (Mínimo requerido: ${spec.packshotCentering.minPackshotSize}px).`,
          fileName: img.name,
        });
      }
    });

    // 7. Main White Background verification (FarmaPlus, FarmaOnline, Juleriaque, FarmaShop)
    if (spec.mainWhiteBackground && imageFiles.length > 0) {
      const mainImg = imageFiles[0];
      if (mainImg.whiteBgRatio !== undefined && mainImg.whiteBgRatio < 0.8) {
        bulletItems.push({
          type: 'ADVERTENCIA',
          message: `Imagen principal "${mainImg.name}" podría no tener fondo blanco puro (pureza detectada: ${Math.round(mainImg.whiteBgRatio * 100)}%).`,
          fileName: mainImg.name,
        });
      }
    }

    // 8. Sequence checks (FarmaOnline, Juleriaque, Rouge, ElTunel)
    if (spec.sequenceRule && imageFiles.length > 0) {
      bulletItems.push({
        type: 'INFO',
        message: `Regla de secuencia: ${spec.sequenceRule}.`,
      });
    }

    // 9. Video check
    if (spec.requireVideo) {
      if (videoCount > 0) {
        const vid = videoFiles[0];
        if (spec.videoType === 'vertical_30s') {
          if (vid.isVerticalVideo) {
            bulletItems.push({
              type: 'INFO',
              message: `Video MP4 Vertical detectado (${Math.round(vid.videoDuration || 0)}s).`,
            });
          } else {
            bulletItems.push({
              type: 'ERROR',
              message: `Video promocional detectado pero NO es vertical 9:16 (${vid.videoWidth}x${vid.videoHeight}px).`,
            });
          }
        } else {
          bulletItems.push({
            type: 'INFO',
            message: `Video promocional detectado (.mp4).`,
          });
        }
      } else {
        bulletItems.push({
          type: 'ERROR',
          message: `No se encontró archivo de video (.mp4) obligatorio.`,
        });
      }
    }

    const hasErrors = bulletItems.some((b) => b.type === 'ERROR');
    const hasWarnings = bulletItems.some((b) => b.type === 'ADVERTENCIA');

    results.push({
      retailerSpec: spec,
      matchedFolderName,
      files: analyzedFileList,
      imageCount,
      videoCount,
      hasErrors,
      hasWarnings,
      conformFilesCount,
      inconsistentFilesCount,
      bulletItems,
    });
  }

  const rawTxtReport = generateTextReport(country, rootFolderName, results, specs.length);

  return {
    id: `rep_${Date.now()}`,
    country,
    countryName: getCountryDisplayName(country),
    rootFolderName,
    analyzedDate: dateStr,
    timestamp: Date.now(),
    retailers: results,
    totalRetailersExpected: specs.length,
    totalRetailersValidated: results.filter((r) => r.files.length > 0).length,
    totalConformFiles: results.reduce((acc, r) => acc + r.conformFilesCount, 0),
    totalInconsistentFiles: results.reduce((acc, r) => acc + r.inconsistentFilesCount, 0),
    rawTxtReport,
  };
}
