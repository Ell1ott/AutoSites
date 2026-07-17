import type { NextConfig } from "next";
import { sharedImagePatterns, sharedRewrites } from "@autosites/site-shell/next-config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@autosites/analytics", "@autosites/cms", "@autosites/site-shell"],
  images: {
    remotePatterns: [
      ...sharedImagePatterns,
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.wokogchopsticks.dk",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "www.wokogchopsticks.dk",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [...sharedRewrites];
  },
};

export default nextConfig;
