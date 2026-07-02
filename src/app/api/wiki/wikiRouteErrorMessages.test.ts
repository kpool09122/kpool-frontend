import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as getDraftImages } from "./draft-images/route";
import { GET as getDraftWikis } from "./draft-wikis/route";
import { GET as getImages } from "./images/route";
import { GET as getMyDraftWikis } from "./my/draft-wikis/route";
import { POST as uploadImage } from "./images/upload/route";
import { GET as getVersionInconsistentWikis } from "./version-inconsistent-wikis/route";

const internalBackendMessage = "SQL failed at /var/app/wiki/internal";
const wikiImageUnavailableMessage =
  "Wiki images are temporarily unavailable. Please try again later.";
const wikiDraftUnavailableMessage =
  "Wiki drafts are temporarily unavailable. Please try again later.";

const jsonResponse = (status: number): Response =>
  new Response(JSON.stringify({ message: internalBackendMessage }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createRequest = (url: string, init: RequestInit = {}): NextRequest =>
  new NextRequest(url, init);

const createUploadBody = () => ({
  resourceType: "group",
  translationSetIdentifier: "55555555-5555-5555-5555-555555555555",
  base64EncodedImage: "aGVsbG8=",
  displayOrder: 1,
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Upload.png",
  sourceName: "Wikimedia Commons",
  altText: "Stage upload",
  agreedToTermsAt: "2026-05-09T00:00:00.000Z",
  rightsConfirmationAgreed: true,
});

describe("wiki API route error messages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it("does not expose backend messages from image routes", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(500))));
    const uploadBody = createUploadBody();
    const uploadBodyText = JSON.stringify(uploadBody);

    const responses = await Promise.all([
      getImages(
        createRequest(
          "https://app.example.test/api/wiki/images?translationSetIdentifier=55555555-5555-5555-5555-555555555555",
        ),
      ),
      uploadImage(
        createRequest("https://app.example.test/api/wiki/images/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "content-length": String(uploadBodyText.length),
          },
          body: uploadBodyText,
        }),
      ),
      getDraftImages(
        createRequest("https://app.example.test/api/wiki/draft-images?status=pending"),
      ),
    ]);

    for (const response of responses) {
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.message).toBe(wikiImageUnavailableMessage);
      expect(body.message).not.toContain("/var/app");
    }

    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });

  it("does not expose backend messages from draft wiki list routes", async () => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(503))));

    const responses = await Promise.all([
      getDraftWikis(
        createRequest("https://app.example.test/api/wiki/draft-wikis?status=pending"),
      ),
      getMyDraftWikis(
        createRequest("https://app.example.test/api/wiki/my/draft-wikis?status=pending"),
      ),
      getVersionInconsistentWikis(
        createRequest("https://app.example.test/api/wiki/version-inconsistent-wikis"),
      ),
    ]);

    for (const response of responses) {
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.message).toBe(wikiDraftUnavailableMessage);
      expect(body.message).not.toContain("/var/app");
    }

    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(internalBackendMessage);
  });
});
