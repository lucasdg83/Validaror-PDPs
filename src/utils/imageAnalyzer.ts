/**
 * Image and Video analysis utilities executing 100% in-browser
 */

export interface ImageAnalysisData {
  width: number;
  height: number;
  aspectRatio: string;
  dpi?: number;
  whiteBgRatio?: number;
  packshotBoundingSize?: number;
  previewUrl: string;
}

export interface VideoAnalysisData {
  duration: number;
  width: number;
  height: number;
  isVertical: boolean;
}

/**
 * Parses binary JPG headers to extract JFIF or EXIF DPI if present
 */
export async function extractDpiFromJpg(file: File): Promise<number | undefined> {
  try {
    const buffer = await file.slice(0, 64 * 1024).arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0, false) !== 0xffd8) {
      return undefined; // Not a valid JPEG
    }

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      // APP0 marker (JFIF standard)
      if (marker === 0xffe0) {
        const length = view.getUint16(offset, false);
        const jfifIdentifier = String.fromCharCode(
          view.getUint8(offset + 2),
          view.getUint8(offset + 3),
          view.getUint8(offset + 4),
          view.getUint8(offset + 5)
        );

        if (jfifIdentifier === 'JFIF') {
          const units = view.getUint8(offset + 9); // 1 = dots per inch, 2 = dots per cm
          const xDensity = view.getUint16(offset + 10, false);
          if (units === 1 && xDensity > 0) {
            return xDensity;
          } else if (units === 2 && xDensity > 0) {
            return Math.round(xDensity * 2.54);
          }
        }
        offset += length;
      } else if ((marker & 0xff00) === 0xff00 && marker !== 0xffd9) {
        // Other segment
        const length = view.getUint16(offset, false);
        offset += length;
      } else {
        break;
      }
    }
  } catch (e) {
    console.warn('Error reading DPI header:', e);
  }
  return 72; // Default web resolution
}

/**
 * Analyzes image dimensions, border background color, and centered packshot bounding box
 */
export async function analyzeImageFile(file: File): Promise<ImageAnalysisData> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const dpi = await extractDpiFromJpg(file);

      // Simplify aspect ratio
      const ratioVal = width / (height || 1);
      let aspectRatio = `${width}:${height}`;
      if (Math.abs(ratioVal - 1.0) < 0.02) {
        aspectRatio = '1:1';
      } else if (Math.abs(ratioVal - 4 / 3) < 0.02) {
        aspectRatio = '4:3';
      } else if (Math.abs(ratioVal - 16 / 9) < 0.02) {
        aspectRatio = '16:9';
      } else if (Math.abs(ratioVal - 3 / 4) < 0.02) {
        aspectRatio = '3:4';
      }

      // Analyze pixels using Canvas (scaled down for high performance)
      let whiteBgRatio = 1.0;
      let packshotBoundingSize = width;

      try {
        const sampleSize = 250;
        const canvas = document.createElement('canvas');
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
          const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
          const data = imgData.data;

          // 1. Check border white background
          let borderSamples = 0;
          let whiteBorderSamples = 0;

          // Check top, bottom, left, right border pixels (10px margin)
          for (let y = 0; y < sampleSize; y += 4) {
            for (let x = 0; x < sampleSize; x += 4) {
              const isBorder = x < 15 || x > sampleSize - 15 || y < 15 || y > sampleSize - 15;
              if (isBorder) {
                borderSamples++;
                const idx = (y * sampleSize + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                // If RGB is high (> 240) and alpha is opaque or pure transparent
                if ((r >= 238 && g >= 238 && b >= 238) || a < 20) {
                  whiteBorderSamples++;
                }
              }
            }
          }

          whiteBgRatio = borderSamples > 0 ? whiteBorderSamples / borderSamples : 1;

          // 2. Compute non-white bounding box for packshot detection
          let minX = sampleSize;
          let maxX = 0;
          let minY = sampleSize;
          let maxY = 0;

          for (let y = 0; y < sampleSize; y += 2) {
            for (let x = 0; x < sampleSize; x += 2) {
              const idx = (y * sampleSize + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              // Non-white or non-transparent pixel (product packshot)
              const isProductPixel = a > 50 && (r < 242 || g < 242 || b < 242);
              if (isProductPixel) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          if (maxX >= minX && maxY >= minY) {
            const packshotWidthRatio = (maxX - minX) / sampleSize;
            const packshotHeightRatio = (maxY - minY) / sampleSize;
            const maxDimensionRatio = Math.max(packshotWidthRatio, packshotHeightRatio);
            packshotBoundingSize = Math.round(maxDimensionRatio * Math.max(width, height));
          } else {
            packshotBoundingSize = Math.round(width * 0.85);
          }
        }
      } catch (err) {
        console.warn('Canvas pixel inspection error:', err);
      }

      resolve({
        width,
        height,
        aspectRatio,
        dpi,
        whiteBgRatio,
        packshotBoundingSize,
        previewUrl: objectUrl,
      });
    };

    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        aspectRatio: 'unknown',
        previewUrl: objectUrl,
      });
    };

    img.src = objectUrl;
  });
}

/**
 * Analyzes video file (.mp4) duration and aspect ratio
 */
export async function analyzeVideoFile(file: File): Promise<VideoAnalysisData> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      const isVertical = height > width;

      URL.revokeObjectURL(objectUrl);
      resolve({
        duration,
        width,
        height,
        isVertical,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        duration: 0,
        width: 0,
        height: 0,
        isVertical: false,
      });
    };

    video.src = objectUrl;
  });
}
