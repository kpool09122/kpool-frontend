import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createWikiRequestBodyFromInitialFields, type createWiki } from "@/gateways/wiki/draftWiki";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiDraftInitializer } from "./WikiDraftInitializer";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const requestBody = createWikiRequestBodyFromInitialFields({
  language: "ko", name: "Nayeon", resourceType: "talent", slug: "tl-nayeon",
});
const renderInitializer = (createAdapter: typeof createWiki) => render(
  <StrictMode>
    <I18nProvider initialLocale="en">
      <WikiDraftInitializer requestBody={requestBody} createAdapter={createAdapter} />
    </I18nProvider>
  </StrictMode>,
);

describe("WikiDraftInitializer", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/";
    navigation.refresh.mockReset();
  });

  it("creates once in Strict Mode and refreshes only after creation succeeds", async () => {
    let complete!: (value: Awaited<ReturnType<typeof createWiki>>) => void;
    const createAdapter = vi.fn<typeof createWiki>().mockImplementation(() =>
      new Promise((resolve) => { complete = resolve; }),
    );
    renderInitializer(createAdapter);
    expect(screen.getByText("Preparing the editor...")).toBeInTheDocument();
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledWith({ requestBody, fallbackErrorMessage: "Unable to load wiki" });
    expect(navigation.refresh).not.toHaveBeenCalled();
    complete({ wikiIdentifier: "created", resourceType: "talent", language: "ko", name: "Nayeon", status: "pending" });
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(1));
  });

  it("shows creation failures without refreshing or replaying the POST", async () => {
    const createAdapter = vi.fn<typeof createWiki>().mockRejectedValue(new Error("Please refresh the page and try again."));
    renderInitializer(createAdapter);
    expect(await screen.findByText("Please refresh the page and try again.")).toBeInTheDocument();
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it.each([true, false])("posts through the BFF with a fresh CSRF token (cookie exists: %s)", async (hasCookie) => {
    document.cookie = hasCookie
      ? "XSRF-TOKEN=after-login; Path=/"
      : "XSRF-TOKEN=; Max-Age=0; Path=/";
    const fetchMock = vi.fn().mockImplementation(async (url) => {
      if (url === "/api/identity/auth/csrf-token") {
        document.cookie = "XSRF-TOKEN=after-login; Path=/";
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify({
        wikiIdentifier: "created", resourceType: "talent", language: "ko", name: "Nayeon", status: "pending",
      }), { status: 201 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <I18nProvider initialLocale="en">
        <WikiDraftInitializer requestBody={requestBody} />
      </I18nProvider>,
    );
    await waitFor(() => expect(navigation.refresh).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(hasCookie ? 1 : 2);
    if (!hasCookie) {
      expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/identity/auth/csrf-token", {
        credentials: "same-origin", cache: "no-store",
      });
    }
    expect(fetchMock).toHaveBeenLastCalledWith("/api/wiki/draft-wikis", {
      method: "POST", credentials: "include",
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-XSRF-TOKEN": "after-login" },
      body: JSON.stringify(requestBody),
    });
  });
});
