import { describe, expect, it, vi } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";
import { loadPublicWikiState } from "@/gateways/wiki/publicWiki";
import { generateMetadata } from "./page";

vi.mock("@/gateways/wiki/publicWiki", () => ({
  loadPublicWikiState: vi.fn(),
}));

const routeParams = (slug = "gr-aurora-echo") => ({
  params: Promise.resolve({
    language: "ja",
    slug,
  }),
});

describe("wiki localized page metadata", () => {
  it("uses SEO title, description, and keywords when present", async () => {
    vi.mocked(loadPublicWikiState).mockResolvedValue({
      status: "success",
      data: {
        ...createMockWikiDetail("gr-aurora-echo"),
        title: "Aurora Echo SEO",
        metaDescription: "Aurora Echo meta description.",
        keywords: ["aurora", "echo"],
      },
    });

    await expect(generateMetadata(routeParams())).resolves.toEqual({
      title: "Aurora Echo SEO | k-pool",
      description: "Aurora Echo meta description.",
      keywords: ["aurora", "echo"],
    });
  });

  it("falls back to the wiki basic name when SEO title is empty", async () => {
    vi.mocked(loadPublicWikiState).mockResolvedValue({
      status: "success",
      data: createMockWikiDetail("gr-aurora-echo"),
    });

    await expect(generateMetadata(routeParams())).resolves.toMatchObject({
      title: "Aurora Echo | k-pool",
    });
  });

  it("returns site metadata when the wiki is unavailable", async () => {
    vi.mocked(loadPublicWikiState).mockResolvedValue({
      status: "empty",
    });

    await expect(generateMetadata(routeParams())).resolves.toEqual({
      title: "k-pool",
    });
  });
});
