import { wikiPrivateApiTypes } from "@kpool/types";
import { isSafeMaterialSearchUrl } from "@kpool/wiki";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import type { WikiMaterialSearchContext } from "@kpool/wiki";

export const materialSearchRequestSchema =
  wikiPrivateApiTypes.schemas.SearchFreeMaterialsRequestBody.strip()
    .extend({
      relatedWikis:
        wikiPrivateApiTypes.schemas.MaterialSearchRelatedWiki.strip()
          .array()
          .max(100),
    })
    .refine((input) =>
      Boolean(input.title?.trim() || input.displayName?.trim()),
    );
const materialSiteSchema =
  wikiPrivateApiTypes.schemas.FreeMaterialSite.strip().refine(
    (site) =>
      isSafeMaterialSearchUrl(site.pageUrl) &&
      isSafeMaterialSearchUrl(site.usageEvidenceUrl),
  );
export const materialSearchResponseSchema =
  wikiPrivateApiTypes.schemas.SearchFreeMaterialsResponseBody.strip()
    .extend({ sites: materialSiteSchema.array().max(3) })
    .refine(({ sites }) => {
      const hosts = sites.map((site) =>
        new URL(site.pageUrl).hostname.toLowerCase().replace(/^www\./, ""),
      );
      const names = sites.map((site) => site.siteName.trim().toLowerCase());
      return (
        new Set(hosts).size === sites.length &&
        new Set(names).size === sites.length
      );
    });

export const searchWikiFreeMaterials = async (
  context: WikiMaterialSearchContext,
  fallbackMessage: string,
) => {
  const response = await browserApiFetch(
    "/api/wiki/images/search-free-materials",
    {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": context.language,
      },
      body: JSON.stringify(context),
    },
  );
  if (!response.ok) throw new Error(fallbackMessage);
  const result = materialSearchResponseSchema.safeParse(await response.json());
  if (!result.success) throw new Error(fallbackMessage);
  return result.data;
};
