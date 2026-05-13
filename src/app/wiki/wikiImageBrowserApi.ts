import {
  normalizeWikiDraftImageListResponse,
  wikiDraftImageListResponseSchema,
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
  wikiImageListResponseSchema,
  wikiImageReviewResponseSchema,
  wikiImageUploadResponseSchema,
  type WikiDraftImageListResponse,
  type WikiDraftImageStatus,
  type WikiImageListResponse,
  type WikiImageReviewResponse,
  type WikiImageUploadRequest,
  type WikiImageUploadResponse,
} from "./wikiImageModel";

const readJsonResponse = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const getRouteErrorMessage = (body: unknown, fallback: string): string =>
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof (body as { message: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallback;

export const fetchWikiDraftImages = async ({
  page,
  perPage,
  status,
  wikiIdentifier,
  fallbackErrorMessage,
}: {
  page: number;
  perPage: number;
  status: WikiDraftImageStatus;
  wikiIdentifier?: string;
  fallbackErrorMessage: string;
}): Promise<WikiDraftImageListResponse> => {
  const url = new URL("/api/wiki/draft-images", window.location.origin);

  url.searchParams.set("status", status);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  if (wikiIdentifier) {
    url.searchParams.set("wikiIdentifier", wikiIdentifier);
  }

  const response = await fetch(`${url.pathname}${url.search}`);
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiDraftImageListResponseSchema.parse(normalizeWikiDraftImageListResponse(body));
};

export const fetchWikiImages = async ({
  fallbackErrorMessage,
  page,
  perPage,
  translationSetIdentifier,
}: {
  fallbackErrorMessage: string;
  page: number;
  perPage: number;
  translationSetIdentifier: string;
}): Promise<WikiImageListResponse> => {
  const url = new URL("/api/wiki/images", window.location.origin);

  url.searchParams.set("translationSetIdentifier", translationSetIdentifier);
  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  const response = await fetch(`${url.pathname}${url.search}`);
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiImageListResponseSchema.parse(body);
};

export const uploadWikiImageRequest = async ({
  fallbackErrorMessage,
  requestBody,
}: {
  fallbackErrorMessage: string;
  requestBody: WikiImageUploadRequest;
}): Promise<WikiImageUploadResponse> => {
  const response = await fetch("/api/wiki/images/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiImageUploadResponseSchema.parse(body);
};

const reviewWikiDraftImage = async ({
  action,
  fallbackErrorMessage,
  imageIdentifier,
}: {
  action: "approve" | "reject";
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageReviewResponse> => {
  const response = await fetch(
    `/api/wiki/draft-images/${encodeURIComponent(imageIdentifier)}/${action}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
      },
    },
  );
  const body = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getRouteErrorMessage(body, fallbackErrorMessage));
  }

  return wikiImageReviewResponseSchema.parse(body);
};

export const approveWikiDraftImage = async ({
  fallbackErrorMessage,
  imageIdentifier,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageReviewResponse> =>
  reviewWikiDraftImage({
    action: "approve",
    fallbackErrorMessage,
    imageIdentifier,
  });

export const rejectWikiDraftImage = async ({
  fallbackErrorMessage,
  imageIdentifier,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageReviewResponse> =>
  reviewWikiDraftImage({
    action: "reject",
    fallbackErrorMessage,
    imageIdentifier,
  });
