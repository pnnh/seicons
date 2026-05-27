import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// 只在明确需要 Cloudflare 模拟时才初始化
if (process.env.ENABLE_CLOUDFLARE_BINDINGS === 'true' && process.env.NODE_ENV === 'production') {
 
  // Set up Cloudflare bindings (D1, KV, etc.) in local `next dev`
  // This allows getCloudflareContext() to work with the local wrangler simulation
  initOpenNextCloudflareForDev();

  console.log('[next.config] Cloudflare dev bindings enabled');
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["sql.js"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;