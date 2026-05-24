import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Set up Cloudflare bindings (D1, KV, etc.) in local `next dev`
// This allows getCloudflareContext() to work with the local wrangler simulation
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
