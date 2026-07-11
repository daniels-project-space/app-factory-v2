import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // a stray lockfile in the home dir otherwise makes Turbopack mis-root
    root: __dirname,
  },
};

export default nextConfig;
