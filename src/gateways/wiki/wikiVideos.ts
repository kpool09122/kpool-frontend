import { wikiPrivateApiTypes } from "@kpool/types";
import type { WikiResourceType } from "@kpool/wiki";
import { z } from "zod";

// The authoritative generated Video schema was introduced by backend #765 / frontend #501.
export const wikiVideosResponseSchema = z.object({
  videos: z.array(wikiPrivateApiTypes.schemas.Video),
});
export type WikiVideo = z.infer<typeof wikiPrivateApiTypes.schemas.Video>;
export type WikiVideoIdentity = {
  language: string;
  resourceType: WikiResourceType;
  slug: string;
};
export const wikiVideosUnavailableMessage =
  "Videos are temporarily unavailable.";

export const fetchWikiVideos = async ({
  language,
  resourceType,
  slug,
}: WikiVideoIdentity) => {
  try {
    const response = await fetch(
      `/api/wiki/${encodeURIComponent(language)}/${encodeURIComponent(slug)}/videos?resourceType=${resourceType}`,
      { credentials: "omit" },
    );
    if (!response.ok) throw new Error(wikiVideosUnavailableMessage);
    const result = wikiVideosResponseSchema.safeParse(await response.json());
    if (!result.success) throw new Error(wikiVideosUnavailableMessage);
    return result.data;
  } catch {
    throw new Error(wikiVideosUnavailableMessage);
  }
};
