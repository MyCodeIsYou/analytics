import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/automation/run": ["./node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
