import { wikiPrivateApiTypes } from "@kpool/types";
import {
  isWikiSlugCompatibleWithResourceType,
  withWikiApiPrefix,
} from "@kpool/wiki";
import { z } from "zod";

export type SitemapWiki = z.infer<
  typeof wikiPrivateApiTypes.schemas.SitemapWiki
>;

// Never return a partial enumeration as a successful sitemap.
export const loadSitemapWikis = async () => {
  const baseUrl = process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  if (!baseUrl) return { status: "error" } as const;

  const wikis: SitemapWiki[] = [];
  const cursors = new Set<string>();
  let cursor: string | null = null;
  try {
    do {
      const query = new URLSearchParams({ perPage: "1000" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(
        `${withWikiApiPrefix(baseUrl)}/sitemap/wikis?${query}`,
        {
          headers: { accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!response.ok) return { status: "error" } as const;
      const result =
        wikiPrivateApiTypes.schemas.ListSitemapWikisResponseBody.safeParse(
          await response.json(),
        );
      if (!result.success) return { status: "error" } as const;
      if (
        result.data.wikis.some(
          (wiki) =>
            !isWikiSlugCompatibleWithResourceType(wiki.slug, wiki.resourceType),
        )
      ) {
        return { status: "error" } as const;
      }
      wikis.push(...result.data.wikis);
      cursor = result.data.nextCursor;
      if (cursor !== null) {
        if (cursors.has(cursor)) return { status: "error" } as const;
        cursors.add(cursor);
      }
    } while (cursor !== null);
    return { status: "success", wikis } as const;
  } catch {
    // Do not forward backend payloads, stack traces, or internal origins.
    return { status: "error" } as const;
  }
};
