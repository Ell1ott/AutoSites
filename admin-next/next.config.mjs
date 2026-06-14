import path from "node:path"

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.ALT_DIST_DIR ? { distDir: process.env.ALT_DIST_DIR } : {}),
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
}

export default nextConfig
