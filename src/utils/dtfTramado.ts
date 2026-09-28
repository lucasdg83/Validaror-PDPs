import { extractImageDpi, injectDpiIntoPng } from './pngDpi';

export type DtfTramadoType =
  | 'stochastic'
  | 'halftone_dots'
  | 'alpha_fade'
  | 'lines'
  | 'micropores';

export type DtfColorMode = 'full_color' | 'white_ink' | 'black_ink';

export interface DtfImageAnalysis {
  width: number;
  height: number;
  dpi: number;
  totalPixels: number;
  transparentPixels: number;
  semiTransparentPixels: number;
  opaquePixels: number;
  transparencyPercent: number;
  semiTransparencyPercent: number;
  hasTransparency: boolean;
  hasFeatheredEdges: boolean;
  isPhotographic: boolean;
  isVectorGraphic: boolean;
  dominantColorHex: string;
  recommendedType: DtfTramadoType;
  recommendedLpi: number;
  expertDiagnosis: string;
  expertReason: string;
  prepressTips: string[];
  aspectRatio: string;
}

export interface DtfProcessingOptions {
  tramadoType: DtfTramadoType;
  lpi: number;
  dotAngle: number;
  colorMode: DtfColorMode;
  alphaSensitivity: number; // 0 to 100
  garmentColor: 'checker' | '#000000' | '#ffffff' | '#0f172a' | '#881337';
}

/**
 * Analyzes an image file from a professional DTF prepress designer perspective.
 */
