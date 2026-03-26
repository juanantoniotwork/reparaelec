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
        source: '/api/:path*',
        destination: 'http://reparaelec_nginx/api/:path*',
      },
    ];
  },
};

export default nextConfig;
