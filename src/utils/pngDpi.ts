/**
 * PNG & Image DPI Extraction and Embedding Utilities
 * Reads and injects PNG 'pHYs' chunks so that high-resolution
 * DTF textile prepress files preserve their exact DPI (e.g. 300 DPI)
 * in Photoshop, Illustrator, and DTF RIP software (AcroRIP, CADlink, etc.).
 */

// CRC-32 Lookup Table for PNG
let crcTable: Uint32Array | null = null;

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

function updateCrc(crc: number, buf: Uint8Array): number {
  if (!crcTable) {
    crcTable = makeCrcTable();
  }
  let c = crc ^ 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

/**
 * Extracts DPI from an image file (PNG pHYs chunk or JPEG JFIF/EXIF).
 * Defaults to 300 DPI if uncalibrated/undefined (standard DTF printing resolution).
 */
export async function extractImageDpi(file: File | Blob): Promise<number> {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. Check for PNG signature
    if (
      bytes.length > 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    ) {
      let offset = 8;
      while (offset + 12 < bytes.length) {
        const length =
          (bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3];
        const type = String.fromCharCode(
          bytes[offset + 4],
          bytes[offset + 5],
          bytes[offset + 6],
          bytes[offset + 7]
        );

        if (type === 'pHYs' && length >= 9) {
          const dataOffset = offset + 8;
          const ppuX =
            (bytes[dataOffset] << 24) |
            (bytes[dataOffset + 1] << 16) |
            (bytes[dataOffset + 2] << 8) |
            bytes[dataOffset + 3];
          const unit = bytes[dataOffset + 8];

          if (unit === 1 && ppuX > 0) {
            // unit 1 = meters. 1 meter = 39.3701 inches.
            const dpi = Math.round(ppuX * 0.0254);
            if (dpi >= 50 && dpi <= 2400) return dpi;
          }
        }

        if (type === 'IDAT' || type === 'IEND') break;
        offset += 12 + length;
      }
    }

    // 2. Check for JPEG JFIF APP0
    if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 4 < bytes.length) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        const len = (bytes[offset + 2] << 8) | bytes[offset + 3];

        if (marker === 0xe0 && len >= 14) {
          // JFIF
          const id = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
          if (id === 'JFIF') {
            const units = bytes[offset + 11];
            const xDensity = (bytes[offset + 12] << 8) | bytes[offset + 13];
            if (units === 1 && xDensity > 0) {
              return xDensity; // already in DPI
            } else if (units === 2 && xDensity > 0) {
              return Math.round(xDensity * 2.54); // dots per cm -> dpi
            }
          }
        }
        offset += 2 + len;
      }
    }
  } catch (e) {
    console.warn('Could not parse image DPI metadata, defaulting to 300 DPI', e);
  }

  // DTF industry benchmark default
  return 300;
}

/**
 * Creates a PNG 'pHYs' chunk buffer for the specified DPI.
 */
function createPhysChunk(dpi: number): Uint8Array {
  // 1 meter = 39.3700787 inches -> pixels per meter = Math.round(dpi / 0.0254)
  const ppm = Math.round(dpi / 0.0254);

  // Chunk: 4 bytes length (9) + 4 bytes type ('pHYs') + 9 bytes data + 4 bytes CRC
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const view = new DataView(chunk.buffer);

  // Length: 9
  view.setUint32(0, 9, false);

  // Type: 'pHYs'
  chunk[4] = 0x70; // 'p'
  chunk[5] = 0x48; // 'H'
  chunk[6] = 0x59; // 'y'
  chunk[7] = 0x73; // 's'

  // Data: ppmX (4 bytes), ppmY (4 bytes), unit (1 byte = 1 meter)
  view.setUint32(8, ppm, false);
  view.setUint32(12, ppm, false);
  chunk[16] = 1; // Unit specifier: 1 = metre

  // CRC calculated on type + data (13 bytes from index 4 to 17)
  const crcBytes = chunk.subarray(4, 17);
  const crc = updateCrc(0, crcBytes);
  view.setUint32(17, crc, false);

  return chunk;
}

/**
 * Injects or updates the 'pHYs' chunk inside a PNG ArrayBuffer,
 * ensuring the resulting Blob has the specified DPI embedded.
 */
export function injectDpiIntoPng(pngBuffer: ArrayBuffer, dpi: number): Blob {
  const bytes = new Uint8Array(pngBuffer);

  // Verify PNG signature
  if (
    bytes.length < 33 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    // If not valid PNG, return as is
    return new Blob([pngBuffer], { type: 'image/png' });
  }

  const physChunk = createPhysChunk(dpi);

  // Locate existing pHYs or end of IHDR chunk
  let insertPos = 33; // Default right after IHDR: 8 (sig) + 4 (len) + 4 (IHDR) + 13 (data) + 4 (crc) = 33
  let existingPhysStart = -1;
  let existingPhysLen = 0;

  let offset = 8;
  while (offset + 12 < bytes.length) {
    const length =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7]
    );

    if (type === 'IHDR') {
      insertPos = offset + 12 + length;
    } else if (type === 'pHYs') {
      existingPhysStart = offset;
      existingPhysLen = 12 + length;
      break;
    } else if (type === 'IDAT' || type === 'IEND') {
      break;
    }

    offset += 12 + length;
  }

  let finalBytes: Uint8Array;

  if (existingPhysStart !== -1) {
    // Replace existing pHYs chunk
    const before = bytes.subarray(0, existingPhysStart);
    const after = bytes.subarray(existingPhysStart + existingPhysLen);
    finalBytes = new Uint8Array(before.length + physChunk.length + after.length);
    finalBytes.set(before, 0);
    finalBytes.set(physChunk, before.length);
    finalBytes.set(after, before.length + physChunk.length);
  } else {
    // Insert pHYs right after IHDR
    const before = bytes.subarray(0, insertPos);
    const after = bytes.subarray(insertPos);
    finalBytes = new Uint8Array(before.length + physChunk.length + after.length);
    finalBytes.set(before, 0);
    finalBytes.set(physChunk, before.length);
    finalBytes.set(after, before.length + physChunk.length);
  }

  return new Blob([finalBytes], { type: 'image/png' });
}
