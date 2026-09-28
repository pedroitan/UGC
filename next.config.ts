import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori"],
  outputFileTracingIncludes: {
    "/api/render/**": ["./node_modules/@fontsource/**/*.woff"],
  },
};

export default nextConfig;
