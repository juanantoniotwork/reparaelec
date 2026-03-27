/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Los errores de TS no bloquean el build durante la migración incremental
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        // Excluye /api/admin/* — esas rutas las manejan los route handlers de Next.js
        source: '/api/:path((?!admin(?:/|$)).*)',
        destination: 'http://nginx-internal:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
