/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      /** Por defecto ~1 MB; los PDF de resumen suelen superarlo y fallan antes de llegar al código. */
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
