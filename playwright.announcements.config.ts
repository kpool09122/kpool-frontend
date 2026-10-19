import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const port = Number(process.env.E2E_PORT ?? 3184);
const backendPort = port + 1;
const server = Array.isArray(base.webServer)
  ? base.webServer[0]
  : base.webServer!;
export default defineConfig({
  ...base,
  testDir: "./tests",
  testMatch: ["announcements-e2e/*.spec.ts", "e2e/site-management.spec.ts"],
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: [
    {
      command: "node tests/announcements-e2e/backend.mjs",
      env: { ANNOUNCEMENT_FIXTURE_PORT: String(backendPort) },
      url: `http://127.0.0.1:${backendPort}/health`,
      reuseExistingServer: false,
    },
    {
      ...server,
      command: `node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
      env: {
        ...server.env,
        KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL: `http://127.0.0.1:${backendPort}`,
      },
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: false,
    },
  ],
});
