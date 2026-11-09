import { createHash, createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./passkeys/registration/route";
import { GET } from "./social/[provider]/redirect/route";

const context = vi.hoisted(() => vi.fn());
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
const secret = "registration-country-fixture-secret-32-characters";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });

it.each(["POST", "GET"])("signs registration origin for %s using trusted request metadata", async (method) => {
  vi.stubEnv("KPOOL_IDENTITY_API_BASE_URL", "https://identity.example.test");
  context.mockReturnValue({ cf: { country: "JP" }, env: { WIKI_VISITOR_LOCATION_SECRET: secret } });
  const fetch = vi.fn().mockResolvedValue(Response.json({}, { status: 401 }));
  vi.stubGlobal("fetch", fetch);
  const request = new NextRequest("https://frontend.example.test/registration", {
    method, headers: { cookie: "session=alice", "content-type": "application/json", "cf-ipcountry": "US", "x-kpool-visitor-country": "US" },
    ...(method === "POST" ? { body: JSON.stringify({
      challengeKey: "22222222-2222-4222-8222-222222222222", identityName: "Member", displayName: "MacBook", base64EncodedImage: null,
      credential: { id: "credential-id", rawId: "AQID", type: "public-key", response: { clientDataJSON: "AQID", attestationObject: "AQID" }, clientExtensionResults: {} },
    }) } : {}),
  });
  if (method === "POST") await POST(request);
  else await GET(request, { params: Promise.resolve({ provider: "google" }) });
  expect(fetch).toHaveBeenCalledOnce();
  const [url, init] = fetch.mock.calls[0];
  const headers = new Headers(init.headers);
  expect(headers.get("x-kpool-visitor-country")).toBe("JP");
  expect(headers.get("cf-ipcountry")).toBeNull();
  const uri = new URL(url);
  const payload = ["kpool-visitor-v1", headers.get("x-kpool-visitor-timestamp"), method, uri.pathname + uri.search,
    hash(init.body ?? ""), hash(""), hash("session=alice"), "JP", ""].join("\n");
  expect(headers.get("x-kpool-visitor-signature")).toBe(createHmac("sha256", secret).update(payload).digest("hex"));
});
