import type { NextConfig } from "next";
import { sharedImagePatterns, sharedRewrites } from "@autosites/site-shell/next-config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@autosites/analytics", "@autosites/cms", "@autosites/site-shell"],
  images: {
    remotePatterns: [...sharedImagePatterns],
  },
  async rewrites() {
    return [...sharedRewrites];
  },
};

export default nextConfig;
