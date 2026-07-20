import {
  normalizeWikiDraftImageListResponse,
  wikiDraftImageListResponseSchema,
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
  wikiImageDeletionRequestApprovalResponseSchema,
  wikiImageDeletionRequestListResponseSchema,
  wikiImageDeletionRequestRejectionResponseSchema,
  wikiImageDeletionRequestResponseSchema,
  wikiImageListResponseSchema,
  wikiImageReviewResponseSchema,
  wikiImageUploadResponseSchema,
  type WikiDraftImageListResponse,
  type WikiDraftImageStatus,
  type WikiImageDeletionRequest,
  type WikiImageDeletionRequestApprovalResponse,
  type WikiImageDeletionRequestListResponse,
  type WikiImageDeletionRequestRejectionRequest,
  type WikiImageDeletionRequestRejectionResponse,
  type WikiImageDeletionRequestResponse,
  type WikiImageListResponse,
  type WikiImageReviewResponse,
  type WikiImageUploadRequest,
  type WikiImageUploadResponse,
} from "@kpool/wiki";
import { parseWithSchemaLog } from "@/gateways/support/zodErrorLog";
import {
  getWikiRouteErrorMessage,
  readWikiRouteJsonResponse,
} from "./wikiBrowserRouteSupport";

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
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog("wiki draft image list response", wikiDraftImageListResponseSchema, normalizeWikiDraftImageListResponse(body));
};


export const fetchWikiImageDeletionRequests = async ({
  fallbackErrorMessage,
  page,
  perPage,
}: {
  fallbackErrorMessage: string;
  page: number;
  perPage: number;
}): Promise<WikiImageDeletionRequestListResponse> => {
  const url = new URL("/api/wiki/image-deletion-requests", window.location.origin);

  url.searchParams.set("perPage", String(perPage));
  url.searchParams.set("page", String(page));

  const response = await fetch(`${url.pathname}${url.search}`);
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki image deletion request list response",
    wikiImageDeletionRequestListResponseSchema,
    body,
  );
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
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog("wiki image list response", wikiImageListResponseSchema, body);
};

export const requestWikiImageDeletion = async ({
  fallbackErrorMessage,
  imageIdentifier,
  requestBody,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
  requestBody: WikiImageDeletionRequest;
}): Promise<WikiImageDeletionRequestResponse> => {
  const response = await fetch(
    `/api/wiki/images/${encodeURIComponent(imageIdentifier)}/request-deletion`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki image deletion request response",
    wikiImageDeletionRequestResponseSchema,
    body,
  );
};


export const approveWikiImageDeletionRequest = async ({
  fallbackErrorMessage,
  imageIdentifier,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
}): Promise<WikiImageDeletionRequestApprovalResponse> => {
  const response = await fetch(
    `/api/wiki/image-deletion-requests/${encodeURIComponent(imageIdentifier)}/approve`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
      },
    },
  );
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki image deletion request approval response",
    wikiImageDeletionRequestApprovalResponseSchema,
    body,
  );
};

export const rejectWikiImageDeletionRequest = async ({
  fallbackErrorMessage,
  imageIdentifier,
  requestBody,
}: {
  fallbackErrorMessage: string;
  imageIdentifier: string;
  requestBody: WikiImageDeletionRequestRejectionRequest;
}): Promise<WikiImageDeletionRequestRejectionResponse> => {
  const response = await fetch(
    `/api/wiki/image-deletion-requests/${encodeURIComponent(imageIdentifier)}/reject`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
      },
      body: JSON.stringify(requestBody),
    },
  );
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog(
    "wiki image deletion request rejection response",
    wikiImageDeletionRequestRejectionResponseSchema,
    body,
  );
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
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog("wiki image upload response", wikiImageUploadResponseSchema, body);
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
  const body = await readWikiRouteJsonResponse(response, fallbackErrorMessage);

  if (!response.ok) {
    throw new Error(getWikiRouteErrorMessage(body, fallbackErrorMessage));
  }

  return parseWithSchemaLog("wiki image review response", wikiImageReviewResponseSchema, body);
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