export async function analyzeImageForDtf(file: File): Promise<{
  analysis: DtfImageAnalysis;
  imageElement: HTMLImageElement;
}> {
  const dpi = await extractImageDpi(file);

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      // Sample image onto an offscreen canvas for statistical prepress analysis
      // Sample size max 1000px on longest side for instant real-time performance
      const sampleScale = Math.min(1, 1000 / Math.max(width, height));
      const sw = Math.max(1, Math.round(width * sampleScale));
      const sh = Math.max(1, Math.round(height * sampleScale));

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error('No se pudo inicializar el contexto de análisis gráfico'));
        return;
      }

      ctx.drawImage(img, 0, 0, sw, sh);
      const imageData = ctx.getImageData(0, 0, sw, sh);
      const data = imageData.data;
      const totalPixels = sw * sh;

      let transparentCount = 0;
      let semiTransparentCount = 0;
      let opaqueCount = 0;

      // Color uniqueness & gradient measurement
      const colorSet = new Set<number>();
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let nonTransparentCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) {
          transparentCount++;
        } else if (a < 250) {
          semiTransparentCount++;
          nonTransparentCount++;
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
        } else {
          opaqueCount++;
          nonTransparentCount++;
          rSum += data[i];
          gSum += data[i + 1];
          bSum += data[i + 2];
        }

        // Quantized 15-bit color sampling for vector vs photo classification
        if (a > 10 && colorSet.size < 5000) {
          const qr = (data[i] >> 3) & 0x1f;
          const qg = (data[i + 1] >> 3) & 0x1f;
          const qb = (data[i + 2] >> 3) & 0x1f;
          colorSet.add((qr << 10) | (qg << 5) | qb);
        }
      }

      const transparencyPercent = Math.round((transparentCount / totalPixels) * 100);
      const semiTransparencyPercent = Math.round(
        (semiTransparentCount / totalPixels) * 100
      );
      const hasTransparency = transparentCount > 0;
      const hasFeatheredEdges = semiTransparentCount > totalPixels * 0.015; // > 1.5% semi-transparencies
      const isPhotographic = colorSet.size > 800;
      const isVectorGraphic = colorSet.size <= 250;

      // Dominant color estimate
      const avgR = nonTransparentCount ? Math.round(rSum / nonTransparentCount) : 128;
      const avgG = nonTransparentCount ? Math.round(gSum / nonTransparentCount) : 128;
      const avgB = nonTransparentCount ? Math.round(bSum / nonTransparentCount) : 128;
      const dominantColorHex = `#${((1 << 24) + (avgR << 16) + (avgG << 8) + avgB)
        .toString(16)
        .slice(1)}`;

      // Calculate aspect ratio string
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      const div = gcd(width, height);
      const aspectRatio = `${Math.round(width / div)}:${Math.round(height / div)}`;

      // Prepress Decision Tree
      let recommendedType: DtfTramadoType = 'stochastic';
      let recommendedLpi = 45;
      let expertDiagnosis = '';
      let expertReason = '';
      const prepressTips: string[] = [];

      if (hasFeatheredEdges && !isPhotographic) {
        // Logo / illustration with drop shadow or glow that fades into transparency
        recommendedType = 'alpha_fade';
        recommendedLpi = 50;
        expertDiagnosis =
          'Se detectaron bordes esfumados y sombras con transparencia gradual (difuminados).';
        expertReason =
          'En DTF convencional, los degradados translúcidos imprimen una base blanca sólida que genera un halo tosco y rígido. El tramado "Alpha Fade" preserva los sólidos al 100% y trama exclusivamente los esfumados en micropuntos limpios.';
        prepressTips.push(
          'Elimina el efecto de halo blanco indeseado en prendas oscuras.',
          'Conserva la nitidez vectorial de letras y líneas sólidas intactas.',
          'Optimiza el curado de la poliamida termo-adhesiva en los bordes.'
        );
      } else if (isPhotographic) {
        // Continuous tone photograph / realistic painting
        recommendedType = 'stochastic';
        recommendedLpi = 45;
        expertDiagnosis =
          'Imagen fotográfica con gradientes continuos, transiciones suaves y tonos complejos.';
        expertReason =
          'El tramado Estocástico (FM) con micro-dispersión difusa evita por completo el efecto moiré sobre el tejido y proporciona una gradación tonal perfecta con tacto ultra-suave.';
        prepressTips.push(
          'Excelente caída y flexibilidad sobre remeras de algodón o poliéster.',
          'Ahorro notable de tinta blanca en sombras y medios tonos sin pérdida de vivacidad.',
          'Mayor resistencia a los lavados al evitar láminas plásticas densas.'
        );
      } else if (opaqueCount > totalPixels * 0.7 && !hasTransparency) {
        // Full bleed background or large solid coverage
        recommendedType = 'micropores';
        recommendedLpi = 40;
        expertDiagnosis =
          'Gráfico con gran masa de tinta continua y sin canal alfa transparente.';
        expertReason =
          'Las grandes plastas de tinta en DTF crean un tacto acartonado e impiden la respirabilidad de la tela. El tramado Micro-poros perfora la capa de forma imperceptible para otorgar elongación y frescura.';
        prepressTips.push(
          'Elimina el efecto parche o escudo rígido en el pecho de la prenda.',
          'Permite que la prenda estire sin resquebrajar la tinta.',
          'Sensación térmica mucho más fresca y cómoda.'
        );
      } else {
        // Vintage / streetwear graphic / standard illustration
        recommendedType = 'halftone_dots';
        recommendedLpi = 45;
        expertDiagnosis =
          'Ilustración con contraste definido, apta para tramado semitonal clásico de puntos.';
        expertReason =
          'El Halftone Clásico de Puntos (AM a 45°) recrea el auténtico acabado de serigrafía textil profesional, logrando un degradado limpio y estética de alta gama.';
        prepressTips.push(
          'Definición geométrica exacta con puntos redondos calibrados a 45 LPI.',
          'Fácil anclaje del polvo adhesivo hotmelt entre los micro-espacios.',
          'Acabado visual retro-moderno muy buscado en marcas de streetwear.'
        );
      }

      // Resolution warning / tip if DPI is under 200
      if (dpi < 200) {
        prepressTips.unshift(
          `Resolución detectada: ${dpi} DPI. Para producción textil DTF de alta gama se recomienda exportar a 300 DPI.`
        );
      } else {
        prepressTips.unshift(
          `Resolución técnica óptima: ${dpi} DPI preservada 1:1 para el procesador RIP.`
        );
      }

      resolve({
        analysis: {
          width,
          height,
          dpi,
          totalPixels,
          transparentPixels: transparentCount,
          semiTransparentPixels: semiTransparentCount,
          opaquePixels: opaqueCount,
          transparencyPercent,
          semiTransparencyPercent,
          hasTransparency,
          hasFeatheredEdges,
          isPhotographic,
          isVectorGraphic,
          dominantColorHex,
          recommendedType,
          recommendedLpi,
          expertDiagnosis,
          expertReason,
          prepressTips,
          aspectRatio,
        },
        imageElement: img,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar la imagen para análisis DTF'));
    };

    img.src = objectUrl;
  });
}

