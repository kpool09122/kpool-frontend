import { wikiPrivateApiTypes } from "@kpool/types";
import type { WikiResourceType } from "@kpool/wiki";
import { z } from "zod";
import {
  wikiVideoDurationSearchParams,
  type WikiVideoDurationFilter,
} from "./wikiVideoFilters";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

export const deleteWikiVideo = async (videoLinkIdentifier: string) => {
  if (!z.string().uuid().safeParse(videoLinkIdentifier).success)
    return { ok: false, status: 422 };
  try {
    const response = await browserApiFetch(
      `/api/wiki/videos/${encodeURIComponent(videoLinkIdentifier)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
    return { ok: response.status === 204, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
};

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
  ...filter
}: WikiVideoIdentity & WikiVideoDurationFilter) => {
  try {
    const params = wikiVideoDurationSearchParams(filter);
    params.set("resourceType", resourceType);
    const response = await fetch(
      `/api/wiki/${encodeURIComponent(language)}/${encodeURIComponent(slug)}/videos?${params}`,
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
