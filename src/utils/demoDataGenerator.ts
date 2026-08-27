import JSZip from 'jszip';
import { CountryCode } from '../types';

/**
 * Creates a synthetic in-memory canvas image as a Blob/File
 */
async function createSampleImageBlob(
  width: number,
  height: number,
  title: string,
  bgColor: string = '#ffffff',
  hasPackshot = true,
  packshotScale = 0.8
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  if (hasPackshot) {
    // Draw centered product mock box
    const pw = width * packshotScale;
    const ph = height * packshotScale;
    const px = (width - pw) / 2;
    const py = (height - ph) / 2;

    const grad = ctx.createLinearGradient(px, py, px + pw, py + ph);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#1d4ed8');

    ctx.fillStyle = grad;
    ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 16) : ctx.fillRect(px, py, pw, ph);
    ctx.fill();

    // Inner details
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(18, Math.round(width * 0.04))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, width / 2, height / 2 - 20);

    ctx.font = `${Math.max(14, Math.round(width * 0.025))}px sans-serif`;
    ctx.fillText(`${width}x${height}px • Packshot`, width / 2, height / 2 + 20);
  } else {
    // Non-packshot or lifestyle text
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.max(18, Math.round(width * 0.04))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, width / 2, height / 2);
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.9);
  });
}

/**
 * Creates a simulated mock video file
 */
function createMockVideoFile(filename: string, relPath: string): File {
  // Minimal MP4 header mock blob
  const dummyContent = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const file = new File([dummyContent], filename, { type: 'video/mp4' });
  Object.defineProperty(file, 'webkitRelativePath', {
    value: relPath,
    writable: false,
  });
  return file;
}

/**
 * Generates sample test files representing a typical campaign structure
 */
