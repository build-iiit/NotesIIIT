import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '10.2.137.17',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '10.231.114.51',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '10.130.183.165',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '172.22.49.165',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ["canvas", "pdfjs-dist"],
};

export default nextConfig;
