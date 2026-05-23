import { describe, expect, it } from "vitest";

import {
  createWikiDraftImageReviewUrl,
  createWikiDraftImagesUrl,
  createWikiImageAssociationInput,
  createWikiImageUploadRequest,
  createWikiImagesUrl,
  isAcceptedWikiImageFile,
  isSafeWikiSourceUrl,
  isWikiImageFileSizeAllowed,
  normalizeWikiDraftImageListResponse,
  stripDataUrlPrefix,
  wikiImageMaxBase64Length,
  wikiImageMaxFileSizeBytes,
  wikiImageUploadRequestSchema,
} from "./wikiImageModel";

describe("wikiImages", () => {
  it("accepts only supported image mime types with matching extensions", () => {
    expect(isAcceptedWikiImageFile({ name: "cover.jpg", type: "image/jpeg" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.jpeg", type: "image/jpeg" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.png", type: "image/png" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.webp", type: "image/webp" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.gif", type: "image/gif" })).toBe(false);
    expect(isAcceptedWikiImageFile({ name: "cover.jpg", type: "text/plain" })).toBe(false);
  });

  it("accepts only image files within the configured size limit", () => {
    expect(isWikiImageFileSizeAllowed({ size: wikiImageMaxFileSizeBytes })).toBe(true);
    expect(isWikiImageFileSizeAllowed({ size: wikiImageMaxFileSizeBytes + 1 })).toBe(false);
    expect(isWikiImageFileSizeAllowed({ size: 0 })).toBe(false);
  });

  it("strips data url prefixes before sending backend upload payloads", () => {
    expect(stripDataUrlPrefix("data:image/png;base64,aGVsbG8=")).toBe("aGVsbG8=");
    expect(stripDataUrlPrefix("aGVsbG8=")).toBe("aGVsbG8=");
  });

  it("creates a typed upload request with required backend fields", () => {
    const request = createWikiImageUploadRequest({
      altText: "Stage performance",
      base64EncodedImage: "data:image/webp;base64,abc123",
      displayOrder: 3,
      fileName: "stage.webp",
      imageAssociation: createWikiImageAssociationInput({
        resourceType: "group",
        translationSetIdentifier: "translation-set-1",
      }),
      rightsConfirmationAgreed: true,
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Stage.webp",
    });

    expect(request).toEqual(
      expect.objectContaining({
        altText: "Stage performance",
        base64EncodedImage: "abc123",
        displayOrder: 3,
        resourceType: "group",
        rightsConfirmationAgreed: true,
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Stage.webp",
        translationSetIdentifier: "translation-set-1",
      }),
    );
    expect(request.agreedToTermsAt).toEqual(expect.any(String));
  });

  it("removes dangerous source URL schemes from upload requests", () => {
    expect(isSafeWikiSourceUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeWikiSourceUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSafeWikiSourceUrl("https://commons.wikimedia.org/wiki/File:Stage.webp")).toBe(true);

    const request = createWikiImageUploadRequest({
      altText: "Stage performance",
      base64EncodedImage: "abc123",
      displayOrder: 3,
      fileName: "stage.webp",
      imageAssociation: createWikiImageAssociationInput({
        resourceType: "group",
        translationSetIdentifier: "translation-set-1",
      }),
      rightsConfirmationAgreed: true,
      sourceName: "Wikimedia Commons",
      sourceUrl: "javascript:alert(1)",
    });

    expect(request.sourceUrl).toBe("");
  });

  it("rejects upload requests with oversized encoded images", () => {
    expect(wikiImageUploadRequestSchema.safeParse({
        resourceType: "group",
        translationSetIdentifier: "translation-set-1",
        base64EncodedImage: "a".repeat(wikiImageMaxBase64Length + 1),
        displayOrder: 3,
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Stage.webp",
        sourceName: "Wikimedia Commons",
        altText: "Stage performance",
        agreedToTermsAt: "2026-05-09T00:00:00.000Z",
        rightsConfirmationAgreed: true,
      }).success).toBe(false);
  });

  it("builds image list urls with pagination query values", () => {
    expect(
      createWikiImagesUrl({
        baseUrl: "https://api.example.test/api/wiki/",
        page: 2,
        perPage: 12,
        translationSetIdentifier: "translation-set-1",
      }),
    ).toBe(
      "https://api.example.test/api/wiki/images?translationSetIdentifier=translation-set-1&perPage=12&page=2",
    );
  });

  it("builds draft image list urls with status and optional filters", () => {
    expect(
      createWikiDraftImagesUrl({
        baseUrl: "https://api.example.test/api/wiki/",
        page: 3,
        perPage: 24,
        status: "under_review",
        wikiIdentifier: "wiki-1",
      }),
    ).toBe(
      "https://api.example.test/api/wiki/draft-images?status=under_review&perPage=24&page=3&wikiIdentifier=wiki-1",
    );
  });

  it("builds draft image review urls for backend image actions", () => {
    expect(
      createWikiDraftImageReviewUrl({
        action: "approve",
        baseUrl: "https://api.example.test/api/wiki/",
        imageIdentifier: "44444444-4444-4444-4444-444444444444",
      }),
    ).toBe(
      "https://api.example.test/api/wiki/image/44444444-4444-4444-4444-444444444444/approve",
    );
  });

  it("normalizes empty draft image wiki names arrays from backend responses", () => {
    expect(
      normalizeWikiDraftImageListResponse({
        images: [
          {
            imageIdentifier: "44444444-4444-4444-4444-444444444444",
            wiki: {
              names: [],
              slug: "review-wiki",
            },
          },
        ],
        current_page: 1,
        last_page: 1,
        total: 1,
        per_page: 12,
      }),
    ).toEqual({
      images: [
        {
          imageIdentifier: "44444444-4444-4444-4444-444444444444",
          wiki: {
            names: {},
            slug: "review-wiki",
          },
        },
      ],
      current_page: 1,
      last_page: 1,
      total: 1,
      per_page: 12,
    });
  });
});
