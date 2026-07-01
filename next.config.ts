import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { dev }) => {
    // Prevent intermittent dev chunk corruption that causes MODULE_NOT_FOUND runtime errors.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
