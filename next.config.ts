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
        hostname: '10.2.137.17',
        port: '9000',
      },
    ],
  },
  serverExternalPackages: ["canvas", "pdfjs-dist"],
};

export default nextConfig;
