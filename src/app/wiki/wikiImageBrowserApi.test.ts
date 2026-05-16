import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createWikiImageUploadRequest,
  wikiDraftImageReviewCsrfHeaderName,
  wikiDraftImageReviewCsrfHeaderValue,
} from "./wikiImageModel";
import {
  approveWikiDraftImage,
  fetchWikiImages,
  rejectWikiDraftImage,
  uploadWikiImageRequest,
} from "./wikiImageBrowserApi";

const imageIdentifier = "44444444-4444-4444-4444-444444444444";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("wikiImageBrowserApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends approve requests with credentials and the review header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        imageIdentifier,
        resourceType: "group",
        status: "approved",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await approveWikiDraftImage({
      fallbackErrorMessage: "Approve failed",
      imageIdentifier,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/wiki/draft-images/${imageIdentifier}/approve`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
        },
      },
    );
  });

  it("fetches uploaded images through the browser image route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        images: [],
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 12,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikiImages({
      fallbackErrorMessage: "List failed",
      page: 1,
      perPage: 12,
      translationSetIdentifier: "translation-set-1",
    });

    expect(result.total).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/images?translationSetIdentifier=translation-set-1&perPage=12&page=1",
    );
  });

  it("uploads image requests through the browser upload route", async () => {
    const requestBody = createWikiImageUploadRequest({
      altText: "Stage upload",
      base64EncodedImage: "data:image/png;base64,aW1hZ2U=",
      displayOrder: 1,
      fileName: "upload.png",
      imageAssociation: {
        resourceType: "group",
        translationSetIdentifier: "translation-set-1",
      },
      rightsConfirmationAgreed: true,
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          imageIdentifier,
          resourceType: "group",
          status: "draft",
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await uploadWikiImageRequest({
      fallbackErrorMessage: "Upload failed",
      requestBody,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/wiki/images/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
  });

  it("sends reject requests to the reject route with the same safeguards", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        imageIdentifier,
        resourceType: "group",
        isHidden: false,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await rejectWikiDraftImage({
      fallbackErrorMessage: "Reject failed",
      imageIdentifier,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/wiki/draft-images/${imageIdentifier}/reject`,
      expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({
          Accept: "application/json",
          [wikiDraftImageReviewCsrfHeaderName]: wikiDraftImageReviewCsrfHeaderValue,
        }),
        method: "POST",
      }),
    );
  });

  it("throws route error messages for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Review is forbidden" }, 403)),
    );

    await expect(
      approveWikiDraftImage({
        fallbackErrorMessage: "Approve failed",
        imageIdentifier,
      }),
    ).rejects.toThrow("Review is forbidden");
  });

  it("throws image route error messages for non-2xx image list responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Images are unavailable" }, 503)),
    );

    await expect(
      fetchWikiImages({
        fallbackErrorMessage: "List failed",
        page: 1,
        perPage: 12,
        translationSetIdentifier: "translation-set-1",
      }),
    ).rejects.toThrow("Images are unavailable");
  });

  it("throws when the review response does not match the schema", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));

    await expect(
      rejectWikiDraftImage({
        fallbackErrorMessage: "Reject failed",
        imageIdentifier,
      }),
    ).rejects.toThrow();
  });
});
