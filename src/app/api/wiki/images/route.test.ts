import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "./route";

const createRequest = (url: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(url, {
    method: "GET",
    headers,
  });

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wiki images route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("logs backend failure status without exposing the backend error body", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ message: "Internal backend path /var/app" }, 503),
      ),
    );

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/images?translationSetIdentifier=55555555-5555-5555-5555-555555555555",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe(
      "Wiki images are temporarily unavailable. Please try again later.",
    );
    expect(consoleError).toHaveBeenCalledWith(
      "Wiki images backend request failed",
      { status: 503 },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("/var/app");
  });
});
