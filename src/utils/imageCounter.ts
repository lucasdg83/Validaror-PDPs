export interface SizeCountItem {
  width: number;
  height: number;
  dimensionsStr: string;
  count: number;
  aspectRatio: string;
  files: { name: string; relativePath: string; sizeKB: number }[];
}

export interface ImageCounterResult {
  rootFolderName: string;
  totalFiles: number;
  totalImages: number;
  totalNonImages: number;
  uniqueSizesCount: number;
  sizeCounts: SizeCountItem[];
  formattedText: string;
}

export const COUNTER_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'avif'];

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

  // Filter image files
  const imageFiles: File[] = [];
  let nonImageCount = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (COUNTER_IMAGE_EXTENSIONS.includes(ext)) {
      imageFiles.push(file);
    } else {
      nonImageCount++;
    }
  }

  const dimensionMap = new Map<string, SizeCountItem>();
  const totalImages = imageFiles.length;

  for (let i = 0; i < totalImages; i++) {
    const file = imageFiles[i];
    if (onProgress) {
      onProgress(i + 1, totalImages, file.name);
    }

    try {
      const { width, height } = await getImageDimensions(file);
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
          files: [{ name: file.name, relativePath: relPath, sizeKB }],
        });
      } else {
        const item = dimensionMap.get(key)!;
        item.count++;
        item.files.push({ name: file.name, relativePath: relPath, sizeKB });
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

  // Generate the formatted text exactly as requested:
  // _ Se encontraron .... cantidad de imágenes de .... x .... px.
  const lines = sizeCounts.map(
    (item) => `_ Se encontraron ${item.count} cantidad de imágenes de ${item.width} x ${item.height} px.`
  );

  const formattedText = lines.join('\n');

  return {
    rootFolderName: rootFolder,
    totalFiles: files.length,
    totalImages: imageFiles.length,
    totalNonImages: nonImageCount,
    uniqueSizesCount: sizeCounts.length,
    sizeCounts,
    formattedText,
  };
}
