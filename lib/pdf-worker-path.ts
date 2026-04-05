import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Ruta absoluta file:// al worker legacy de pdfjs (alineado con `pdf-parse` → `pdfjs-dist/legacy/build/pdf.mjs`).
 * Sin esto, en el bundle de Next el import dinámico apunta a `.next/server/chunks/pdf.worker.mjs` y falla en Vercel.
 * No usar `require.resolve(...pdf.worker.mjs)` aquí: el analizador de Webpack intenta empaquetar ese ESM y rompe el build.
 */
export function getPdfjsLegacyWorkerSrc(): string {
  const resolved = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );
  return pathToFileURL(resolved).href;
}
