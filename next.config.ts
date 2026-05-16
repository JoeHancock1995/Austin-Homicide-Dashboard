import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoName = "Austin-Homicide-Dashboard";
const basePath = isProd ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: isProd ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