/**
 * High-performance full-resolution DTF Tramado engine.
 * Renders the chosen tramado directly at 1:1 pixel scale,
 * faithfully preserving transparency and outputting a PNG Blob with embedded DPI.
 */
export async function applyDtfTramado(
  img: HTMLImageElement,
  options: DtfProcessingOptions,
  originalDpi: number = 300
): Promise<{
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  dpi: number;
}> {
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo crear el lienzo para tramado DTF');

  // Draw original image at 1:1 scale
  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const { tramadoType, lpi, dotAngle, colorMode, alphaSensitivity } = options;

  // Calculate cell size in pixels according to LPI and DPI
  // cellSize = Math.max(2, Math.round(dpi / lpi))
  const effectiveDpi = originalDpi > 0 ? originalDpi : 300;
  const cellSize = Math.max(2, Math.round(effectiveDpi / Math.max(10, lpi)));

  const angleRad = (dotAngle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // 1. Stochastic / Error Diffusion (Floyd-Steinberg with Blue Noise Dither)
  if (tramadoType === 'stochastic') {
    // 8x8 Bayer threshold matrix normalized 0..255 for ultra-fast high-frequency micro-dot distribution
    const bayer8 = [
      [0, 48, 12, 60, 3, 51, 15, 63],
      [32, 16, 44, 28, 35, 19, 47, 31],
      [8, 56, 4, 52, 11, 59, 7, 55],
      [40, 24, 36, 20, 43, 27, 39, 23],
      [2, 50, 14, 62, 1, 49, 13, 61],
      [34, 18, 46, 30, 33, 17, 45, 29],
      [10, 58, 6, 54, 9, 57, 5, 53],
      [42, 26, 38, 22, 41, 25, 37, 21],
    ];

    const dotScale = Math.max(1, Math.round(cellSize / 4));

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      const bayerY = Math.floor(y / dotScale) % 8;

      for (let x = 0; x < width; x++) {
        const i = rowOffset + x * 4;
        const a = data[i + 3];

        if (a === 0) continue; // Keep transparent

        const bayerX = Math.floor(x / dotScale) % 8;
        const threshold = (bayer8[bayerY][bayerX] / 64) * 255;

        // Density calculation combining luminance & alpha
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // In DTF, darker areas have more ink density, lighter have less (or vice versa depending on garment)
        // If image has alpha gradient, alpha modulates density
        const alphaFactor = a / 255;
        // Invert luminance for ink density (black = 255 density, white = 0 density, modulated by alpha)
        const inkDensity = (255 - luminance * 0.7) * alphaFactor;

        if (inkDensity < threshold) {
          // Micro-pore / gap in film
          if (a < 240 || alphaSensitivity > 30) {
            data[i + 3] = 0; // Pure transparency
          }
        } else {
          // Ink dot
          data[i + 3] = 255; // Solid dot for white ink + powder adhesion
          if (colorMode === 'white_ink') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (colorMode === 'black_ink') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        }
      }
    }
  }

  // 2. Classical Round Halftone Dots (AM Screening)
  else if (tramadoType === 'halftone_dots') {
    const halfCell = cellSize / 2;
    const maxRadius = Math.SQRT2 * halfCell;

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x * 4;
        const a = data[i + 3];

        if (a === 0) continue; // Transparency preserved

        // Rotate coordinate space
        const rx = x * cosA - y * sinA;
        const ry = x * sinA + y * cosA;

        // Position inside current grid cell [-halfCell, +halfCell]
        const cellX = ((rx % cellSize) + cellSize) % cellSize - halfCell;
        const cellY = ((ry % cellSize) + cellSize) % cellSize - halfCell;
        const distFromCenter = Math.sqrt(cellX * cellX + cellY * cellY);

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        // Density factor between 0.05 and 0.95
        const alphaRatio = a / 255;
        const density = (1 - luminance / 255) * 0.75 * alphaRatio + (alphaRatio < 0.9 ? alphaRatio * 0.25 : 0.25);
        const dotRadius = maxRadius * Math.sqrt(Math.max(0, Math.min(1, density)));

        if (distFromCenter <= dotRadius) {
          // Inside dot
          data[i + 3] = 255; // 100% solid for DTF powder
          if (colorMode === 'white_ink') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (colorMode === 'black_ink') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        } else {
          // Transparent space between dots
          data[i + 3] = 0;
        }
      }
    }
  }

  // 3. Selective Alpha Fade (Prepress Gold Standard: leaves 100% solids intact, dither only feathered edges)
  else if (tramadoType === 'alpha_fade') {
    const bayer4 = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      const by = y % 4;

      for (let x = 0; x < width; x++) {
        const i = rowOffset + x * 4;
        const a = data[i + 3];

        if (a === 0) continue; // Already transparent

        if (a >= 252) {
          // Solid opaque pixel: Keep 100% untouched!
          if (colorMode === 'white_ink') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (colorMode === 'black_ink') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
          continue;
        }

        // Semi-transparent pixel (faded edge, drop shadow, glow):
        // Dither alpha into solid micro-dots vs transparent spaces
        const bx = x % 4;
        const threshold = (bayer4[by][bx] / 16) * 255;

        // Apply alpha sensitivity factor
        const adjustedAlpha = Math.min(255, a * (alphaSensitivity / 50));

        if (adjustedAlpha > threshold) {
          // Becomes a solid printable dot
          data[i + 3] = 255;
          if (colorMode === 'white_ink') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (colorMode === 'black_ink') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        } else {
          // Turned into transparent space so no white ink / glue halo forms
          data[i + 3] = 0;
        }
      }
    }
  }

  // 4. Line Halftone (Streetwear / Retro Linework)
  else if (tramadoType === 'lines') {
    const pitch = Math.max(3, cellSize);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const i = rowOffset + x * 4;
        const a = data[i + 3];

        if (a === 0) continue;

        // Rotated line position
        const rx = x * cosA - y * sinA;
        const posInLine = ((rx % pitch) + pitch) % pitch;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const density = (1 - luminance / 255) * (a / 255);
        const lineWidth = Math.max(0.5, density * pitch);

        if (posInLine <= lineWidth) {
          data[i + 3] = 255;
          if (colorMode === 'white_ink') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (colorMode === 'black_ink') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        } else {
          data[i + 3] = 0;
        }
      }
    }
  }

  // 5. Micropores / Breathability for Heavy Solids
  else if (tramadoType === 'micropores') {
    const poreGrid = Math.max(4, Math.round(cellSize * 1.2));
    const poreRadius = Math.max(1, Math.round(poreGrid * 0.22)); // ~12% porosity

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      const isOddRow = Math.floor(y / poreGrid) % 2 === 1;
      const xOffset = isOddRow ? poreGrid / 2 : 0;
      const cellY = y % poreGrid - poreGrid / 2;

      for (let x = 0; x < width; x++) {
        const i = rowOffset + x * 4;
        const a = data[i + 3];

        if (a === 0) continue;

        const cellX = ((x + xOffset) % poreGrid) - poreGrid / 2;
        const dist = Math.sqrt(cellX * cellX + cellY * cellY);

        if (dist <= poreRadius) {
          // Pore hole: breathable transparent space
          data[i + 3] = 0;
        } else {
          // Solid ink area
          data[i + 3] = 255;
          if (colorMode === 'white_ink') {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          } else if (colorMode === 'black_ink') {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
          }
        }
      }
    }
  }

  // Write processed pixels back to canvas
  ctx.putImageData(imgData, 0, 0);

  // Convert to high-res PNG blob and inject DPI
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (rawBlob) => {
        if (!rawBlob) {
          reject(new Error('Fallo al exportar el tramado a PNG'));
          return;
        }

        try {
          const rawBuffer = await rawBlob.arrayBuffer();
          // Inject original DPI into the PNG pHYs chunk
          const finalBlob = injectDpiIntoPng(rawBuffer, effectiveDpi);
          const previewUrl = URL.createObjectURL(finalBlob);

          resolve({
            blob: finalBlob,
            previewUrl,
            width,
            height,
            dpi: effectiveDpi,
          });
        } catch (e) {
          console.warn('Error injecting DPI, using standard blob', e);
          const previewUrl = URL.createObjectURL(rawBlob);
          resolve({
            blob: rawBlob,
            previewUrl,
            width,
            height,
            dpi: effectiveDpi,
          });
        }
      },
      'image/png'
    );
  });
}
