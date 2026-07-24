import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to THIS app folder. Without this, the stray
  // C:\Users\adity\package-lock.json makes Next treat the whole (OneDrive-synced)
  // home directory as the root and try to watch/trace it, which hangs dev startup.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
