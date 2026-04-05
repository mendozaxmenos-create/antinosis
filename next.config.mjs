/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      /** Por defecto ~1 MB; los PDF de resumen suelen superarlo y fallan antes de llegar al código. */
      bodySizeLimit: "8mb",
    },
    /** Evita que webpack reescriba el worker de pdfjs a un chunk inexistente en Vercel. */
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
    /**
     * El import dinámico del fake worker (`pdf.worker.mjs`) no entra en el trace por defecto;
     * en Vercel falta el archivo y falla "Cannot find module ... pdf.worker.mjs".
     * Incluimos todo pdfjs-dist y el canvas nativo usado por pdfjs en Node.
     */
    outputFileTracingIncludes: {
      "**": [
        "./node_modules/pdfjs-dist/**/*",
        "./node_modules/@napi-rs/canvas/**/*",
      ],
    },
  },
};

export default nextConfig;
