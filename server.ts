import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 files and images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Adaptations validation endpoint
  app.post("/api/adaptations/validate", async (req, res) => {
    try {
      const { briefFile, files, rootFolderName } = req.body;

      if (!briefFile || !briefFile.base64Data) {
        return res.status(400).json({ error: "Falta el archivo de brief/especificaciones (PPT, PDF, DOC o DOCX)." });
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: "Falta la lista de imágenes a auditar." });
      }

      const ai = getGenAI();

      // If no API key is set, return a structured fallback response
      if (!ai) {
        return res.json({
          fallback: true,
          message: "Modo local: no se detectó GEMINI_API_KEY. Se procesará con análisis heurístico de dimensiones y formatos.",
        });
      }

      // Prepare parts for multimodal Gemini call
      const parts: any[] = [];

      // 1. Brief document part
      if (briefFile.type === "pdf" || briefFile.name.toLowerCase().endsWith(".pdf")) {
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: briefFile.base64Data.replace(/^data:application\/pdf;base64,/, ""),
          },
        });
      }
      
      if (briefFile.text) {
        parts.push({
          text: `CONTENIDO DEL BRIEF / NOTAS DEL PM (Documento ${briefFile.name}):\n${briefFile.text}`,
        });
      } else if (briefFile.type !== "pdf" && !briefFile.name.toLowerCase().endsWith(".pdf")) {
        parts.push({
          text: `DOCUMENTO DE ESPECIFICACIONES / BRIEF: ${briefFile.name} (${briefFile.type?.toUpperCase()})`,
        });
      }

      // 2. Include any sample thumbnails if provided
      for (const f of files.slice(0, 15)) {
        if (f.sampleBase64) {
          const cleanBase64 = f.sampleBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
          const mime = f.sampleBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
          parts.push({
            inlineData: {
              mimeType: mime,
              data: cleanBase64,
            },
          });
          parts.push({
            text: `[Miniatura de imagen analizada: ${f.name} - Tamaño: ${f.width}x${f.height}px - Ratio: ${f.aspectRatio || 'Desconocido'}]`,
          });
        }
      }

      // 3. Prompt instruction
      const promptText = `
Eres un auditor experto de control de calidad para adaptaciones de diseño gráfico y e-commerce (PDPs, Rich Media, A+ Content, ATF y BTF de L'Oréal, Maybelline, Garnier, etc.).
El usuario adjuntó un archivo de especificaciones (Brief en PDF, PPT, DOC o DOCX con capturas, llamadas, flechas, cajas de texto y notas agregadas por el Project Manager / PM) y una carpeta con ${files.length} imágenes adaptadas.

PATRONES Y FORMAS HABITUALES EN LAS QUE EL PM COMUNICA EN ESTOS DOCUMENTOS DE SPECS:
1. **Llamadas Visuales / Cajas Rojas y Azules con Flechas**:
   - El PM encierra textos en inglés (ej: "NEED A QUICK ROOT RETOUCH?", "3, 2, 1 ROOTS GONE!", "24HR WEAR", "RESISTANT") y saca una flecha con el texto traducido exacto o tono local (ej: "“Retocá tus raíces entre coloraciones”", "“3, 2, 1 Adios Raices”", "“Usá Magic Retouch”", "“De raíces”", "“Lo valemos”").
   - El PM encierra elementos/packshots para solicitar reemplazo de empaque (ej: flecha a un pack apuntando "Pack 6U Argentina", "Pack Castaño Oscuro + 'Castaño Oscuro'").
   - El PM marca con cruces amarillas o círculos elementos que deben ELIMINARSE o reemplazarse (ej: logos como "Logo Sin Amoniaco", tonos sobrantes, etc.).

2. **Estructura de Bloques y Medidas (ATF, BTF, A+ Content, Packshots, Shadecards)**:
   - Medidas explícitas por sección:
     * PACKSHOTS + SWATCH / Shadecard: ej. "1600X1600, 1200X1200, 1000X1000 y 316x475".
     * A+ CONTENT: ej. "1600X1600, 1200X1200, 1000X1000 y 316x475".
     * BTF Mobile: ej. "MOBILE: 1000x768, MOBILE: 700x538, 1000x1000".
     * BTF Desktop: ej. "DESKTOP: 1920x600".
   - Instrucciones de replicación por tonos: ej. "Replicar para todos los tonos: WTP, WSH" o "Acá hay que incluir solo los siguientes 4 tonos: Smooth Espresso, Black Blur, Hazy Taupe, Mocha Contour".

3. **Disclaimers Legales y Fuentes Obligatorias**:
   - Notas al pie con flechas indicando agregar disclaimers:
     ej. "Agregar disclaimer (en blanco con mayuscula): *Fuente: Euromonitor International Limited; Beauty & Personal Care edición 2026, ventas minoristas en valor, todos los canales minoristas, datos 2025. ** Estudio con consumidores 117 sujetos".
   - Verificar si la pieza adaptada contiene el disclaimer solicitado con el formato indicado.

4. **Claims Estadísticos y Claims de Modo de Uso / Claims de Beneficios**:
   - Traducción de porcentajes (ej: "93% COINCIDEN EN QUE LAS PESTAÑAS SE VEN LEVANTADAS**", "91% COINCIDEN...").
   - Steps / Pasos de uso (ej: "1. GIRÁ UNA SOLA VEZ - Para evitar que se rompa", "2. DELINEÁ - Con la punta precisa de 1.5mm", "3. ESCULPÍ", "4. DIFUMINÁ").

METADATA DE LAS IMÁGENES CARGADAS EN LA CARPETA:
${JSON.stringify(files.map((f: any) => ({
  name: f.name,
  width: f.width,
  height: f.height,
  aspectRatio: f.aspectRatio,
  sizeKB: f.sizeKB,
  extension: f.extension,
})), null, 2)}

INSTRUCCIONES CLAVE DE VALIDACIÓN:
1. ANÁLISIS DE CLARIDAD Y AMBIGÜEDAD DE LAS NOTAS DEL PM:
   - Si alguna indicación o nota no se entiende claramente, es ambigua, contradictoria, ilegible o le faltan datos críticos (ej: no especifica el tono de un pack, la medida no coincide con el ratio, o la flecha apunta a un lugar confuso):
     GENERA UNA ALERTA DE AMBIGÜEDAD (ambiguityAlerts) detallando la nota del PM, el motivo de la duda y la sugerencia de consulta con el PM.

2. EVALUACIÓN DE LAS TAREAS DE ADAPTACIÓN:
   a) RESIZE / FORMATOS Y RATIOS:
      - Validar si las dimensiones (ancho x alto en px) y el aspect ratio coinciden con las especificaciones del brief (Packshots, Shadecards, A+, BTF Mobile, BTF Desktop).
   b) TRADUCCIONES Y CLAIMS (Claims, Pasos, Títulos):
      - Verificar si los textos en inglés marcados con llamadas/flechas fueron traducidos fielmente al español según la nota del PM.
   c) REEMPLAZO O RETOQUE DE PACKSHOTS Y TONOS:
      - Verificar si se aplicaron los tonos correctos pedidos (ej: solo los 4 tonos indicados, cambio de tono a versión local).
   d) AGREGADO DE DISCLAIMERS:
      - Verificar si se incluyó el disclaimer legal obligatorio cuando el brief lo indica expresamente.
   e) RETOQUE Y ELIMINACIÓN DE ELEMENTOS:
      - Verificar si elementos tachados o marcados para quitar (logos de amoniaco, sellos, claims viejos) fueron removidos.

3. EVALUACIÓN POR CADA ARCHIVO (items):
   - Determinar si cada archivo está 'OK' (cumple todo lo requerido), 'ERROR' (incumple medidas, traducciones, tonos, disclaimer o elementos pedidos), o 'AMBIGUOUS' (no se puede asegurar por notas confusas).
   - Detallar lista de tareas evaluadas y errores/advertencias.

Responde estrictamente en formato JSON según el esquema especificado.
`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedBriefSummary: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Resumen claro de las tareas e instrucciones principales detectadas en el PDF/PPT del PM.",
              },
              ambiguityAlerts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    pmNoteText: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    suggestedClarification: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  },
                  required: ["id", "title", "pmNoteText", "reason", "suggestedClarification", "severity"],
                },
                description: "Alertas cuando las notas agregadas por el PM no se entienden o son ambiguas.",
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fileName: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ["OK", "ERROR", "AMBIGUOUS"] },
                    tasksEvaluated: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          taskType: { type: Type.STRING, enum: ["resize", "translation", "element_removal", "general"] },
                          description: { type: Type.STRING },
                          passed: { type: Type.BOOLEAN },
                          details: { type: Type.STRING },
                        },
                        required: ["taskType", "description", "passed", "details"],
                      },
                    },
                    errors: { type: Type.ARRAY, items: { type: Type.STRING } },
                    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                    notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ["fileName", "status", "tasksEvaluated", "errors", "warnings", "notes"],
                },
              },
            },
            required: ["extractedBriefSummary", "ambiguityAlerts", "items"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      console.error("Error in /api/adaptations/validate:", err);
      return res.status(500).json({
        error: "Ocurrió un error al analizar las adaptaciones con IA.",
        details: err?.message || String(err),
      });
    }
  });

  // Standalone PM Brief / Presentation Analyzer endpoint
  app.post("/api/adaptations/analyze-brief", async (req, res) => {
    try {
      const { briefFile } = req.body;

      if (!briefFile || (!briefFile.base64Data && !briefFile.text)) {
        return res.status(400).json({ error: "Falta el archivo de brief/presentación a analizar." });
      }

      const ai = getGenAI();

      if (!ai) {
        // Fallback response if GEMINI_API_KEY is not configured
        return res.json({
          fallback: true,
          data: {
            productOrBrand: "Documento de Especificaciones (Modo Offline)",
            overview: `Se procesó el archivo "${briefFile.name}". Configure GEMINI_API_KEY para habilitar la extracción multimodal profunda de llamadas, flechas y notas de PM.`,
            totalSlidesOrSections: 1,
            clarityScore: 85,
            clarityStatus: "clear",
            clarityReasoning: "Estructura del archivo recibida y analizada localmente.",
            links: [
              {
                url: "https://opera-dam.e-loreal.com",
                title: "Repositorio Opera DAM",
                description: "Enlace estándar a assets y recursos de L'Oréal.",
                type: "dam",
              },
            ],
            actionCategories: [
              {
                category: "sizes_formats",
                categoryTitle: "Medidas y Formatos",
                instructions: [
                  "Verificar medidas para A+ Content (1000x1000, 1200x1200, 1600x1600).",
                  "Verificar versiones Mobile y Desktop según el marketplace objetivo.",
                ],
              },
              {
                category: "translations",
                categoryTitle: "Traducciones y Claims",
                instructions: [
                  "Revisar claims en inglés y asegurar traducción a tono local en español.",
                ],
              },
            ],
            slideBySlideBreakdown: [
              {
                slideNumber: 1,
                sectionTitle: "Especificaciones Generales",
                requestedChanges: ["Adaptar copies y formatos según lineamientos de marca."],
                targetDimensions: ["1000x1000 px", "1200x1200 px"],
              },
            ],
            requiredFormatsByChannel: [
              {
                channelOrSection: "Amazon / Mercado Libre",
                dimensions: "1000x1000 px / 1200x1200 px",
                aspectRatio: "1:1",
                details: "Fondo blanco / transparente según especificación",
              },
            ],
            ambiguities: [],
            plainTextReport: `=====================================================
REPORTE DE ANÁLISIS DE BRIEF / SPECS DE PM
=====================================================
Archivo: ${briefFile.name}
Fecha: ${new Date().toLocaleString()}

1. RESUMEN:
Documento procesado en modo offline.

2. ENLACES Y RECURSOS:
- Opera DAM: https://opera-dam.e-loreal.com

3. ACCIONES PRINCIPALES:
- Adaptar piezas a medidas especificadas.
- Traducir claims del inglés al español.
=====================================================`,
          },
        });
      }

      // Prepare multimodal parts for Gemini
      const parts: any[] = [];

      if (briefFile.base64Data && (briefFile.type === "pdf" || briefFile.name.toLowerCase().endsWith(".pdf"))) {
        const rawB64 = briefFile.base64Data.includes(",")
          ? briefFile.base64Data.split(",")[1]
          : briefFile.base64Data;
        parts.push({
          inlineData: {
            mimeType: "application/pdf",
            data: rawB64,
          },
        });
      }

      if (briefFile.text) {
        parts.push({
          text: `CONTENIDO EXTRAÍDO DEL DOCUMENTO / PRESENTACIÓN (${briefFile.name}):\n\n${briefFile.text}`,
        });
      } else if (briefFile.type !== "pdf" && !briefFile.name.toLowerCase().endsWith(".pdf")) {
        parts.push({
          text: `DOCUMENTO DE BRIEF: ${briefFile.name} (${briefFile.type?.toUpperCase()})`,
        });
      }

      const promptText = `
Eres un especialista senior en Gestión de Proyectos de Diseño Gráfico, Producción Digital y E-commerce (L'Oréal, Maybelline, Lancôme, Garnier, La Roche-Posay, etc.).
Tu tarea es realizar un ANÁLISIS EXHAUSTIVO, MINUCIOSO, PRECISO Y ESTRUCTURADO de la presentación/documento de especificaciones (Brief en PPTX, PPT, PDF, DOC o DOCX) provisto por el Project Manager (PM).

OBJETIVOS DEL ANÁLISIS DETALLADO:

1. EVALUAR LA CLARIDAD DEL PEDIDO DEL PM:
   - Evalúa si el pedido es 100% claro e implementable sin dudas para los diseñadores y adaptadores.
   - Asigna una puntuación de claridad (0 a 100) y clasifica ('clear' para 80-100, 'needs_clarification' para 50-79, 'ambiguous' para <50).
   - Explica el diagnóstico: ¿Faltan medidas? ¿Hay textos en otros idiomas sin traducción explícita? ¿Hay flechas o llamadas manuscritas confusas?

2. DESGLOSE DIAPOSITIVA POR DIAPOSITIVA (O SECCIÓN POR SECCIÓN):
   - Analiza CADA diapositiva, slide o página detectada en el documento.
   - Para cada slide, extrae:
     * slideNumber: número de diapositiva o identificador.
     * sectionTitle: título o temática del slide (ej: "Slide 1: Packshot Principal", "Slide 2: Beneficios / Claims", "Slide 3: Shadelist & Swatches", "Slide 4: BTF Mobile & Desktop").
     * requestedChanges: lista minuciosa de cambios pedidos por el PM (ej: "Reemplazar claim en inglés por 'Retocá tus raíces en 3 segundos'", "Recortar imagen de modelo", "Añadir logo de marca", "Eliminar sello de amoníaco").
     * originalText: texto original detectado en la maqueta o referencia.
     * translatedText: texto sugerido o solicitado en español con tono local.
     * targetDimensions: medidas solicitadas en ese slide (ej: ["1460x600 px", "600x450 px", "1000x1000 px"]).
     * links: URLs o enlaces mencionados en ese slide.
     * notes: comentarios o notas específicas del PM para ese slide.

3. EXTRACCIÓN TOTAL DE ENLACES Y RECURSOS:
   - Extrae CADA URL detectada (Opera DAM, carpetas Google Drive/SharePoint, links a archivos ZIP, Key Visuals, guidelines, etc.).
   - Clasifica su tipo: 'dam' | 'zip' | 'key_visual' | 'general' y explica qué recurso aloja.

4. MATRIZ DE FORMATOS Y MEDIDAS REQUERIDAS POR CANAL:
   - Lista todas las resoluciones solicitadas (ej. Amazon Desktop: 1460x600, Amazon Mobile: 600x450, Mercado Libre: 1200x1200 / 1000x1000, A+ Content: 1600x1600 / 500x500, Falabella: 1000x1000, BTF: 1920x600 / 700x538).

5. SHADES, SKUS Y VARIANTES:
   - Si el brief menciona tonos, colores, números de SKU o EANs, extrae cada uno y la acción correspondiente ('keep' = mantener, 'remove' = eliminar del arte, 'add' = agregar, 'replicate' = generar adaptación individual).

6. DISCLAIMERS Y LEGALES:
   - Extrae todos los textos legales obligatorios (fuente Euromonitor, asteriscos de pruebas instrumentales, letra chica).

7. IDENTIFICACIÓN DE AMBIGÜEDADES O DUDAS PARA EL PM:
   - Para cada punto dudoso, registra la nota textual del PM, la razón de la ambigüedad y redacta la pregunta exacta que el diseñador debe enviarle al PM para destrabar el trabajo.

8. REPORTE EN TEXTO PLANO PROLIJO:
   - Genera un reporte exhaustivo en texto plano con títulos claros, separadores de sección y bullets para copiar directamente a Teams/Slack/Email.

Responde estrictamente en formato JSON válido según el schema.
`;

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productOrBrand: { type: Type.STRING, description: "Marca y/o producto principal del brief" },
              overview: { type: Type.STRING, description: "Resumen ejecutivo del objetivo del pedido" },
              totalSlidesOrSections: { type: Type.INTEGER, description: "Total de diapositivas o secciones encontradas" },
              clarityScore: { type: Type.NUMBER, description: "Puntuación de claridad de 0 a 100" },
              clarityStatus: { type: Type.STRING, enum: ["clear", "needs_clarification", "ambiguous"] },
              clarityReasoning: { type: Type.STRING, description: "Diagnóstico detallado sobre la claridad del documento" },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    url: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["dam", "zip", "key_visual", "general"] },
                  },
                  required: ["url", "title", "description"],
                },
                description: "Lista de enlaces y repositorios detectados",
              },
              slideBySlideBreakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    slideNumber: { type: Type.STRING, description: "Número de slide o página" },
                    sectionTitle: { type: Type.STRING, description: "Título o descripción del slide" },
                    requestedChanges: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Lista de cambios específicos pedidos en este slide",
                    },
                    originalText: { type: Type.STRING, description: "Texto original en inglés o referencia" },
                    translatedText: { type: Type.STRING, description: "Texto traducido o adaptado solicitado" },
                    targetDimensions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Medidas requeridas para este slide",
                    },
                    links: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Enlaces presentes en este slide",
                    },
                    notes: { type: Type.STRING, description: "Notas del PM u observaciones" },
                  },
                  required: ["slideNumber", "sectionTitle", "requestedChanges"],
                },
                description: "Desglose exhaustivo slide por slide del brief",
              },
              requiredFormatsByChannel: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    channelOrSection: { type: Type.STRING, description: "Nombre del canal o sección (Amazon, Meli, A+, etc.)" },
                    dimensions: { type: Type.STRING, description: "Dimensiones en píxeles (ej: 1460x600 px)" },
                    aspectRatio: { type: Type.STRING, description: "Relación de aspecto (1:1, 16:9, etc.)" },
                    details: { type: Type.STRING, description: "Detalles adicionales de peso, formato o fondo" },
                  },
                  required: ["channelOrSection", "dimensions"],
                },
                description: "Matriz de formatos requeridos por canal",
              },
              shadesAndSkusList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nombre del tono o producto" },
                    sku: { type: Type.STRING, description: "Código SKU o EAN si existe" },
                    action: { type: Type.STRING, enum: ["keep", "remove", "add", "replicate", "info"] },
                    details: { type: Type.STRING, description: "Indicación del PM sobre este tono" },
                  },
                  required: ["name", "action"],
                },
                description: "Lista de tonos, SKUs y variantes",
              },
              legalDisclaimers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING, description: "Texto del disclaimer" },
                    stylingRequirement: { type: Type.STRING, description: "Requerimiento de fuente, color o posición" },
                    appliesTo: { type: Type.STRING, description: "A qué piezas o slides aplica" },
                  },
                  required: ["text"],
                },
                description: "Disclaimers legales y fuentes obligatorias",
              },
              actionCategories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: {
                      type: Type.STRING,
                      enum: [
                        "sizes_formats",
                        "translations",
                        "shades_skus",
                        "background_composition",
                        "removals",
                        "disclaimers",
                        "general",
                      ],
                    },
                    categoryTitle: { type: Type.STRING },
                    instructions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                  required: ["category", "categoryTitle", "instructions"],
                },
                description: "Categorías de acciones requeridas",
              },
              ambiguities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    pmNoteText: { type: Type.STRING },
                    reason: { type: Type.STRING },
                    suggestedQuestionToPM: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  },
                  required: ["id", "title", "pmNoteText", "reason", "suggestedQuestionToPM", "severity"],
                },
                description: "Lista de dudas o ambigüedades encontradas en las notas del PM",
              },
              plainTextReport: {
                type: Type.STRING,
                description: "Reporte estructurado completo en formato texto plano",
              },
            },
            required: [
              "productOrBrand",
              "overview",
              "clarityScore",
              "clarityStatus",
              "clarityReasoning",
              "links",
              "slideBySlideBreakdown",
              "actionCategories",
              "ambiguities",
              "plainTextReport",
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      return res.json({
        success: true,
        data: parsed,
      });
    } catch (err: any) {
      console.error("Error in /api/adaptations/analyze-brief:", err);
      return res.status(500).json({
        error: "Ocurrió un error al analizar la presentación del PM con IA.",
        details: err?.message || String(err),
      });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
