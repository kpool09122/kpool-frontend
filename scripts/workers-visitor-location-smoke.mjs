import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

// Local fixture only. Exercises the real OpenNext request context and Web Crypto
// in workerd without claiming Next.js routing or real Cloudflare geo lookup.
mkdirSync(".wrangler", { recursive: true });
const entry = resolve(".wrangler/visitor-context-smoke.ts");
const config = resolve(".wrangler/visitor-context-smoke.json");
const secret = "visitor-context-smoke-only-32-characters";
writeFileSync(entry, `
import { runWithCloudflareRequestContext } from "../.open-next/cloudflare/init.js";
import { getWikiVisitorLocationSigner } from "../src/app/api/wiki/visitorLocation";
export default { async fetch(request, env, ctx) {
  const scenario = new URL(request.url).searchParams.get("scenario");
  const cf = scenario === "missing" ? {} : scenario === "country" ? { country: "JP" } :
    scenario === "unknown" ? { country: "ZZ", regionCode: "NEW9" } : { country: "JP", regionCode: "01" };
  const fixture = new Request(request, { cf });
  return runWithCloudflareRequestContext(fixture, env, ctx, async () => {
    const sign = getWikiVisitorLocationSigner();
    return Response.json(await sign?.("https://backend.example/api/v1/wiki/wiki/id/submit", '{"resourceType":"group"}', { Cookie: "session=fixture" }) ?? {});
  });
} };
`);
writeFileSync(config, JSON.stringify({ name: "visitor-context-local-only", main: entry, compatibility_date: "2026-08-20", compatibility_flags: ["nodejs_compat"], vars: { WIKI_VISITOR_LOCATION_SECRET: secret } }));
const port = process.env.KPOOL_VISITOR_SMOKE_PORT ?? "8792";
const worker = spawn("pnpm", ["exec", "wrangler", "dev", "--config", config, "--port", port], {
  detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
});
let log = "";
worker.stdout.on("data", (data) => { log += data; });
worker.stderr.on("data", (data) => { log += data; });
const hash = (value) => createHash("sha256").update(value).digest("hex");
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(`http://127.0.0.1:${port}/?scenario=missing`, { signal: AbortSignal.timeout(1000) }).catch(() => null);
    if (response?.ok) { ready = true; break; }
    if (worker.exitCode !== null) break;
    await setTimeout(500);
  }
  assert.ok(ready, log);
  for (const [scenario, country, region] of [["known", "JP", "01"], ["country", "JP", ""], ["unknown", "ZZ", "NEW9"], ["missing", "", ""]]) {
    const response = await fetch(`http://127.0.0.1:${port}/?scenario=${scenario}`, { headers: { "x-kpool-visitor-country": "US", "x-kpool-visitor-region": "CA" }, signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    const headers = new Headers(await response.json());
    if (!country) { assert.deepEqual([...headers], []); continue; }
    assert.equal(headers.get("x-kpool-visitor-country"), country);
    assert.equal(headers.get("x-kpool-visitor-region"), region || null);
    const payload = ["kpool-visitor-v1", headers.get("x-kpool-visitor-timestamp"), "POST", "/api/v1/wiki/wiki/id/submit", hash('{"resourceType":"group"}'), hash(""), hash("session=fixture"), country, region].join("\n");
    assert.equal(headers.get("x-kpool-visitor-signature"), createHmac("sha256", secret).update(payload).digest("hex"));
  }
  console.log("PASS workerd visitor context: actual OpenNext ALS + Web Crypto, JP/01, ZZ/NEW9, country-only, missing geo, spoofed headers ignored, backend-compatible HMAC.");
  console.log("NOT VERIFIED: Next.js route runtime (see full smoke), real Cloudflare location, production secret and backend integration.");
} finally {
  process.kill(-worker.pid, "SIGTERM");
  rmSync(entry, { force: true });
  rmSync(config, { force: true });
}
