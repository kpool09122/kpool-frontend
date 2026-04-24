export const wikiResourceTypes = ["agency", "group", "song", "talent"] as const;

export type WikiResourceType = (typeof wikiResourceTypes)[number];

export const wikiResourceTypePrefixes: Record<WikiResourceType, string> = {
  agency: "ag-",
  group: "gr-",
  song: "sg-",
  talent: "tl-",
};

const wikiResourceTypeEntries = Object.entries(
  wikiResourceTypePrefixes,
) as Array<[WikiResourceType, string]>;

export const buildWikiPath = (language: string, slug: string): string =>
  `/wiki/${encodeURIComponent(language)}/${encodeURIComponent(slug)}`;

export const buildWikiEditPath = (language: string, slug: string): string =>
  `${buildWikiPath(language, slug)}/edit`;

export const getWikiResourceTypeFromSlug = (
  slug: string,
): WikiResourceType | null =>
  wikiResourceTypeEntries.find(([, prefix]) => slug.startsWith(prefix))?.[0] ?? null;

export const hasSupportedWikiPrefix = (slug: string): boolean =>
  getWikiResourceTypeFromSlug(slug) !== null;

export const stripWikiResourcePrefix = (slug: string): string =>
  wikiResourceTypeEntries.reduce(
    (currentSlug, [, prefix]) =>
      currentSlug.startsWith(prefix) ? currentSlug.slice(prefix.length) : currentSlug,
    slug,
  );

export const normalizeWikiSlugForResourceType = (
  slug: string,
  resourceType: WikiResourceType,
): string => `${wikiResourceTypePrefixes[resourceType]}${stripWikiResourcePrefix(slug)}`;

export const isWikiSlugCompatibleWithResourceType = (
  slug: string,
  resourceType: WikiResourceType,
): boolean => getWikiResourceTypeFromSlug(slug) === resourceType;

export const getWikiResourceLabel = (resourceType: WikiResourceType): string => {
  switch (resourceType) {
    case "agency":
      return "Agency";
    case "group":
      return "Group";
    case "song":
      return "Song";
    case "talent":
      return "Talent";
  }
};
