import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

// Local fixtures, NOT proof of production backend/OAuth/passkey interoperability.
const requests = [];
const upstream = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  requests.push({ url: request.url, headers: request.headers, body });
  response.setHeader("Content-Type", "application/json");
  if (request.url.includes("/wikis/")) {
    response.end(JSON.stringify({ wikis: [], current_page: 1, last_page: 1, total: 0, per_page: 10 }));
  } else if (request.url.includes("/csrf-token")) {
    response.setHeader("Set-Cookie", ["XSRF-TOKEN=fixture; Path=/; SameSite=Lax", "session=fixture; Path=/; HttpOnly"]);
    response.statusCode = 204;
    response.end();
  } else if (request.url.includes("/social/google/redirect")) {
    response.end(JSON.stringify({ redirectUrl: "https://accounts.google.com/fixture" }));
  } else if (request.url.includes("/passkeys")) {
    response.end(JSON.stringify({ passkeys: [] }));
  } else if (request.url.includes("/contact/submit")) {
    response.statusCode = 419;
    response.end(JSON.stringify({ code: "csrf_token_mismatch" }));
  } else {
    response.statusCode = 401;
    response.end(JSON.stringify({ message: "Unauthenticated" }));
  }
});
await new Promise((done) => upstream.listen(0, "127.0.0.1", done));
const upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
const config = JSON.parse(readFileSync("wrangler.json", "utf8"));
// Fixture-only wrapper: exercise OpenNext request.cf propagation in actual workerd.
// Never deploy this wrapper or confuse its synthetic geo with real Cloudflare lookup.
mkdirSync(".wrangler", { recursive: true });
const geoWorkerPath = resolve(".wrangler/visitor-smoke-worker.mjs");
writeFileSync(geoWorkerPath, `export * from ${JSON.stringify(resolve(config.main))};
import worker from ${JSON.stringify(resolve(config.main))};
export default { ...worker, fetch(request, env, ctx) {
  const url = new URL(request.url);
  const cf = url.searchParams.has("no_geo") ? {} : { country: "JP", regionCode: "01" };
  return worker.fetch(new Request(request, { cf }), env, ctx);
} };`);
config.main = geoWorkerPath;
config.assets.directory = resolve(config.assets.directory);
config.vars = Object.fromEntries([
  "KPOOL_WIKI_PRIVATE_API_BASE_URL", "KPOOL_IDENTITY_API_BASE_URL",
  "KPOOL_ACCOUNT_API_BASE_URL", "KPOOL_SITE_MANAGEMENT_API_BASE_URL",
].map((key) => [key, upstreamUrl]));
const visitorSecret = "workers-smoke-only-secret-32-characters";
config.vars.WIKI_VISITOR_LOCATION_SECRET = visitorSecret;
const configPath = resolve(".wrangler/smoke.json");
writeFileSync(configPath, JSON.stringify(config));
const port = process.env.KPOOL_WORKERS_SMOKE_PORT ?? "8791";
const origin = `http://127.0.0.1:${port}`;
const preview = spawn("pnpm", ["exec", "opennextjs-cloudflare", "preview", "--config", configPath, "--port", port], {
  detached: true, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
});
let log = "";
preview.stdout.on("data", (data) => { log += data; });
preview.stderr.on("data", (data) => { log += data; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(`${origin}/ja/terms`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
    if (response?.status === 200) { ready = true; break; }
    if (preview.exitCode !== null) break;
    await setTimeout(500);
  }
  assert.ok(ready, `Worker did not start: ${log}`);
  for (const locale of ["ja", "en", "ko"]) {
    for (const kind of ["terms", "privacy"]) {
      const response = await fetch(`${origin}/${locale}/${kind}`);
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes("legal-content"));
    }
  }
  const home = await fetch(`${origin}/ko`, { headers: { "accept-language": "ja" } });
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes('lang="ko"'), "proxy locale must override Accept-Language");
  const headers = { cookie: "session=client-fixture", "accept-language": "ja" };
  const csrf = await fetch(`${origin}/api/identity/auth/csrf-token`, { headers });
  assert.equal(csrf.status, 204);
  assert.equal(csrf.headers.get("cache-control"), "no-store");
  assert.equal(csrf.headers.getSetCookie().length, 2);
  const forwarded = requests.find((item) => item.url.includes("/csrf-token"));
  assert.equal(forwarded.url, "/api/v1/identity/auth/csrf-token");
  assert.equal(forwarded.headers.cookie, headers.cookie);
  assert.equal(forwarded.headers["accept-language"], "ja");
  const oauth = await fetch(`${origin}/api/identity/auth/social/google/redirect?return_to=//evil.example`, { headers });
  assert.equal(oauth.status, 200);
  assert.equal((await oauth.json()).redirectUrl, "https://accounts.google.com/fixture");
  assert.ok(requests.some((item) => item.url.includes("return_to=%2Fadmin")));
  const passkeys = await fetch(`${origin}/api/identity/auth/passkeys`, { headers });
  assert.equal(passkeys.status, 200);
  assert.deepEqual(await passkeys.json(), { passkeys: [] });
  const account = await fetch(`${origin}/api/account/members`, { headers });
  assert.equal(account.status, 401);
  const contact = await fetch(`${origin}/api/contact`, {
    method: "POST", headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ category: 1, name: "fixture", email: "fixture@example.org", content: "fixture" }),
  });
  assert.equal(contact.status, 419);
  assert.ok(requests.some((item) => item.url === "/api/v1/site-management/contact/submit"));
  const hash = (value) => createHash("sha256").update(value).digest("hex");
  for (const noGeo of [false, true]) {
    for (const action of ["submit", "approve", "reject", "withdraw", "publish"]) {
      const response = await fetch(`${origin}/api/wiki/drafts/fixture-id/${action}${noGeo ? "?no_geo=1" : ""}`, {
        method: "POST", headers: { ...headers, "content-type": "application/json", "x-xsrf-token": "csrf-fixture",
          "x-kpool-wiki-review-request": "1", "x-kpool-visitor-country": "US", "x-kpool-visitor-region": "CA",
          "x-kpool-visitor-signature": "forged", "x-kpool-visitor-timestamp": "1234567890" },
        body: JSON.stringify({ resourceType: "group", wikiId: "fixture-id", rejectionReason: "fixture" }),
      });
      assert.equal(response.status, 502, "fixture backend returns 401; existing route error handling remains intact");
      const forwarded = requests.filter((item) => item.url.endsWith(`/fixture-id/${action}`)).at(-1);
      assert.ok(forwarded, `${action} must reach backend`);
      assert.equal(forwarded.headers.cookie, headers.cookie);
      assert.equal(forwarded.headers["x-xsrf-token"], "csrf-fixture");
      if (noGeo) {
        for (const name of ["country", "region", "signature", "timestamp"]) assert.equal(forwarded.headers[`x-kpool-visitor-${name}`], undefined);
      } else {
        assert.equal(forwarded.headers["x-kpool-visitor-country"], "JP");
        assert.equal(forwarded.headers["x-kpool-visitor-region"], "01");
        const payload = ["kpool-visitor-v1", forwarded.headers["x-kpool-visitor-timestamp"], "POST", forwarded.url,
          hash(forwarded.body), hash(""), hash(headers.cookie), "JP", "01"].join("\n");
        assert.equal(forwarded.headers["x-kpool-visitor-signature"], createHmac("sha256", visitorSecret).update(payload).digest("hex"));
      }
    }
  }
  console.log("PASS Wiki visitor location: 5 actions x geo/missing fixtures in workerd, leading zero, spoof rejection, backend-compatible HMAC and Cookie/CSRF.");
  const wikiPath = "/api/wiki/public-wikis?language=en";
  const first = await fetch(`${origin}${wikiPath}`);
  assert.deepEqual(await first.json(), { status: "empty" });
  const count = requests.filter((item) => item.url.includes("/wikis/en")).length;
  assert.ok(count > 0);
  await fetch(`${origin}${wikiPath}`);
  assert.equal(requests.filter((item) => item.url.includes("/wikis/en")).length, count, "R2 fetch cache must avoid a second upstream request");
  for (const path of ["/api/v1/wiki/", "/api/v1/identity/", "/api/v1/account/", "/api/v1/site-management/"]) {
    assert.ok(requests.some((item) => item.url.startsWith(path)), `runtime injection failed for ${path}`);
  }
  assert.ok(requests.every((item) => item.url.startsWith("/api/v1/")), "no legacy backend request or fallback is allowed");
  const image = await fetch(`${origin}/_next/image?url=%2Fauth%2Fgoogle.png&w=32&q=75`);
  assert.equal(image.status, 200, "IMAGES binding must optimize a local image");
  assert.ok(image.headers.get("content-type").startsWith("image/"));
  assert.ok((await image.arrayBuffer()).byteLength > 0);
  const staticAsset = readFileSync(".open-next/assets/favicon.ico");
  const favicon = await fetch(`${origin}/favicon.ico`);
  assert.equal(favicon.status, 200);
  assert.equal((await favicon.arrayBuffer()).byteLength, staticAsset.byteLength);
  console.log("PASS Workers smoke: SSR/proxy, 6 legal pages, static/optimized image, 4 runtime API URLs, Cookie/Set-Cookie, CSRF 419, OAuth return_to, passkey list, R2 cache hit.");
  console.log("NOT VERIFIED: production resources, external image CDN, cache expiry/revalidation, real OAuth callback, WebAuthn ceremony and browser cookies across domains.");
} finally {
  process.kill(-preview.pid, "SIGTERM");
  upstream.close();
  rmSync(configPath, { force: true });
  rmSync(geoWorkerPath, { force: true });
}
