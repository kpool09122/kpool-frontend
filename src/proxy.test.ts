import { beforeEach, describe, expect, it, vi } from "vitest";

const nextResponseState = vi.hoisted(() => ({
  options: [] as unknown[],
}));

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn((options?: unknown) => {
      nextResponseState.options.push(options);
      return { options };
    }),
  },
}));

import { proxy } from "./proxy";

const createRequest = ({
  cfCountry,
  headers = {},
}: {
  cfCountry?: string;
  headers?: Record<string, string>;
}) =>
  ({
    cf: cfCountry === undefined ? undefined : { country: cfCountry },
    headers: new Headers(headers),
  }) as never;

const getForwardedHeaders = (options: unknown): Headers => {
  const request = (options as { request: { headers: Headers } }).request;
  return request.headers;
};

describe("proxy", () => {
  beforeEach(() => {
    nextResponseState.options = [];
  });

  it("preserves an already-normalized app country header", () => {
    proxy(
      createRequest({
        headers: {
          "x-kpool-country": "kr",
          "x-vercel-ip-country": "JP",
        },
      }),
    );

    const headers = getForwardedHeaders(nextResponseState.options[0]);
    expect(headers.get("x-kpool-country")).toBe("KR");
  });

  it("normalizes Cloudflare country metadata to the app country header", () => {
    proxy(createRequest({ cfCountry: "jp" }));

    const headers = getForwardedHeaders(nextResponseState.options[0]);
    expect(headers.get("x-kpool-country")).toBe("JP");
  });

  it("normalizes Cloudflare and Vercel infrastructure headers at the entry point", () => {
    proxy(
      createRequest({
        headers: {
          "cf-ipcountry": "KR",
        },
      }),
    );
    proxy(
      createRequest({
        headers: {
          "x-vercel-ip-country": "JP",
        },
      }),
    );

    expect(getForwardedHeaders(nextResponseState.options[0]).get("x-kpool-country")).toBe(
      "KR",
    );
    expect(getForwardedHeaders(nextResponseState.options[1]).get("x-kpool-country")).toBe(
      "JP",
    );
  });

  it("does not add the app country header when no supported country code exists", () => {
    proxy(
      createRequest({
        headers: {
          "x-vercel-ip-country": "unknown",
        },
      }),
    );

    expect(nextResponseState.options[0]).toBeUndefined();
  });
});
