import { z } from "zod";
import { wikiPrivateApiTypes } from "@kpool/types";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import { wikiVideosResponseSchema } from "./wikiVideos";

export const officialVideoWikiSchema =
  wikiPrivateApiTypes.schemas.ListMyOwnedWikisResponseBody.shape.primaryOwnedWikis.element
    .pick({
      wikiIdentifier: true,
      name: true,
      language: true,
      slug: true,
      resourceType: true,
    })
    .extend({
      resourceType: z.literal("talent"),
      language: z.enum(["ja", "en", "ko"]),
    })
    .strip();
export const officialVideoWikisSchema = z.object({
  wikis: z.array(officialVideoWikiSchema),
});
export type OfficialVideoWiki = z.infer<typeof officialVideoWikiSchema>;
export const officialVideoInboxPath = (wikiIdentifier?: string) =>
  `/admin/wiki/watch-requests${wikiIdentifier ? `/${encodeURIComponent(wikiIdentifier)}` : ""}`;

const readInbox = async <T>(
  schema: z.ZodType<T>,
  wikiIdentifier?: string,
  signal?: AbortSignal,
) => {
  const query = wikiIdentifier
    ? `?wikiIdentifier=${encodeURIComponent(wikiIdentifier)}`
    : "";
  const response = await browserApiFetch(
    `/api/wiki/my/watch-request-videos${query}`,
    {
      credentials: "include",
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) throw { status: response.status };
  const result = schema.safeParse(await response.json());
  if (!result.success) throw { status: 502 };
  return result.data;
};
export const fetchOfficialVideoWikis = (signal?: AbortSignal) =>
  readInbox(officialVideoWikisSchema, undefined, signal);
export const fetchOfficialRequestVideos = (
  wikiIdentifier: string,
  signal?: AbortSignal,
) => readInbox(wikiVideosResponseSchema, wikiIdentifier, signal);
export const officialVideoInboxErrorStatus = (error: unknown) =>
  typeof error === "object" && error !== null && "status" in error
    ? error.status
    : null;
