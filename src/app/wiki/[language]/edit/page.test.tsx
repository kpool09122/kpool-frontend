import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  load: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("../../wikiEditAccess", () => ({ loadWikiEditAccess: mocks.access }));
vi.mock("@/gateways/wiki/draftWiki", () => ({ loadDraftWikiStateByIdentifier: mocks.load }));
vi.mock("../../[slug]/edit/WikiEditPage", () => ({
  WikiEditPage: ({ wikiState, language, slug, themeColor }: { wikiState: { status: string; message?: string }; language: string; slug: string; themeColor?: string }) => (
    <div data-testid="editor">{JSON.stringify({ wikiState, language, slug, themeColor })}</div>
  ),
}));
import Page, { dynamic, revalidate } from "./page";

const props = (searchParams: Record<string, string | string[] | undefined> = { resourceType: "group" }) => ({
  params: Promise.resolve({ language: "draft-1" }), searchParams: Promise.resolve(searchParams),
});

describe("Draft ID editor route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ status: "available", headers: { Cookie: "session=abc" } });
    mocks.load.mockResolvedValue({ status: "success", data: { wikiIdentifier: "draft-1", resourceType: "group", language: "ko", slug: "gr-twice" } });
  });
  afterEach(cleanup);

  it("loads the exact draft ID with cookies and uses its content language", async () => {
    render(await Page(props({ resourceType: ["group", "talent"], themeColor: "#fff" })));
    expect(dynamic).toBe("force-dynamic");
    expect(revalidate).toBe(0);
    expect(mocks.load).toHaveBeenCalledWith("group", "draft-1", { Cookie: "session=abc" });
    expect(mocks.access).toHaveBeenCalledWith("/wiki/draft-1/edit?resourceType=group&themeColor=%23fff");
    expect(screen.getByTestId("editor")).toHaveTextContent('"language":"ko"');
    expect(screen.getByTestId("editor")).toHaveTextContent('"slug":"gr-twice"');
    expect(screen.getByTestId("editor")).toHaveTextContent('"themeColor":"#fff"');
  });

  it.each([{}, { resourceType: "unknown" }])("rejects missing or invalid types without fetching or creating a draft: %j", async (query) => {
    render(await Page(props(query)));
    expect(screen.getByTestId("editor")).toHaveTextContent("Draft wiki resource type is required.");
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("returns through the existing auth gate before loading draft data", async () => {
    mocks.access.mockResolvedValue({ status: "redirect", href: "/login?returnTo=id-editor" });
    await expect(Page(props())).rejects.toThrow("redirect:/login?returnTo=id-editor");
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("shows principal lookup errors without fetching draft data", async () => {
    mocks.access.mockResolvedValue({ status: "error", message: "Principal unavailable" });
    render(await Page(props()));
    expect(screen.getByTestId("editor")).toHaveTextContent("Principal unavailable");
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("shows a missing draft without switching to a different draft", async () => {
    mocks.load.mockResolvedValue({ status: "empty" });
    render(await Page(props()));
    expect(screen.getByTestId("editor")).toHaveTextContent('"status":"empty"');
  });
});
