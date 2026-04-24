export const sharedImagePatterns = [
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
  { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
] as const;

export const sharedRewrites = [
  { source: "/load-content/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
  { source: "/load-content/:path*", destination: "https://eu.i.posthog.com/:path*" },
  { source: "/load-content/decide", destination: "https://eu.i.posthog.com/decide" },
] as const;
