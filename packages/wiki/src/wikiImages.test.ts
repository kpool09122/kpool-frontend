import { describe, expect, it } from "vitest";

import {
  createWikiDraftImageReviewUrl,
  createWikiDraftImagesUrl,
  createWikiImageAssociationInput,
  createWikiImageDeletionRequest,
  createWikiImageDeletionRequestRejection,
  createWikiImageDeletionRequestReviewUrl,
  createWikiImageDeletionRequestsUrl,
  createWikiImageDeletionRequestUrl,
  createWikiImageUploadRequest,
  createWikiImagesUrl,
  isAcceptedWikiImageFile,
  isSafeWikiImageUrl,
  isSafeWikiSourceUrl,
  isWikiImageFileSizeAllowed,
  normalizeWikiDraftImageListResponse,
  stripDataUrlPrefix,
  wikiImageMaxBase64Length,
  wikiImageMaxFileSizeBytes,
  wikiImageDeletionRequestApprovalResponseSchema,
  wikiImageDeletionRequestListResponseSchema,
  wikiImageDeletionRequestRejectionRequestSchema,
  wikiImageDeletionRequestRejectionResponseSchema,
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

  it("allows only trusted wiki image delivery URLs for rendered images", () => {
    expect(isSafeWikiImageUrl("https://upload.wikimedia.org/wikipedia/commons/example/stage.webp")).toBe(true);
    expect(isSafeWikiImageUrl("http://localhost:8080/images/stage.webp")).toBe(true);
    expect(isSafeWikiImageUrl("http://127.0.0.1:8080/images/stage.webp")).toBe(true);
    expect(isSafeWikiImageUrl("https://tracker.example.test/stage.webp")).toBe(false);
    expect(isSafeWikiImageUrl("http://upload.wikimedia.org/wikipedia/commons/example/stage.webp")).toBe(false);
    expect(isSafeWikiImageUrl("data:image/svg+xml,<svg></svg>")).toBe(false);
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

  it("builds image deletion request urls for backend image actions", () => {
    expect(
      createWikiImageDeletionRequestUrl({
        baseUrl: "https://api.example.test/api/wiki/",
        imageIdentifier: "44444444-4444-4444-4444-444444444444",
      }),
    ).toBe(
      "https://api.example.test/api/wiki/image/44444444-4444-4444-4444-444444444444/request-deletion",
    );
  });


  it("builds image deletion request list and review urls", () => {
    expect(
      createWikiImageDeletionRequestsUrl({
        baseUrl: "https://api.example.test/api/wiki/",
        page: 2,
        perPage: 12,
      }),
    ).toBe("https://api.example.test/api/wiki/image-deletion-requests?perPage=12&page=2");
    expect(
      createWikiImageDeletionRequestReviewUrl({
        action: "approve",
        baseUrl: "https://api.example.test/api/wiki/",
        imageIdentifier: "44444444-4444-4444-4444-444444444444",
      }),
    ).toBe(
      "https://api.example.test/api/wiki/image/44444444-4444-4444-4444-444444444444/approve-deletion",
    );
  });

  it("validates image deletion request list and review schemas", () => {
    const listResult = wikiImageDeletionRequestListResponseSchema.safeParse({
      images: [{
        imageIdentifier: "44444444-4444-4444-4444-444444444444",
        url: "https://upload.wikimedia.org/image.webp",
        resourceType: "group",
        translationSetIdentifier: "55555555-5555-5555-5555-555555555555",
        displayOrder: 1,
        sourceUrl: "https://source.example.test/image.webp",
        sourceName: "Source",
        altText: "Alt",
        isHidden: true,
        uploadedAt: "2026-05-09T00:00:00Z",
        name: "Requester",
        email: "requester@example.test",
        reason: "Rights concern",
      }],
      current_page: 1,
      last_page: 1,
      total: 1,
      per_page: 12,
    });

    expect(listResult.success).toBe(true);
    expect(listResult.success ? listResult.data.images[0].reason : null).toBe("Rights concern");
    expect(createWikiImageDeletionRequestRejection({ rejectReason: "  Keep this image  " })).toEqual({
      rejectReason: "Keep this image",
    });
    expect(wikiImageDeletionRequestRejectionRequestSchema.safeParse({ rejectReason: "" }).success).toBe(false);
    const approvalResult = wikiImageDeletionRequestApprovalResponseSchema.safeParse({
      imageIdentifier: "44444444-4444-4444-4444-444444444444",
      isHidden: true,
    });
    const rejectionResult = wikiImageDeletionRequestRejectionResponseSchema.safeParse({
      imageIdentifier: "44444444-4444-4444-4444-444444444444",
      rejectReason: "Keep this image",
      isHidden: false,
    });

    expect(approvalResult.success).toBe(true);
    expect(approvalResult.success ? approvalResult.data.isHidden : null).toBe(true);
    expect(rejectionResult.success).toBe(true);
    expect(rejectionResult.success ? rejectionResult.data.rejectReason : null).toBe("Keep this image");
  });

  it("trims image deletion request form fields", () => {
    expect(
      createWikiImageDeletionRequest({
        requesterName: "  KPool User  ",
        requesterEmail: " user@example.test ",
        reason: "  Rights concern  ",
      }),
    ).toMatchObject({
      requesterName: "KPool User",
      requesterEmail: "user@example.test",
      reason: "Rights concern",
    });
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
