import { wikiPrivateApiTypes } from "@kpool/types";
import { getYouTubeVideoId, normalizeVideoUrl } from "@kpool/wiki";
import { z } from "zod";

export const wikiVideoCreateSchema =
  wikiPrivateApiTypes.schemas.CreateVideoLinkRequestBody.strip().extend({
    title: z.string().trim().min(1).max(255),
    url: z.string().url().max(255).refine((value) => normalizeVideoUrl(value) !== null),
    durationSeconds: z.number().int().min(0).max(2147483647).nullish(),
  }).refine((body) => !getYouTubeVideoId(body.url) || body.durationSeconds != null, { path: ["durationSeconds"] });
export type WikiVideoCreateRequest = z.infer<typeof wikiVideoCreateSchema>;
