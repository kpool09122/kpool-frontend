import type { z } from "zod";
import { wikiPrivateApiTypes } from "@kpool/types";
import type { WikiDraftDetail, WikiResourceType } from "./types/wiki";

export type WikiMaterialSearchContext = z.infer<
  typeof wikiPrivateApiTypes.schemas.SearchFreeMaterialsRequestBody
>;
export type WikiMaterialSearchSite = z.infer<
  typeof wikiPrivateApiTypes.schemas.FreeMaterialSite
>;

/** IDs in the edited model are authoritative; never reintroduce removed relations. */
export const buildWikiMaterialSearchContext = (
  draft: WikiDraftDetail,
  language: WikiMaterialSearchContext["language"],
): WikiMaterialSearchContext => {
  const basic = draft.basic;
  const relations = (
    resourceType: WikiResourceType,
    relationType: string,
    ids: string[],
    summaries: { wikiIdentifier: string; name: string }[],
  ) =>
    ids.map((identifier) => ({
      identifier,
      title:
        summaries
          .find((item) => item.wikiIdentifier === identifier)
          ?.name.trim() ?? "",
      resourceType,
      relationType,
    }));
  const agencyId =
    basic.agencyIdentifier !== undefined
      ? basic.agencyIdentifier
      : basic.agency?.wikiIdentifier;
  const agency =
    basic.agency ??
    (agencyId && basic.agencyName
      ? { wikiIdentifier: agencyId, name: basic.agencyName }
      : null);
  return {
    title: draft.title?.trim() || basic.name.trim(),
    displayName: basic.name.trim(),
    resourceType: draft.resourceType,
    language,
    relatedWikis: [
      ...relations(
        "agency",
        "agency",
        agencyId ? [agencyId] : [],
        agency ? [agency] : [],
      ),
      ...relations(
        "group",
        "groups",
        basic.groupIdentifiers ??
          basic.groups?.map((item) => item.wikiIdentifier) ??
          [],
        basic.groups ?? [],
      ),
      ...relations(
        "talent",
        "talents",
        basic.talentIdentifiers ??
          basic.talents?.map((item) => item.wikiIdentifier) ??
          [],
        basic.talents ?? [],
      ),
    ],
  };
};

/** A link is a citation, not an image to fetch. Never render active/credentialed URLs. */
export const isSafeMaterialSearchUrl = (value: string): boolean => {
  if (!/^https:\/\//i.test(value)) return false;
  const url = URL.canParse(value) ? new URL(value) : null;
  return Boolean(
    url && url.protocol === "https:" && !url.username && !url.password,
  );
};
