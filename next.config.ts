import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/weekly-planner',
        destination: '/',
        permanent: true,
      },
      {
        source: '/daily-control',
        destination: '/',
        permanent: true,
      },
      {
        source: '/competency-dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
