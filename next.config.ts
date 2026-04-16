import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  transpilePackages: ["@kpool/types", "@kpool/wiki"],
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
