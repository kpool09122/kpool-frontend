import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { validateDeploymentConfig } from "./workers-deployment-config.mjs";

// No build or implicit resource creation: publish the already validated artifact.
const configPath = process.env.KPOOL_WORKERS_DEPLOY_CONFIG;
if (!configPath || resolve(configPath) === resolve("wrangler.json")) {
  console.error("Set KPOOL_WORKERS_DEPLOY_CONFIG to an approved deployment JSON; wrangler.json is local-only.");
  process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, "utf8"));
const errors = validateDeploymentConfig(config);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
const result = spawnSync("pnpm", ["exec", "opennextjs-cloudflare", "deploy", "--config", configPath], { stdio: "inherit" });
process.exit(result.status ?? 1);
