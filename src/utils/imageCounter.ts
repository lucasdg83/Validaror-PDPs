export interface SizeCountItem {
  width: number;
  height: number;
  dimensionsStr: string;
  count: number;
  aspectRatio: string;
  files: { name: string; relativePath: string; sizeKB: number; type: 'image' | 'video' }[];
}

export interface ImageCounterResult {
  rootFolderName: string;
  totalFiles: number;
  totalAssets: number;
  totalImages: number;
  totalVideos: number;
  totalUnsupported: number;
  uniqueSizesCount: number;
  sizeCounts: SizeCountItem[];
  formattedText: string;
}

export const COUNTER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'];
export const COUNTER_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogv'];
export const COUNTER_ASSET_EXTENSIONS = [...COUNTER_IMAGE_EXTENSIONS, ...COUNTER_VIDEO_EXTENSIONS];

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function calculateAspectRatio(w: number, h: number): string {
  if (!w || !h) return '-';
  if (w === h) return '1:1';
  const divisor = gcd(w, h);
  const rw = w / divisor;
  const rh = h / divisor;
  if (rw <= 21 && rh <= 21) {
    return `${rw}:${rh}`;
  }
  const ratio = (w / h).toFixed(2);
  return `${ratio}:1`;
}

export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  // Use createImageBitmap when supported (fastest, background thread)
  if (typeof createImageBitmap === 'function' && !file.type.includes('svg')) {
    try {
      const bitmap = await createImageBitmap(file);
      const width = bitmap.width;
      const height = bitmap.height;
      bitmap.close();
      return { width, height };
    } catch {
      // Fallback to Image element on failure
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo decodificar la imagen: ${file.name}`));
    };
    img.src = url;
  });
}

export async function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    (video as any).playsInline = true;

    const onLoaded = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (width && height) {
        resolve({ width, height });
      } else {
        reject(new Error(`No se detectaron dimensiones de video válidas en: ${file.name}`));
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error(`No se pudo decodificar el video: ${file.name}`));
    };

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      URL.revokeObjectURL(url);
    };

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
    video.src = url;
  });
}

export async function getAssetDimensions(file: File): Promise<{ width: number; height: number }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (COUNTER_VIDEO_EXTENSIONS.includes(ext)) {
    return getVideoDimensions(file);
  }
  return getImageDimensions(file);
}

export async function analyzeImageSizes(
  files: File[],
  onProgress?: (current: number, total: number, currentFileName: string) => void
): Promise<ImageCounterResult> {
  let rootFolder = 'Carpeta Local';
  const firstWithRelative = files.find((f) => (f as any).webkitRelativePath);
  if (firstWithRelative && (firstWithRelative as any).webkitRelativePath) {
    const parts = (firstWithRelative as any).webkitRelativePath.split('/');
    if (parts.length > 1) {
      rootFolder = parts[0];
    }
  }

  // Filter image and video asset files
  const assetFiles: { file: File; type: 'image' | 'video' }[] = [];
  let unsupportedCount = 0;
  let imageCount = 0;
  let videoCount = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (COUNTER_IMAGE_EXTENSIONS.includes(ext)) {
      assetFiles.push({ file, type: 'image' });
      imageCount++;
    } else if (COUNTER_VIDEO_EXTENSIONS.includes(ext)) {
      assetFiles.push({ file, type: 'video' });
      videoCount++;
    } else {
      unsupportedCount++;
    }
  }

  const dimensionMap = new Map<string, SizeCountItem>();
  const totalAssets = assetFiles.length;

  for (let i = 0; i < totalAssets; i++) {
    const { file, type } = assetFiles[i];
    if (onProgress) {
      onProgress(i + 1, totalAssets, file.name);
    }

    try {
      const { width, height } = await getAssetDimensions(file);
      const key = `${width}x${height}`;
      const relPath = (file as any).webkitRelativePath || file.name;
      const sizeKB = Math.round(file.size / 1024);

      if (!dimensionMap.has(key)) {
        dimensionMap.set(key, {
          width,
          height,
          dimensionsStr: `${width} x ${height} px`,
          count: 1,
          aspectRatio: calculateAspectRatio(width, height),
          files: [{ name: file.name, relativePath: relPath, sizeKB, type }],
        });
      } else {
        const item = dimensionMap.get(key)!;
        item.count++;
        item.files.push({ name: file.name, relativePath: relPath, sizeKB, type });
      }
    } catch (err) {
      console.warn(`Error al leer dimensiones de ${file.name}:`, err);
    }
  }

  // Sort by count descending (most common sizes first), then by resolution
  const sizeCounts = Array.from(dimensionMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.width * b.height - a.width * a.height;
  });

  // Generate the formatted text as requested:
  // - .. assets en dimensión ... x ... px
  // Total: ... assets
  const lines = sizeCounts.map(
    (item) => `- ${item.count} ${item.count === 1 ? 'asset' : 'assets'} en dimensión ${item.width} x ${item.height} px`
  );

  if (sizeCounts.length > 0) {
    const totalLabel = totalAssets === 1 ? '1 asset' : `${totalAssets} assets`;
    lines.push(`Total: ${totalLabel}`);
  }

  const formattedText = lines.join('\n');

  return {
    rootFolderName: rootFolder,
    totalFiles: files.length,
    totalAssets,
    totalImages: imageCount,
    totalVideos: videoCount,
    totalUnsupported: unsupportedCount,
    uniqueSizesCount: sizeCounts.length,
    sizeCounts,
    formattedText,
  };
}
