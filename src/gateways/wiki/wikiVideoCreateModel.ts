import { wikiPrivateApiTypes } from "@kpool/types";
import { normalizeYouTubeVideoUrl } from "@kpool/wiki";
import { z } from "zod";

// Reuse the generated backend contract, narrowing it for a manual YouTube form.
export const wikiVideoCreateSchema =
  wikiPrivateApiTypes.schemas.CreateVideoLinkRequestBody.strip().extend({
    title: z.string().trim().min(1).max(255),
    url: z.string().refine((value) => normalizeYouTubeVideoUrl(value) !== null),
    durationSeconds: z.number().int().min(1).max(2147483647),
    displayOrder: z.number().int().min(0).max(2147483647),
  });
export type WikiVideoCreateRequest = z.infer<typeof wikiVideoCreateSchema>;
