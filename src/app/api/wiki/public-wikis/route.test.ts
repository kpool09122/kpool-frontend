import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { loadPublicWikiListState } from "@/gateways/wiki/publicWiki";
import { GET } from "./route";

vi.mock("@/gateways/wiki/publicWiki", async () => {
  const actual = await vi.importActual<typeof import("@/gateways/wiki/publicWiki")>(
    "@/gateways/wiki/publicWiki",
  );

  return {
    ...actual,
    loadPublicWikiListState: vi.fn(),
  };
});

const createRequest = (url: string): NextRequest => new NextRequest(url, { method: "GET" });

describe("public wiki list browser route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("loads one public wiki list with the requested query", async () => {
    vi.mocked(loadPublicWikiListState).mockResolvedValue({
      data: {
        currentPage: 1,
        lastPage: 1,
        perPage: 10,
        total: 0,
        wikis: [],
      },
      status: "success",
    });

    const response = await GET(
      createRequest(
        "https://app.example.test/api/wiki/public-wikis?language=ko&resourceType=group&sort=updatedAt&order=desc&perPage=10&page=1",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("success");
    expect(loadPublicWikiListState).toHaveBeenCalledWith("ko", {
      order: "desc",
      page: 1,
      perPage: 10,
      resourceType: "group",
      sort: "updatedAt",
    });
  });

  it("rejects unsupported languages before loading the list", async () => {
    const response = await GET(createRequest("https://app.example.test/api/wiki/public-wikis?language=fr"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("language is required.");
    expect(loadPublicWikiListState).not.toHaveBeenCalled();
  });
});
