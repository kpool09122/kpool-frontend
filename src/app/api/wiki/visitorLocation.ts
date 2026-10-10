import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WikiHistoryHeaders } from "@/gateways/wiki/draftWiki";

const encode = (value: string) => new TextEncoder().encode(value);
const hex = (value: ArrayBuffer) =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
const hash = async (value: string) =>
  hex(await crypto.subtle.digest("SHA-256", encode(value)));

// Read only request-scoped OpenNext metadata, never incoming HTTP geo headers.
export const getWikiVisitorLocationSigner = (): WikiHistoryHeaders | undefined => {
  try {
    const { cf, env } = getCloudflareContext();
    const secret = (env as unknown as Record<string, unknown>).WIKI_VISITOR_LOCATION_SECRET;
    const country =
      typeof cf?.country === "string" && /^[A-Z]{2}$/.test(cf.country) && cf.country !== "XX"
        ? cf.country
        : "";
    const region =
      country && typeof cf?.regionCode === "string" && /^[A-Z0-9]{1,13}$/.test(cf.regionCode)
        ? cf.regionCode
        : "";
    if (!country || typeof secret !== "string" || secret.length < 32) return undefined;

    return async (url, body, headers) => {
      try {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const uri = new URL(url);
        const forwarded = new Headers(headers);
        const payload = [
          "kpool-visitor-v1", timestamp, "POST", uri.pathname + uri.search,
          await hash(body), await hash(forwarded.get("authorization") ?? ""),
          await hash(forwarded.get("cookie") ?? ""), country, region,
        ].join("\n");
        const key = await crypto.subtle.importKey(
          "raw", encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
        );
        return {
          "X-Kpool-Visitor-Country": country,
          ...(region ? { "X-Kpool-Visitor-Region": region } : {}),
          "X-Kpool-Visitor-Timestamp": timestamp,
          "X-Kpool-Visitor-Signature": hex(await crypto.subtle.sign("HMAC", key, encode(payload))),
        };
      } catch {
        // Missing geo/signing capability must not prevent an otherwise valid operation.
        return {};
      }
    };
  } catch {
    return undefined;
  }
};
