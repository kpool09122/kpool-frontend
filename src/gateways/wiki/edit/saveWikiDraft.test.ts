import { createMockWikiDetail } from "@kpool/wiki";
import { afterEach, describe, expect, it, vi } from "vitest";

import { saveWikiDraft, submitWikiDraft } from "./saveWikiDraft";

describe("saveWikiDraft", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits wiki drafts through the browser API route with wiki id and resource type", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          language: "ja",
          name: "Aurora Echo",
          resourceType: "group",
          status: "under_review",
          wikiIdentifier: "88888888-8888-4888-8888-888888888888",
        }),
        { status: 201 },
      ),
    );
    const draft = createMockWikiDetail("gr-aurora-echo");

    await expect(submitWikiDraft(draft)).resolves.toEqual({
      ok: true,
      status: "under_review",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/drafts/gr-aurora-echo/submit",
      expect.objectContaining({
        body: JSON.stringify({
          resourceType: "group",
          wikiId: "gr-aurora-echo",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
  });

  it("returns a failed submit result when the browser API route fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "failed" }), { status: 502 }),
    );

    await expect(submitWikiDraft(createMockWikiDetail("gr-aurora-echo"))).resolves.toEqual({
      ok: false,
    });
  });

  it("saves wiki drafts through the browser API route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          language: "ja",
          name: "Aurora Echo",
          resourceType: "group",
          status: "draft",
          wikiIdentifier: "88888888-8888-4888-8888-888888888888",
        }),
        { status: 201 },
      ),
    );

    await expect(saveWikiDraft(createMockWikiDetail("gr-aurora-echo"))).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wiki/drafts/gr-aurora-echo",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
