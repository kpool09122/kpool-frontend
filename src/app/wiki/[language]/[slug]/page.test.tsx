import { describe, expect, it, vi } from "vitest";

import { createMockWikiDetail } from "@kpool/wiki";
import { PublicWikiLayout } from "../../PublicWikiLayout";
import { loadPublicWikiState } from "@/gateways/wiki/publicWiki";
import Page, { generateMetadata } from "./(detail)/page";
import CanonicalPage from "../../../[language]/wiki/[slug]/(detail)/page";
import { generateMetadata as canonicalMetadata } from "../../../[language]/wiki/[slug]/(detail)/page";

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_HTTP_ERROR_FALLBACK;404"); },
}));

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
  it("uses the existing title, full description, and profile image for sharing", async () => {
    const metaDescription = "あ".repeat(139) + "終";
    const heroImage = {
      src: "https://images.k-pool.app/images/aurora-echo.webp",
      alt: "Aurora Echo",
    };
    vi.mocked(loadPublicWikiState).mockResolvedValue({
      status: "success",
      data: {
        ...createMockWikiDetail("gr-aurora-echo"),
        title: "Aurora Echo SEO",
        metaDescription,
        heroImage,
        keywords: ["aurora", "echo"],
      },
    });

    await expect(generateMetadata(routeParams())).resolves.toEqual({
      title: "Aurora Echo SEO | k-pool",
      description: metaDescription,
      keywords: ["aurora", "echo"],
      openGraph: {
        title: "Aurora Echo SEO | k-pool",
        description: metaDescription,
        type: "website",
        siteName: "k-pool",
        url: "https://k-pool.app/ja/wiki/gr-aurora-echo",
        images: [{ url: heroImage.src, alt: heroImage.alt }],
      },
      alternates: {
        canonical: "https://k-pool.app/ja/wiki/gr-aurora-echo",
        languages: { ja: "https://k-pool.app/ja/wiki/gr-aurora-echo" },
      },
    });
  });

  it("falls back to the wiki basic name when SEO title is empty", async () => {
    vi.mocked(loadPublicWikiState).mockResolvedValue({
      status: "success",
      data: createMockWikiDetail("gr-aurora-echo"),
    });

    await expect(generateMetadata(routeParams())).resolves.toMatchObject({
      title: "Aurora Echo | k-pool",
      openGraph: {
        images: [{ url: "https://k-pool.app/kpool-og.webp", type: "image/webp" }],
      },
    });
  });

  it("returns site metadata on an API failure", async () => {
    vi.mocked(loadPublicWikiState).mockResolvedValue({
      status: "error", message: "Unavailable",
    });

    await expect(generateMetadata(routeParams())).resolves.toEqual({
      title: "k-pool",
    });
  });
});

// Both URL forms share the same framework 404 behavior.
it.each([Page, CanonicalPage])("interrupts rendering for a missing wiki", async (renderPage) => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({ status: "empty" });
  await expect(renderPage({ ...routeParams(), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
it.each([generateMetadata, canonicalMetadata])("interrupts metadata generation for a missing wiki", async (metadata) => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({ status: "empty" });
  await expect(metadata(routeParams())).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});
it.each([Page, CanonicalPage])("preserves the API failure display instead of treating it as missing", async (renderPage) => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({ status: "error", message: "Unavailable" });
  const page = await renderPage({ ...routeParams(), searchParams: Promise.resolve({}) });
  expect(page.props.wikiState).toEqual({ status: "error", message: "Unavailable" });
});
it("rejects unsupported wiki languages before requesting the API", async () => {
  vi.mocked(loadPublicWikiState).mockClear();
  const props = { params: Promise.resolve({ language: "zh", slug: "gr-aurora-echo" }), searchParams: Promise.resolve({}) };
  await expect(Page(props)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  await expect(generateMetadata(props)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  expect(loadPublicWikiState).not.toHaveBeenCalled();
});

it.each([null, "", " \n\t"])("fills a missing wiki description (%j) on both URL forms", async (metaDescription) => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({
    status: "success",
    data: { ...createMockWikiDetail("gr-aurora-echo"), metaDescription },
  });
  for (const metadata of [generateMetadata, canonicalMetadata]) {
    await expect(metadata(routeParams())).resolves.toMatchObject({
      description: "Aurora Echoの基本情報や関連情報をまとめたk-poolの公開Wikiです。",
    });
  }
});
it.each([
  ["en", "Explore basic information and related content about Aurora Echo on the k-pool public wiki."],
  ["ko", "Aurora Echo의 기본 정보와 관련 내용을 확인할 수 있는 k-pool 공개 위키입니다."],
])("uses the %s route language for the description fallback", async (language, description) => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({
    status: "success",
    data: { ...createMockWikiDetail("gr-aurora-echo"), metaDescription: null },
  });
  await expect(generateMetadata({ params: Promise.resolve({ language, slug: "gr-aurora-echo" }) })).resolves.toMatchObject({ description });
});

it("rejects missing wikis in the layout before its loading boundary", async () => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({ status: "empty" });
  await expect(PublicWikiLayout({
    ...routeParams(), children: "Wiki content",
  })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
});

it("keeps the API failure page available through the detail layout", async () => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({ status: "error", message: "Unavailable" });
  await expect(PublicWikiLayout({
    ...routeParams(), children: "Wiki content",
  })).resolves.toBe("Wiki content");
});

it.each([generateMetadata, canonicalMetadata])("advertises only the published translations with canonical URLs", async (metadata) => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({
    status: "success",
    data: { ...createMockWikiDetail("gr-aurora-echo"), availableLanguages: ["ja", "en", "en", "unsupported"] },
  });
  await expect(metadata(routeParams("gr-previous-name"))).resolves.toMatchObject({
    alternates: {
      canonical: "https://k-pool.app/ja/wiki/gr-aurora-echo",
      languages: {
        ja: "https://k-pool.app/ja/wiki/gr-aurora-echo",
        en: "https://k-pool.app/en/wiki/gr-aurora-echo",
      },
    },
  });
  const result = await metadata(routeParams());
  expect(result.alternates?.languages).not.toHaveProperty("ko");
  expect(result.alternates?.languages).not.toHaveProperty("unsupported");
});
it("advertises only itself if an older API does not provide available languages", async () => {
  vi.mocked(loadPublicWikiState).mockResolvedValue({ status: "success", data: createMockWikiDetail("gr-aurora-echo") });
  const result = await generateMetadata(routeParams());
  expect(result.alternates?.languages).toEqual({ ja: "https://k-pool.app/ja/wiki/gr-aurora-echo" });
});
