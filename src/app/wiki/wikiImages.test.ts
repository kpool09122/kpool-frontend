import { describe, expect, it } from "vitest";

import {
  createWikiDraftImagesUrl,
  createWikiImageAssociationInput,
  createWikiImageUploadRequest,
  createWikiImagesUrl,
  isAcceptedWikiImageFile,
  stripDataUrlPrefix,
} from "./wikiImages";

describe("wikiImages", () => {
  it("accepts only supported image mime types with matching extensions", () => {
    expect(isAcceptedWikiImageFile({ name: "cover.jpg", type: "image/jpeg" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.jpeg", type: "image/jpeg" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.png", type: "image/png" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.webp", type: "image/webp" })).toBe(true);
    expect(isAcceptedWikiImageFile({ name: "cover.gif", type: "image/gif" })).toBe(false);
    expect(isAcceptedWikiImageFile({ name: "cover.jpg", type: "text/plain" })).toBe(false);
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
      sourceName: "Wikimedia Commons",
      sourceUrl: "https://commons.wikimedia.org/wiki/File:Stage.webp",
    });

    expect(request).toEqual(
      expect.objectContaining({
        altText: "Stage performance",
        base64EncodedImage: "abc123",
        displayOrder: 3,
        imageUsage: "profile",
        resourceType: "group",
        sourceName: "Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Stage.webp",
        translationSetIdentifier: "translation-set-1",
      }),
    );
    expect(request.agreedToTermsAt).toEqual(expect.any(String));
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
});
