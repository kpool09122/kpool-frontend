import { wikiPrivateApiTypes } from "@kpool/types";
import { isVideoId } from "@kpool/wiki";
import { z } from "zod";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";

const schemas = wikiPrivateApiTypes.schemas;
// PHP mb_trim's default Unicode whitespace set; mb_strlen counts code points,
// unlike JS length and the generated Zod string.max (UTF-16 code units).
export const playlistName = z
  .string()
  .transform((name) =>
    name.replace(
      /^[\u0000\u0009-\u000d\u0020\u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0000\u0009-\u000d\u0020\u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/gu,
      "",
    ),
  )
  .refine((name) => [...name].length >= 1 && [...name].length <= 32);
export const playlistSummarySchema = schemas.PlaylistListItem.extend({
  name: playlistName,
}).strip();
export const playlistCreatedSchema = schemas.CreatedPlaylist.extend({
  name: playlistName,
}).strip();
// openapi-zod-client 1.18.3 drops sibling properties alongside allOf.
// Compose the two existing generated schemas rather than hand-editing output.
export const playlistDetailSchema = playlistSummarySchema.extend({
  items: z.array(schemas.PlaylistItem.strip()).max(50),
});
export const playlistListSchema = z.object({
  playlists: z.array(playlistSummarySchema).max(3),
});
export const playlistCreateSchema = schemas.CreatePlaylistRequestBody.extend({
  name: playlistName,
}).strict();
export const playlistSaveSchema = schemas.SavePlaylistRequestBody.extend({
  name: playlistName,
  items: z
    .array(
      z.union([
        z
          .object({
            provider: schemas.PlaylistItem.shape.provider,
            externalVideoId: schemas.PlaylistItem.shape.externalVideoId,
          })
          .strict().refine((item) => isVideoId(item.provider, item.externalVideoId)),
        z
          .object({
            videoLinkIdentifier:
              schemas.LikedVideoLink.shape.videoLinkIdentifier,
          })
          .strict(),
      ]),
    )
    .max(50),
}).strict();
export const likedVideoPageSchema = z.object({
  likedVideoLinkIdentifiers: z.array(z.string().uuid()),
  videos: z.array(schemas.LikedVideoLink.strip()),
  pagination: schemas.VideoLinkLikesPagination.strip(),
});
export type Playlist = z.infer<typeof playlistDetailSchema>;
export type PlaylistSummary = z.infer<typeof playlistSummarySchema>;
export type LikedVideo = z.infer<typeof schemas.LikedVideoLink>;
export type SavePlaylist = z.infer<typeof playlistSaveSchema>;
export const aggregateLikedVideos = (videos: LikedVideo[]) => {
  const seen = new Set<string>();
  return videos.flatMap((video) => {
    const key = playlistItemKey(video);
    if (!isVideoId(video.provider, video.externalVideoId) || seen.has(key)) return [];
    seen.add(key);
    return [video];
  });
};
export const playlistItemKey = (item: {
  provider: string;
  externalVideoId: string;
}) => `${item.provider}:${item.externalVideoId}`;

async function read<T>(
  path: string,
  schema: z.ZodType<T>,
  signal: AbortSignal,
) {
  const response = await browserApiFetch(path, {
    signal,
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok)
    throw Object.assign(new Error("Playlist data unavailable"), {
      status: response.status,
    });
  const result = schema.safeParse(await response.json());
  if (!result.success)
    throw Object.assign(new Error("Invalid playlist response"), {
      status: 502,
    });
  return result.data;
}
export const fetchPlaylists = (signal: AbortSignal) =>
  read("/api/wiki/playlists", playlistListSchema, signal);
export const fetchPlaylist = (id: string, signal: AbortSignal) =>
  read(
    `/api/wiki/playlists/${encodeURIComponent(id)}`,
    playlistDetailSchema,
    signal,
  );
export const fetchLikedVideoPage = (page: number, signal: AbortSignal) =>
  read(
    `/api/wiki/videos/likes?page=${page}&perPage=20`,
    likedVideoPageSchema,
    signal,
  );
export async function createPlaylist(name: string, signal?: AbortSignal) {
  try {
    const response = await browserApiFetch("/api/wiki/playlists", {
      method: "POST",
      signal,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.status !== 201)
      return { ok: false as const, status: response.status };
    const result = playlistCreatedSchema.safeParse(await response.json());
    return result.success
      ? { ok: true as const, status: 201, data: result.data }
      : { ok: false as const, status: 502 };
  } catch {
    return { ok: false as const, status: 0 };
  }
}
export async function savePlaylist(
  id: string,
  body: SavePlaylist,
  signal?: AbortSignal,
) {
  try {
    const response = await browserApiFetch(
      `/api/wiki/playlists/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        signal,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return { ok: response.status === 204, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
export async function deletePlaylist(id: string, signal?: AbortSignal) {
  try {
    const response = await browserApiFetch(
      `/api/wiki/playlists/${encodeURIComponent(id)}`,
      { method: "DELETE", signal, credentials: "include" },
    );
    return { ok: response.status === 204, status: response.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
