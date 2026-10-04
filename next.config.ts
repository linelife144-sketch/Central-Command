import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep verification builds separate from a running development server.
  distDir: process.env.CC_NEXT_DIST_DIR || '.next',
  // Allow the current Wi-Fi address for local multi-device development.
  allowedDevOrigins: ["192.168.1.72"],
  turbopack: {},
  webpack: (config, { dev }) => {
    // Prevent intermittent dev chunk corruption that causes MODULE_NOT_FOUND runtime errors.
    if (dev) {
      config.cache = false;
      // Uncached dev builds take longer to compile/serve large bundles
      // (e.g. app/layout.js). Give the browser more time before it gives
      // up and throws a ChunkLoadError timeout.
      config.output = {
        ...config.output,
        chunkLoadTimeout: 300000, // 5 minutes
      };
    }
    return config;
  },
};

export default nextConfig;
