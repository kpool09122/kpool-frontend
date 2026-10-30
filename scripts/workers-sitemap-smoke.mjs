import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import { JSDOM } from "jsdom";

// Fixture-backed workerd checks; optional live backend check is read-only and labeled separately.
const published = [
  {
    slug: "gr-A&B",
    language: "ja",
    resourceType: "group",
    lastModifiedAt: "2026-10-01T00:00:00Z",
  },
  {
    slug: "ag-agency",
    language: "en",
    resourceType: "agency",
    lastModifiedAt: null,
  },
  {
    slug: "tl-talent",
    language: "ko",
    resourceType: "talent",
    lastModifiedAt: null,
  },
  {
    slug: "sg-song",
    language: "ko",
    resourceType: "song",
    lastModifiedAt: "2026-10-02T00:00:00Z",
  },
];
const cursor = "00000000-0000-4000-8000-000000000001";
const requests = [];
let scenario = "published";
const upstream = createServer(async (request, response) => {
  const url = new URL(request.url, "http://fixture");
  if (url.pathname === "/api/v1/site-management/announcements") {
    assert.equal(request.headers.cookie, undefined);
    if (scenario === "live") {
      const result = await fetch(
        `${process.env.KPOOL_SITEMAP_SMOKE_LIVE_API_URL}${url.pathname}${url.search}`,
      );
      response.writeHead(result.status, { "Content-Type": "application/json" });
      response.end(await result.text());
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      announcements: [{
        announcement_id: "019b0000-0000-7000-8000-000000000001",
        category_name: "NEWS",
        title: "Public announcement",
        content: "Smoke fixture",
        published_date: "2026-10-01T00:00:00Z",
      }],
      current_page: 1, last_page: 1, total: 1, per_page: 20,
    }));
    return;
  }
  if (url.pathname !== "/api/v1/wiki/sitemap/wikis") {
    response.writeHead(404).end();
    return;
  }
  requests.push({
    scenario,
    cursor: url.searchParams.get("cursor"),
    cookie: request.headers.cookie,
  });
  response.setHeader("Content-Type", "application/json");
  if (scenario === "live") {
    const result = await fetch(
      `${process.env.KPOOL_SITEMAP_SMOKE_LIVE_API_URL}${url.pathname}${url.search}`,
    );
    response.statusCode = result.status;
    response.end(await result.text());
    return;
  }
  if (scenario === "failure" && url.searchParams.has("cursor")) {
    response
      .writeHead(500)
      .end(
        JSON.stringify({
          message: "private database failure",
          trace: ["secret"],
        }),
      );
    return;
  }
  const wikis = scenario === "deleted" ? [] : published;
  const page = url.searchParams.has("cursor")
    ? wikis.slice(2)
    : wikis.slice(0, 2);
  response.end(
    JSON.stringify({
      wikis: page,
      nextCursor:
        !url.searchParams.has("cursor") && wikis.length > 2 ? cursor : null,
    }),
  );
});
await new Promise((done) => upstream.listen(0, "127.0.0.1", done));
const config = JSON.parse(readFileSync("wrangler.json", "utf8"));
config.main = resolve(config.main);
config.assets.directory = resolve(config.assets.directory);
config.vars = {
  KPOOL_WIKI_PRIVATE_API_BASE_URL: `http://127.0.0.1:${upstream.address().port}`,
  KPOOL_PUBLIC_SITE_URL: "https://k-pool.app",
};
mkdirSync(".wrangler", { recursive: true });
const configPath = resolve(".wrangler/sitemap-smoke.json");
writeFileSync(configPath, JSON.stringify(config));
const port = process.env.KPOOL_SITEMAP_SMOKE_PORT ?? "8793";
const origin = `http://127.0.0.1:${port}`;
const preview = spawn(
  "pnpm",
  [
    "exec",
    "opennextjs-cloudflare",
    "preview",
    "--config",
    configPath,
    "--port",
    port,
  ],
  {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  },
);
let log = "";
preview.stdout.on("data", (data) => {
  log += data;
});
preview.stderr.on("data", (data) => {
  log += data;
});
const requestSitemap = () =>
  fetch(`${origin}/sitemap.xml`, {
    headers: { cookie: "private-session=must-not-forward" },
  });
