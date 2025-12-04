import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "path";

// Load environment variables from root directory
loadEnvConfig(path.resolve(__dirname, ".."));

const nextConfig: NextConfig = {
  // Enable experimental features for streaming
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

