import { normalizeYouTubeVideoUrl } from "@kpool/wiki";
import { browserApiFetch } from "@/gateways/support/browserApiFetch";
import {
  wikiVideoCreateSchema,
  type WikiVideoCreateRequest,
} from "./wikiVideoCreateModel";
export {
  wikiVideoCreateSchema,
  type WikiVideoCreateRequest,
} from "./wikiVideoCreateModel";

export const createWikiVideo = async (body: WikiVideoCreateRequest) => {
  const parsed = wikiVideoCreateSchema.safeParse(body);
  if (!parsed.success) return { ok: false as const, status: 422 };
  try {
    const response = await browserApiFetch("/api/wiki/videos/create", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...parsed.data,
        url: normalizeYouTubeVideoUrl(parsed.data.url),
      }),
    });
    return { ok: response.status === 204, status: response.status };
  } catch {
    return { ok: false as const, status: 0 };
  }
};
