import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

// Reuse the backend-generated endpoint schemas; do not modify generated files.
const endpoint = wikiPrivateApiTypes.wikiPrivateApi.api.find(
  (entry) => entry.alias === "VideoLinkLikeOperations_listMyVideoLinkLikes",
)!;
export const wikiVideoLikeIdsSchema = endpoint.parameters[0].schema;
export const wikiVideoLikesResponseSchema = endpoint.response;
export const wikiVideoLikeAccessSchema = z.object({
  canLike: z.boolean(),
  canUnlike: z.boolean(),
  principalIdentifier: z.string().nullable(),
});
export const fetchWikiVideoLikes = async (
  videoLinkIds: string[],
  signal: AbortSignal,
): Promise<string[]> => {
  const unique = [...new Set(videoLinkIds)];
  const liked: string[] = [];
  try {
    for (let offset = 0; offset < unique.length; offset += 100) {
      const ids = unique.slice(offset, offset + 100);
      const params = new URLSearchParams(
        ids.map((id) => ["videoLinkIds[]", id]),
      );
      const response = await browserApiFetch(
        `/api/wiki/videos/likes?${params}`,
        {
          credentials: "include",
          cache: "no-store",
          signal,
        },
      );
      if (!response.ok) throw new Error();
      const result = wikiVideoLikesResponseSchema.safeParse(
        await response.json(),
      );
      if (!result.success) throw new Error();
      liked.push(
        ...result.data.likedVideoLinkIdentifiers.filter((id) =>
          ids.includes(id),
        ),
      );
    }
    return [...new Set(liked)];
  } catch {
    throw new Error("Video likes are unavailable.");
  }
};
export const fetchWikiVideoLikeAccess = async (
  resourceType: string,
  signal: AbortSignal,
) => {
  const response = await browserApiFetch(
    `/api/wiki/videos/like-access?resourceType=${resourceType}`,
    {
      credentials: "include",
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) throw new Error("Video like permissions are unavailable.");
  const result = wikiVideoLikeAccessSchema.safeParse(await response.json());
  if (!result.success)
    throw new Error("Video like permissions are unavailable.");
  return result.data;
};
export const setWikiVideoLiked = async (
  id: string,
  liked: boolean,
  signal?: AbortSignal,
) => {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, status: 422 };
  try {
    const response = await browserApiFetch(
      `/api/wiki/videos/${encodeURIComponent(id)}/like`,
      {
        method: liked ? "POST" : "DELETE",
        signal,
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );
    return { ok: response.status === 204, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
};
