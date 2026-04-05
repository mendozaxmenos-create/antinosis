/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      /** Por defecto ~1 MB; los PDF de resumen suelen superarlo y fallan antes de llegar al código. */
      bodySizeLimit: "8mb",
    },
    /** Evita que webpack reescriba el worker de pdfjs a un chunk inexistente en Vercel. */
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  },
};

export default nextConfig;