export async function generateDemoFiles(country: CountryCode): Promise<File[]> {
  const files: File[] = [];
  const rootDir = 'Campania_Verano_2026';

  if (country === 'AR') {
    // 1. Mercado Libre (14 images -> triggers max 12 error + 1 video)
    for (let i = 1; i <= 14; i++) {
      const name = `0${i}_meli_prod.jpg`;
      const relPath = `${rootDir}/Mercado Libre/${name}`;
      const blob = await createSampleImageBlob(1200, 1200, `MeLi Foto ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('video_promocional_meli.mp4', `${rootDir}/Mercado Libre/video_promocional_meli.mp4`));

    // 2. Farmacity (6 images, one heavy and packshot smaller than 750px)
    for (let i = 1; i <= 6; i++) {
      const isHeavyMain = i === 1;
      const name = isHeavyMain ? 'producto_main.jpg' : `farmacity_0${i}.jpg`;
      const relPath = `${rootDir}/Farmacity/${name}`;
      // packshot scale 0.70 of 1000px = 700px (triggers < 750px warning)
      const blob = await createSampleImageBlob(1000, 1000, `Farmacity ${name}`, '#ffffff', true, isHeavyMain ? 0.7 : 0.85);

      let finalBlob = blob;
      if (isHeavyMain) {
        // pad blob to simulate 520KB
        const extraBytes = new Uint8Array(520 * 1024);
        finalBlob = new Blob([blob, extraBytes], { type: 'image/jpeg' });
      }

      const file = new File([finalBlob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 3. FarmaOnline (5 images: sequence compliant)
    for (let i = 1; i <= 5; i++) {
      const name = `farmaonline_seq_0${i}.jpg`;
      const relPath = `${rootDir}/FarmaOnline/${name}`;
      const blob = await createSampleImageBlob(1500, 1500, `FarmaOnline Seq ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 4. Juleriaque (8 images + video)
    for (let i = 1; i <= 8; i++) {
      const name = i === 8 ? '08_producto_con_caja.jpg' : `0${i}_juleriaque_main.jpg`;
      const relPath = `${rootDir}/Juleriaque/${name}`;
      const blob = await createSampleImageBlob(1500, 1500, `Juleriaque ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('juleriaque_video.mp4', `${rootDir}/Juleriaque/juleriaque_video.mp4`));

    // 5. FarmaPlus (4 images)
    for (let i = 1; i <= 4; i++) {
      const name = `farmaplus_0${i}.jpg`;
      const relPath = `${rootDir}/FarmaPlus/${name}`;
      const blob = await createSampleImageBlob(1200, 1200, `FarmaPlus ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 6. Parfumerie (6 images)
    for (let i = 1; i <= 6; i++) {
      const name = `parfumerie_0${i}.jpg`;
      const relPath = `${rootDir}/Parfumerie/${name}`;
      const blob = await createSampleImageBlob(1200, 1200, `Parfumerie ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 7. Rouge (4 images)
    for (let i = 1; i <= 4; i++) {
      const name = `rouge_0${i}.jpg`;
      const relPath = `${rootDir}/Rouge/${name}`;
      const blob = await createSampleImageBlob(1100, 1100, `Rouge ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 8. Las Margaritas (5 images)
    for (let i = 1; i <= 5; i++) {
      const name = `las_margaritas_0${i}.jpg`;
      const relPath = `${rootDir}/Las Margaritas/${name}`;
      const blob = await createSampleImageBlob(1200, 1200, `Las Margaritas ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
  } else if (country === 'UY') {
    // FarmaShop, MiBelleza, ElTunel, Tienda Volar, San Roque, Pigalle, Soy Santander, MeLi
    for (let i = 1; i <= 6; i++) {
      const name = `farmashop_0${i}.jpg`;
      const relPath = `${rootDir}/FarmaShop/${name}`;
      const blob = await createSampleImageBlob(1000, 1000, `FarmaShop ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('farmashop_spot.mp4', `${rootDir}/FarmaShop/farmashop_spot.mp4`));

    // Tienda Volar (1200x900px 4:3)
    for (let i = 1; i <= 4; i++) {
      const name = `tienda_volar_0${i}.jpg`;
      const relPath = `${rootDir}/Tienda Volar/${name}`;
      const blob = await createSampleImageBlob(1200, 900, `Tienda Volar 4:3 ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('volar_clip.mp4', `${rootDir}/Tienda Volar/volar_clip.mp4`));

    // MiBelleza (1800x1800)
    for (let i = 1; i <= 5; i++) {
      const name = `mibelleza_0${i}.jpg`;
      const relPath = `${rootDir}/MiBelleza/${name}`;
      const blob = await createSampleImageBlob(1800, 1800, `MiBelleza ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('mibelleza_reels.mp4', `${rootDir}/MiBelleza/mibelleza_reels.mp4`));
  } else if (country === 'CL') {
    // 1. Falabella (1500x1500px, 5 images + 1 ATF vertical video)
    for (let i = 1; i <= 6; i++) {
      const name = `falabella_0${i}.jpg`;
      const relPath = `${rootDir}/Falabella/${name}`;
      const blob = await createSampleImageBlob(1500, 1500, `Falabella 1500x1500 ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('video_atf_falabella.mp4', `${rootDir}/Falabella/video_atf_falabella.mp4`));

    // 2. Salcobrand (1050x1050px, 5 images)
    for (let i = 1; i <= 5; i++) {
      const name = `salcobrand_0${i}.jpg`;
      const relPath = `${rootDir}/Salcobrand/${name}`;
      const blob = await createSampleImageBlob(1050, 1050, `Salcobrand ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 3. Mercado Libre CL (1200x1200px, 6 images + 1 video)
    for (let i = 1; i <= 6; i++) {
      const name = `meli_cl_0${i}.jpg`;
      const relPath = `${rootDir}/Mercado Libre/${name}`;
      const blob = await createSampleImageBlob(1200, 1200, `MeLi CL ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
    files.push(createMockVideoFile('video_meli.mp4', `${rootDir}/Mercado Libre/video_meli.mp4`));

    // 4. Ripley (1200x1200px, 5 images)
    for (let i = 1; i <= 5; i++) {
      const name = `ripley_0${i}.jpg`;
      const relPath = `${rootDir}/Ripley/${name}`;
      const blob = await createSampleImageBlob(1200, 1200, `Ripley ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 5. Paris.cl (2331x3150px - Ratio 3:4, 5 images)
    for (let i = 1; i <= 5; i++) {
      const name = `paris_0${i}.jpg`;
      const relPath = `${rootDir}/Paris/${name}`;
      const blob = await createSampleImageBlob(2331, 3150, `Paris 3:4 ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 6. Farmacias Ahumada (1000x1000px, 5 images)
    for (let i = 1; i <= 5; i++) {
      const name = `ahumada_0${i}.jpg`;
      const relPath = `${rootDir}/Farmacias Ahumada/${name}`;
      const blob = await createSampleImageBlob(1000, 1000, `Ahumada ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 7. Cruz Verde (1000x1000px, 5 images)
    for (let i = 1; i <= 5; i++) {
      const name = `cruz_verde_0${i}.jpg`;
      const relPath = `${rootDir}/Farmacias Cruz Verde/${name}`;
      const blob = await createSampleImageBlob(1000, 1000, `Cruz Verde ${i}`);
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }

    // 8. DBS Beauty Store (1000x1000px, 4 images)
    for (let i = 1; i <= 4; i++) {
      const name = `dbs_0${i}.jpg`;
      const relPath = `${rootDir}/DBS Beauty Store/${name}`;
      const blob = await createSampleImageBlob(1000, 1000, `DBS Beauty ${i}`, '#ffffff');
      const file = new File([blob], name, { type: 'image/jpeg' });
      Object.defineProperty(file, 'webkitRelativePath', { value: relPath, writable: false });
      files.push(file);
    }
  }

  return files;
}

/**
 * Creates demo data for the ADAPTACIONES module:
 * - A sample Brief document (mock PDF/PPT representation with handwritten PM notes)
 * - Sample adapted image files with various sizes, ratios, translated texts, and retouched elements
 */
export async function generateAdaptationDemoData(): Promise<{
  briefFile: File;
  briefText: string;
  imageFiles: File[];
}> {
  const briefText = `
BRIEF DE ADAPTACIONES - CAMPAÑA REVITALIFT L'ORÉAL PARIS
Notas del Project Manager (PM):

1. PIEZA 01 (Hero Feed):
   - Resize a 1080x1350px (Ratio 4:5).
   - Traducir claim superior: "Pure Hyaluronic Acid Serum" -> "Sérum con Ácido Hialurónico Puro".
   - Quitar el logo "US #1 Dermatologist Brand" de la esquina inferior.

2. PIEZA 02 (Stories / Reels):
   - Resize a 1080x1920px (Ratio 9:16 vertical).
   - Traducir titular: "Visibly plumps skin in 1 hour" -> "Piel visiblemente más rellena en 1 hora".
   - Mantener fondo claro y centrado.

3. PIEZA 03 (E-Retailer Square):
   - Medida: 1200x1200px (Ratio 1:1).
   - Traducir "Dermatologist Tested" -> "Testeado Dermatológicamente".
   - Eliminar el frasco secundario del fondo (dejar solo el producto individual).

4. NOTA AMBIGUA DEL PM (Para verificación de alerta):
   - "Adaptar la imagen de textura a la medida que el diseñador vea más conveniente para el banner web".
`;

  // Create mock PDF blob for the brief
  const pdfBlob = new Blob([briefText], { type: 'application/pdf' });
  const briefFile = new File([pdfBlob], 'Brief_Adaptaciones_Revitalift_PM_Notes.pdf', {
    type: 'application/pdf',
  });

  const imageFiles: File[] = [];

  // 1. Piece 1: 1080x1350px (Ratio 4:5)
  const blob1 = await createSampleImageBlob(
    1080,
    1350,
    'Sérum Ácido Hialurónico Puro\n1080x1350 (4:5) - Logo US removido',
    '#ffffff'
  );
  const file1 = new File([blob1], 'Revitalift_Feed_4x5.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file1, 'webkitRelativePath', {
    value: 'Adaptaciones/Revitalift_Feed_4x5.jpg',
    writable: false,
  });
  imageFiles.push(file1);

  // 2. Piece 2: 1080x1920px (Ratio 9:16)
  const blob2 = await createSampleImageBlob(
    1080,
    1920,
    'Piel visiblemente más rellena\n1080x1920 (9:16)',
    '#f8fafc'
  );
  const file2 = new File([blob2], 'Revitalift_Story_9x16.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file2, 'webkitRelativePath', {
    value: 'Adaptaciones/Revitalift_Story_9x16.jpg',
    writable: false,
  });
  imageFiles.push(file2);

  // 3. Piece 3: 1200x1200px (Ratio 1:1)
  const blob3 = await createSampleImageBlob(
    1200,
    1200,
    'Testeado Dermatológicamente\n1200x1200 (1:1) - Packshot único',
    '#ffffff'
  );
  const file3 = new File([blob3], 'Revitalift_Square_1200x1200.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file3, 'webkitRelativePath', {
    value: 'Adaptaciones/Revitalift_Square_1200x1200.jpg',
    writable: false,
  });
  imageFiles.push(file3);

  // 4. Piece 4: 800x600px (Textura)
  const blob4 = await createSampleImageBlob(
    800,
    600,
    'Textura Gel Hidratante\n800x600 (4:3)',
    '#f1f5f9'
  );
  const file4 = new File([blob4], 'Revitalift_Textura_Banner.jpg', { type: 'image/jpeg' });
  Object.defineProperty(file4, 'webkitRelativePath', {
    value: 'Adaptaciones/Revitalift_Textura_Banner.jpg',
    writable: false,
  });
  imageFiles.push(file4);

  return { briefFile, briefText, imageFiles };
}

/**
 * Creates and downloads a sample .zip file of the campaign folder
 */
export async function downloadDemoZip(country: CountryCode): Promise<void> {
  const files = await generateDemoFiles(country);
  const zip = new JSZip();

  for (const file of files) {
    const relPath = file.webkitRelativePath || file.name;
    const arrayBuffer = await file.arrayBuffer();
    zip.file(relPath, arrayBuffer);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `Carpeta_Ejemplo_PDP_${country}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
