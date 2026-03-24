/** @type {import('next').NextConfig} */
const nextConfig = {
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
