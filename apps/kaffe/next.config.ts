import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@autosites/analytics"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: "/load-content/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/load-content/:path*", destination: "https://eu.i.posthog.com/:path*" },
      { source: "/load-content/decide", destination: "https://eu.i.posthog.com/decide" },
    ];
  },
};

export default nextConfig;
