const nullableSeoMetadataKeys = ["title", "metaDescription", "keywords"] as const;

const wikiResourceTypesWithAgency = new Set(["group", "song", "talent"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const withDefaultWikiResponseMetadata = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(withDefaultWikiResponseMetadata);
  }

  if (!isRecord(value)) {
    return value;
  }

  const nextRecord: Record<string, unknown> = { ...value };

  if (
    "wikiIdentifier" in nextRecord ||
    "publishedWikiIdentifier" in nextRecord ||
    "sections" in nextRecord
  ) {
    for (const key of nullableSeoMetadataKeys) {
      nextRecord[key] ??= null;
    }
  }

  if ("wikiIdentifier" in nextRecord && "status" in nextRecord) {
    nextRecord.rejectionReason ??= null;
  }

  if (nextRecord.heroImage === null) {
    nextRecord.heroImage = {
      imageIdentifier: null,
      src: null,
      alt: null,
    };
  } else if (isRecord(nextRecord.heroImage)) {
    nextRecord.heroImage = {
      imageIdentifier: null,
      src: null,
      alt: null,
      ...nextRecord.heroImage,
    };
  }

  if (
    isRecord(nextRecord.basic) &&
    typeof nextRecord.resourceType === "string" &&
    wikiResourceTypesWithAgency.has(nextRecord.resourceType)
  ) {
    nextRecord.basic = {
      agency: null,
      ...nextRecord.basic,
    };
  }

  if (Array.isArray(nextRecord.wikis)) {
    nextRecord.wikis = nextRecord.wikis.map(withDefaultWikiResponseMetadata);
  }

  return nextRecord;
};
