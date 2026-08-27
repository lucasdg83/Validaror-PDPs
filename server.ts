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
Eres un auditor experto de control de calidad para adaptaciones de diseño gráfico y e-commerce (PDPs y piezas de marketing).
El usuario adjuntó un archivo de especificaciones (Brief en PDF, PPT, DOC o DOCX con notas agregadas por el Project Manager / PM) y una carpeta con ${files.length} imágenes adaptadas.

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
   - Las aclaraciones en el documento (PDF, PPT, DOC, DOCX) pueden variar y ser textos o comentarios agregados por el PM.
   - Si alguna indicación o nota no se entiende claramente, es ambigua, contradictoria, ilegible o le faltan datos críticos (ej: pide "adaptar a medida standard" sin decir cuál, o pide "quitar esto" sin señalar qué elemento, o pide "traducir" pero el texto en inglés no está especificado):
     GENERA UNA ALERTA DE AMBIGÜEDAD (ambiguityAlerts) detallando la nota del PM, el motivo de la duda y qué se debería consultar o aclarar con el PM.

2. EVALUACIÓN DE LAS 3 TAREAS HABITUALES DE ADAPTACIÓN:
   a) RESIZE / FORMATOS Y ASPECT RATIOS:
      - Validar si las dimensiones (ancho x alto en px) y el aspect ratio (1:1, 4:5, 9:16, 16:9, etc.) coinciden con lo pedido en el documento para cada pieza.
   b) TRADUCCIONES (Inglés a Español u otro idioma pedido):
      - Verificar si los textos, claims, beneficios y titulares en inglés señalados en el brief fueron traducidos al español, o si persiste texto en inglés no traducido.
   c) RETOQUE Y ELIMINACIÓN DE ELEMENTOS:
      - Verificar si elementos solicitados para ser eliminados (logos, sellos dermatológicos, badges, packshots secundarios, claims legales) fueron removidos correctamente.

3. EVALUACIÓN POR CADA ARCHIVO (items):
   - Determinar si cada archivo está 'OK' (cumple todo), 'ERROR' (incumple medidas, traducciones o elementos pedidos), o 'AMBIGUOUS' (no se puede asegurar por notas confusas).
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
