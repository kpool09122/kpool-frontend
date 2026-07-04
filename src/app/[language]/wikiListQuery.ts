import { wikiResourceTypes, type WikiResourceType } from "@kpool/wiki";

export const firstQueryValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export const toResourceType = (
  value: string | string[] | undefined,
): WikiResourceType | undefined => {
  const resourceType = firstQueryValue(value);

  return wikiResourceTypes.find((item) => item === resourceType);
};
