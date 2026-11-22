import type { WikiDetail } from "@kpool/wiki";

import type { PublicWikiApiClient } from "./publicWiki";

/** Resolve the ID-only parent relation using the existing, cached agency list API. */
export const withParentAgency = async <T extends Pick<WikiDetail, "basic" | "language">>(
  wiki: T,
  client: Pick<PublicWikiApiClient, "fetchWikiList"> | null,
): Promise<T> => {
  const identifier = wiki.basic.parentAgencyIdentifier;
  if (wiki.basic.resourceType !== "agency" || !identifier || wiki.basic.parentAgency || !client) {
    return wiki;
  }

  try {
    let page = 1;
    let lastPage = 1;
    do {
      const result = await client.fetchWikiList(wiki.language, {
        resourceType: "agency", perPage: 100, page, sort: "name", order: "asc",
      });
      const parent = result.wikis.find((item) => item.wikiIdentifier === identifier);
      if (parent) {
        return {
          ...wiki,
          basic: {
            ...wiki.basic,
            parentAgency: {
              wikiIdentifier: parent.wikiIdentifier,
              name: parent.name,
              normalizedName: parent.normalizedName,
              slug: parent.slug,
              language: parent.language,
            },
          },
        };
      }
      lastPage = result.last_page;
      page += 1;
    } while (page <= lastPage);
  } catch (error) {
    // Keep the saved ID editable even when the parent cannot currently be loaded.
    console.error("Failed to resolve parent agency", error);
  }

  return wiki;
};