const parseXml = (xml) => {
  const dom = new JSDOM(xml, { contentType: "text/xml" });
  const urls = [...dom.window.document.querySelectorAll("url")].map((url) => ({
    loc: url.querySelector("loc").textContent,
    lastmod: url.querySelector("lastmod")?.textContent ?? null,
  }));
  dom.window.close();
  return urls;
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    const response = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
    if (response?.status === 200) {
      ready = true;
      break;
    }
    if (preview.exitCode !== null) break;
    await setTimeout(500);
  }
  assert.ok(ready, `Worker did not start: ${log}`);
  const robots = await fetch(`${origin}/robots.txt`);
  assert.match(robots.headers.get("content-type"), /text\/plain/);
  assert.match(
    await robots.text(),
    /Sitemap: https:\/\/k-pool.app\/sitemap.xml/,
  );
  const first = await requestSitemap();
  assert.equal(first.status, 200);
  assert.equal(
    first.headers.get("content-type"),
    "application/xml; charset=utf-8",
  );
  assert.equal(
    first.headers.get("cache-control"),
    "public, max-age=300, must-revalidate",
  );
  const urls = parseXml(await first.text());
  assert.equal(urls.length, 25);
  for (const language of ["ja", "en", "ko"]) {
    assert.ok(urls.some((url) => url.loc ===
      `https://k-pool.app/${language}/announcements/019b0000-0000-7000-8000-000000000001`));
  }
  for (const path of ["/contact", "/login", "/signup"]) {
    assert.ok(urls.some((url) => url.loc === `https://k-pool.app${path}`));
  }
  assert.ok(
    urls.some((url) => url.loc === "https://k-pool.app/ja/wiki/gr-A%26B"),
  );
  assert.ok(urls.every((url) => url.loc.startsWith("https://k-pool.app/")));
  assert.deepEqual(
    requests.map((request) => request.cursor),
    [null, cursor],
  );
  assert.ok(requests.every((request) => request.cookie === undefined));
  published[0].lastModifiedAt = "2026-10-03T00:00:00Z";
  assert.ok(
    parseXml(await (await requestSitemap()).text()).some(
      (url) => url.lastmod === published[0].lastModifiedAt,
    ),
  );
  scenario = "deleted";
  assert.equal(parseXml(await (await requestSitemap()).text()).length, 21);
  scenario = "published";
  assert.equal(parseXml(await (await requestSitemap()).text()).length, 25);
  scenario = "failure";
  const failure = await requestSitemap();
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get("cache-control"), "no-store");
  assert.equal(await failure.text(), "Sitemap temporarily unavailable.");
  scenario = "published";
  assert.equal((await requestSitemap()).status, 200);
  console.log(
    "PASS workerd fixtures: unauthenticated XML/robots, all pages/types/locales, no Cookie forwarding, 300s HTTP cache, update/delete/republication without redeploy, mid-page error 503/no-store and recovery.",
  );

  if (process.env.KPOOL_SITEMAP_SMOKE_LIVE_API_URL) {
    const expected = [];
    let nextCursor = null;
    do {
      const query = new URLSearchParams({ perPage: "1000" });
      if (nextCursor) query.set("cursor", nextCursor);
      const response = await fetch(
        `${process.env.KPOOL_SITEMAP_SMOKE_LIVE_API_URL}/api/v1/wiki/sitemap/wikis?${query}`,
      );
      assert.equal(response.status, 200);
      const body = await response.json();
      expected.push(...body.wikis);
      nextCursor = body.nextCursor;
    } while (nextCursor);
    const expectedAnnouncementUrls = new Set();
    for (const language of ["ja", "en", "ko"]) {
      let page = 1;
      let lastPage = 1;
      do {
        const query = new URLSearchParams({ language, page: String(page), perPage: "20", sort: "published_date", order: "desc" });
        const response = await fetch(
          `${process.env.KPOOL_SITEMAP_SMOKE_LIVE_API_URL}/api/v1/site-management/announcements?${query}`,
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.current_page, page);
        assert.ok(body.last_page >= page);
        for (const item of body.announcements) {
          expectedAnnouncementUrls.add(`https://k-pool.app/${language}/announcements/${encodeURIComponent(item.announcement_id)}`);
        }
        lastPage = body.last_page;
        page += 1;
      } while (page <= lastPage);
    }
    scenario = "live";
    const response = await requestSitemap();
    assert.equal(response.status, 200);
    const actual = parseXml(await response.text());
    const expectedUrls = new Set(
      expected.map(
        (wiki) =>
          `https://k-pool.app/${encodeURIComponent(wiki.language)}/wiki/${encodeURIComponent(wiki.slug)}`,
      ),
    );
    assert.equal(actual.length, expectedUrls.size + expectedAnnouncementUrls.size + 18);
    for (const url of [...expectedUrls, ...expectedAnnouncementUrls])
      assert.ok(actual.some((item) => item.loc === url));
    console.log(
      `PASS read-only live backend via workerd: ${expectedUrls.size} published Wiki URLs, ${expectedAnnouncementUrls.size} announcement URLs plus 18 fixed pages; no backend mutations.`,
    );
  }
} finally {
  upstream.closeAllConnections();
  await new Promise((done) => upstream.close(done));
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    /* Already exited. */
  }
  await Promise.race([
    new Promise((done) => preview.once("exit", done)),
    setTimeout(5000),
  ]);
  rmSync(configPath, { force: true });
}
