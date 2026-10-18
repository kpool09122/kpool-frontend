import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as getDraftImages } from "./draft-images/route";
import { GET as getDraftWikis } from "./draft-wikis/route";
import { GET as getImages } from "./images/route";
import { GET as getMyDraftWikis } from "./my/draft-wikis/route";
import { POST as uploadImage } from "./images/upload/route";
import { GET as getVersionInconsistentWikis } from "./version-inconsistent-wikis/route";

const backendMessage = "サーバーエラーが発生しました。";

const jsonResponse = (status: number): Response =>
  new Response(JSON.stringify({ detail: backendMessage, code: "operation_failed", errors: { name: ["名前を入力してください。"] } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createRequest = (url: string, init: ConstructorParameters<typeof NextRequest>[1] = {}): NextRequest =>
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
    vi.unstubAllGlobals();
    delete process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL;
  });

  it.each([403, 409, 422, 500, 503])("preserves backend messages and status %s from image routes", async (status) => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(status))));
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

      expect(response.status).toBe(status);
      expect(body).toEqual({ detail: backendMessage, message: backendMessage, code: "operation_failed", errors: { name: ["名前を入力してください。"] } });
    }

    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(backendMessage);
  });

  it.each([401, 403, 422, 500, 503])("preserves backend messages and status %s from draft wiki list routes", async (status) => {
    process.env.KPOOL_WIKI_PRIVATE_API_BASE_URL = "https://api.example.test";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(status))));

    const responses = await Promise.all([
      getDraftWikis(
        createRequest("https://app.example.test/api/wiki/draft-wikis?statuses%5B%5D=pending"),
      ),
      getMyDraftWikis(
        createRequest("https://app.example.test/api/wiki/my/draft-wikis?statuses%5B%5D=pending"),
      ),
      getVersionInconsistentWikis(
        createRequest("https://app.example.test/api/wiki/version-inconsistent-wikis"),
      ),
    ]);

    for (const response of responses) {
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(body).toEqual({ detail: backendMessage, message: backendMessage, code: "operation_failed", errors: { name: ["名前を入力してください。"] } });
    }

    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(backendMessage);
  });
});
