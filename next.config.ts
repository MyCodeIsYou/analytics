import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/automation/run": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/playwright-core/browsers.json",
    ],
  },
};

export default nextConfig;
