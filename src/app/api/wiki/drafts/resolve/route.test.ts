import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), load: vi.fn(), client: vi.fn(), create: vi.fn() }));
vi.mock("@/app/wiki/wikiEditAccess", () => ({ loadWikiEditAccess: mocks.access }));
vi.mock("@/gateways/wiki/draftWiki", () => ({ loadDraftWikiState: mocks.load, createDraftWikiApiClient: mocks.client }));
import { POST } from "./route";

const request = (body: unknown = { language: "ko", slug: "gr-twice", themeColor: "#fff" }) => new NextRequest("http://localhost/api/wiki/drafts/resolve", {
  method: "POST", headers: { "Content-Type": "application/json", Cookie: "session=abc", "X-XSRF-TOKEN": "csrf" }, body: JSON.stringify(body),
});

describe("Wiki edit entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ status: "available" });
    mocks.client.mockReturnValue({ createWikiDraft: mocks.create });
    mocks.load.mockResolvedValue({ status: "success", data: { wikiIdentifier: "existing-draft", resourceType: "group" } });
    mocks.create.mockResolvedValue({ wikiIdentifier: "new-draft", resourceType: "group" });
  });

  it("returns an existing draft ID without creating another draft", async () => {
    const response = await POST(request());
    expect(await response.json()).toEqual({ href: "/wiki/existing-draft/edit?resourceType=group&themeColor=%23fff" });
    expect(mocks.load).toHaveBeenCalledWith("ko", "gr-twice", expect.objectContaining({ Cookie: "session=abc", "X-XSRF-TOKEN": "csrf" }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a missing draft from the public Wiki and returns the created ID", async () => {
    const requestBody = { language: "ko", slug: "gr-twice", publishedWikiIdentifier: "public-id", basic: { name: "TWICE" } };
    mocks.load.mockResolvedValue({ status: "needs-creation", requestBody });
    const response = await POST(request());
    expect(mocks.create).toHaveBeenCalledExactlyOnceWith(requestBody);
    expect(mocks.client).toHaveBeenCalledWith(undefined, expect.objectContaining({ Cookie: "session=abc", "X-XSRF-TOKEN": "csrf" }));
    expect(await response.json()).toEqual({ href: "/wiki/new-draft/edit?resourceType=group&themeColor=%23fff" });
  });

  it("returns login to the original content language detail with an edit intent before reading or creating", async () => {
    mocks.access.mockImplementation(async (path: string) => ({ status: "redirect", href: `/login?returnTo=${encodeURIComponent(path)}` }));
    const response = await POST(request());
    expect(await response.json()).toEqual({ href: "/login?returnTo=%2Fko%2Fwiki%2Fgr-twice%3Fedit%3D1%26themeColor%3D%2523fff" });
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(["empty", "error"])("does not create a draft when lookup returns %s", async (status) => {
    mocks.load.mockResolvedValue({ status, message: "Private backend failure" });
    const response = await POST(request());
    expect(response.status).toBe(status === "empty" ? 404 : 502);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ message: status === "empty" ? "Wiki not found." : "Private backend failure" });
  });

  it("preserves CSRF rejection without returning an editor destination", async () => {
    mocks.load.mockResolvedValue({ status: "needs-creation", requestBody: {} });
    mocks.create.mockRejectedValue({ response: { status: 419, data: { code: "csrf_token_mismatch", detail: "ページを更新してください。" } } });
    const response = await POST(request());
    expect(response.status).toBe(419);
    expect(await response.json()).toMatchObject({ code: "csrf_token_mismatch" });
  });

  it("rejects invalid inputs before resolving authentication or a Wiki", async () => {
    expect((await POST(request({ language: "ko" }))).status).toBe(400);
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
