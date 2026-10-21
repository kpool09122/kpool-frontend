import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockWikiDetail, type WikiDraftDetail } from "@kpool/wiki";
import { useAuthStore } from "@/gateways/auth/authStore";
import * as principalApi from "@/gateways/wiki/wikiPrincipal";
import * as materialApi from "@/gateways/wiki/wikiMaterialSearch";
import * as profilesApi from "@/gateways/wiki/wikiRelatedProfilesBrowserApi";
import { useWikiMaterialSearch } from "./useWikiMaterialSearch";
const id = "11111111-1111-4111-8111-111111111111";
const site = {
  siteName: "Commons",
  pageUrl: "https://commons.wikimedia.org/wiki/File:A",
  reason: "Target",
  usageEvidence: "CC",
  usageEvidenceUrl: "https://commons.wikimedia.org/wiki/License",
};
const principal = {
  principalIdentifier: "principal",
  identityIdentifier: "user",
  status: "active" as const,
  accountPrincipalCount: 1,
  isDelegatedPrincipal: false,
  policies: [
    {
      policyIdentifier: "policy",
      name: "Search",
      isSystemPolicy: true,
      statements: [
        {
          effect: "allow",
          actions: ["search_free_materials"],
          resourceTypes: ["image"],
          condition: null,
        },
      ],
    },
  ],
};
const base = createMockWikiDetail("gr-aurora-echo");
const draft: WikiDraftDetail = {
  ...base,
  title: "Title",
  basic: {
    ...base.basic,
    agency: null,
    agencyIdentifier: null,
    agencyName: null,
    groups: [],
    talents: [],
    groupIdentifiers: [],
    talentIdentifiers: [],
  },
};
beforeEach(() => {
  useAuthStore.setState({
    identity: {
      identityIdentifier: "user",
      identityName: "User",
      email: "u@test",
      language: "ko",
    },
  });
  vi.spyOn(principalApi, "getCurrentWikiPrincipal").mockResolvedValue({
    status: "available",
    principal,
  });
});
afterEach(() => {
  cleanup();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  vi.restoreAllMocks();
});
const ready = async (read = () => draft) => {
  const hook = renderHook(
    ({ open }) => useWikiMaterialSearch(draft, open, read),
    { initialProps: { open: true } },
  );
  await waitFor(() => expect(hook.result.current.controller).toBeDefined());
  return hook;
};
describe("Wiki material search session", () => {
  it("uses SSR Identity before the auth store initializes, but never after logout", async () => {
    const initialIdentity = useAuthStore.getState().identity;
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    const hook = renderHook(() =>
      useWikiMaterialSearch(draft, true, () => draft, initialIdentity),
    );
    await waitFor(() =>
      expect(hook.result.current.controller?.context.language).toBe("ko"),
    );
    act(() => {
      useAuthStore.getState().clearIdentity();
    });
    expect(hook.result.current.controller).toBeUndefined();
  });
  it("does not start a search after related-profile completion when the editing session already unmounted", async () => {
    let finish: (value: { profiles: [] }) => void = () => {};
    vi.spyOn(profilesApi, "fetchWikiRelatedProfiles").mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const search = vi.spyOn(materialApi, "searchWikiFreeMaterials");
    const hook = await ready(() => ({
      ...draft,
      basic: { ...draft.basic, agencyIdentifier: id },
    }));
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    hook.unmount();
    await act(async () => {
      finish({ profiles: [] });
    });
    expect(search).not.toHaveBeenCalled();
  });
  it("keeps idle/empty/failure out of leave guards, supports loading and retry, retains prior successful results on failure", async () => {
    const search = vi
      .spyOn(materialApi, "searchWikiFreeMaterials")
      .mockRejectedValueOnce(new Error("secret"))
      .mockResolvedValueOnce({ sites: [] })
      .mockResolvedValueOnce({ sites: [site] })
      .mockRejectedValueOnce(new Error("secret"));
    const hook = await ready();
    expect(hook.result.current.hasRetainedResults).toBe(false);
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    expect(hook.result.current.controller?.isSearching).toBe(true);
    await waitFor(() =>
      expect(hook.result.current.controller?.error).toBeTruthy(),
    );
    expect(hook.result.current.controller?.error).not.toContain("secret");
    expect(hook.result.current.hasRetainedResults).toBe(false);
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    await waitFor(() =>
      expect(hook.result.current.controller?.result?.sites).toEqual([]),
    );
    expect(hook.result.current.hasRetainedResults).toBe(false);
    act(() => {
      hook.result.current.controller?.onSearch();
      hook.result.current.controller?.onSearch();
    });
    await waitFor(() =>
      expect(hook.result.current.hasRetainedResults).toBe(true),
    );
    expect(search).toHaveBeenCalledTimes(3);
    hook.rerender({ open: false });
    hook.rerender({ open: true });
    expect(hook.result.current.hasRetainedResults).toBe(true);
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    await waitFor(() =>
      expect(hook.result.current.controller?.error).toBeTruthy(),
    );
    expect(hook.result.current.hasRetainedResults).toBe(true);
    expect(hook.result.current.controller?.result?.context.language).toBe("ko");
    hook.unmount();
    const next = await ready();
    expect(next.result.current.hasRetainedResults).toBe(false);
  });
  it("re-reads edited relationships, completes missing names only and keeps removals", async () => {
    let edited: WikiDraftDetail = {
      ...draft,
      basic: { ...draft.basic, agencyIdentifier: id },
    };
    const search = vi
      .spyOn(materialApi, "searchWikiFreeMaterials")
      .mockResolvedValue({ sites: [] });
    const profiles = vi
      .spyOn(profilesApi, "fetchWikiRelatedProfiles")
      .mockResolvedValue({
        profiles: [
          {
            wikiIdentifier: id,
            name: "Agency",
            resourceType: "agency",
            language: "ja",
            slug: "ag-agency",
            normalizedName: "agency",
            imageIdentifier: null,
            imageUrl: null,
            imageAltText: null,
          },
        ],
      });
    const hook = await ready(() => edited);
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedWikis: [
            {
              identifier: id,
              title: "Agency",
              resourceType: "agency",
              relationType: "agency",
            },
          ],
        }),
        expect.any(String),
      ),
    );
    await waitFor(() =>
      expect(hook.result.current.controller?.isSearching).toBe(false),
    );
    edited = {
      ...draft,
      title: "Edited again",
      basic: { ...draft.basic, agencyIdentifier: null },
    };
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ title: "Edited again", relatedWikis: [] }),
        expect.any(String),
      ),
    );
    expect(profiles).toHaveBeenCalledTimes(1);
  });
  it("prompts for an empty title and display name without calling search", async () => {
    const search = vi.spyOn(materialApi, "searchWikiFreeMaterials");
    const hook = await ready(() => ({
      ...draft,
      title: " ",
      basic: { ...draft.basic, name: " " },
    }));
    act(() => {
      hook.result.current.controller?.onSearch();
    });
    expect(hook.result.current.controller?.error).toContain("タイトル");
    expect(search).not.toHaveBeenCalled();
  });
  it.each([
    { policies: [] },
    {
      policies: [
        {
          ...principal.policies[0],
          statements: [
            { ...principal.policies[0].statements[0], effect: "deny" },
          ],
        },
      ],
    },
  ])(
    "hides the search controller without a permitted principal",
    async ({ policies }) => {
      vi.mocked(principalApi.getCurrentWikiPrincipal).mockResolvedValue({
        status: "available",
        principal: { ...principal, policies },
      });
      const hook = renderHook(() =>
        useWikiMaterialSearch(draft, true, () => draft),
      );
      await waitFor(() =>
        expect(principalApi.getCurrentWikiPrincipal).toHaveBeenCalled(),
      );
      expect(hook.result.current.controller).toBeUndefined();
    },
  );
});
