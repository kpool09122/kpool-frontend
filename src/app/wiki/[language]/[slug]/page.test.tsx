import { describe, expect, it, vi } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";
import { loadPublicWikiState } from "@/gateways/wiki/publicWiki";
import { generateMetadata } from "./page";
import { generateMetadata as canonicalMetadata } from "../../../[language]/wiki/[slug]/page";

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
  it.each(["ja", "en", "ko"])(
    "shares the canonical URL between legacy and new %s routes, using the resolved slug",
    async (language) => {
      vi.mocked(loadPublicWikiState).mockResolvedValue({
        status: "success",
        data: createMockWikiDetail("gr-aurora-echo"),
      });
      const props = {
        params: Promise.resolve({ language, slug: "gr-previous-name" }),
      };
      for (const metadata of [generateMetadata, canonicalMetadata]) {
        await expect(metadata(props)).resolves.toMatchObject({
          alternates: {
            canonical: `https://k-pool.app/${language}/wiki/gr-aurora-echo`,
          },
        });
      }
    },
  );
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
      alternates: { canonical: "https://k-pool.app/ja/wiki/gr-aurora-echo" },
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
