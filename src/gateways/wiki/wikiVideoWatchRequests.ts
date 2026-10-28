import { wikiPrivateApiTypes } from "@kpool/types";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

const endpoint = wikiPrivateApiTypes.wikiPrivateApi.api.find(
  (entry) =>
    entry.alias === "VideoWatchRequestOperations_listMyVideoWatchRequests",
)!;
export const watchRequestIdsSchema = endpoint.parameters[0].schema.and(
  z.array(z.string().uuid()),
);
// Strip unknown upstream fields at the private BFF boundary.
export const watchRequestStatusSchema =
  wikiPrivateApiTypes.schemas.VideoWatchRequestStatus.strip();
export const watchRequestsSchema = z.object({
  videoWatchRequests: z.array(watchRequestStatusSchema),
});
export type VideoWatchRequestStatus = z.infer<typeof watchRequestStatusSchema>;
export const fetchWikiVideoWatchRequests = async (
  ids: string[],
  signal: AbortSignal,
) => {
  const unique = [...new Set(ids)];
  const statuses: VideoWatchRequestStatus[] = [];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const params = new URLSearchParams(
      batch.map((id) => ["videoLinkIds[]", id]),
    );
    const response = await browserApiFetch(
      `/api/wiki/videos/watch-requests?${params}`,
      {
        credentials: "include",
        cache: "no-store",
        signal,
      },
    );
    if (!response.ok)
      throw new Error(`Watch request state unavailable (${response.status}).`);
    const result = watchRequestsSchema.safeParse(await response.json());
    if (
      !result.success ||
      batch.some(
        (id) =>
          !result.data.videoWatchRequests.some(
            (item) => item.videoLinkIdentifier === id,
          ),
      )
    )
      throw new Error("Incomplete watch request state.");
    statuses.push(
      ...result.data.videoWatchRequests.filter((item) =>
        batch.includes(item.videoLinkIdentifier),
      ),
    );
  }
  return statuses;
};
export const sendWikiVideoWatchRequest = async (
  id: string,
  signal?: AbortSignal,
) => {
  if (!z.string().uuid().safeParse(id).success)
    return { ok: false, status: 422 };
  try {
    const response = await browserApiFetch(
      `/api/wiki/videos/${encodeURIComponent(id)}/watch-requests`,
      {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      },
    );
    if (response.status === 204) return { ok: true, status: 204 };
    return { ok: false, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
};
