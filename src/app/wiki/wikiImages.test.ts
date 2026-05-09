import { describe, expect, it } from "vitest";

import {
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
      altText: "",
      base64EncodedImage: "data:image/webp;base64,abc123",
      displayOrder: 3,
      fileName: "stage.webp",
      resourceType: "group",
      wikiIdentifier: "wiki-1",
    });

    expect(request).toEqual(
      expect.objectContaining({
        altText: "stage.webp",
        base64EncodedImage: "abc123",
        displayOrder: 3,
        imageUsage: "wiki_editor",
        resourceType: "group",
        sourceName: "stage.webp",
        sourceUrl: "",
        wikiIdentifier: "wiki-1",
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
        wikiIdentifier: "wiki-1",
      }),
    ).toBe("https://api.example.test/api/wiki/images?wikiIdentifier=wiki-1&perPage=12&page=2");
  });
});
