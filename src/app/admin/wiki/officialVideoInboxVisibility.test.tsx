import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuthStore } from "@/gateways/auth/authStore";
import { useOfficialVideoWikis } from "@/gateways/wiki/useOfficialVideoWikis";
import { dictionaries } from "@/i18n/dictionaries";
import { WikiLayoutClient } from "./WikiLayoutClient";

const t = dictionaries.ja.admin;
const identity = { identityIdentifier: "identity-1", identityName: "member", email: "member@example.com", language: "ja", accountIdentifier: "owner" };
const wiki = { wikiIdentifier: "00000000-0000-4000-8000-000000000001", name: "Owner", language: "ja", slug: "ta-owner", resourceType: "talent" };
const fetcher = vi.fn();

beforeEach(() => {
  useAuthStore.setState({ status: "authenticated", identity, sessionVersion: 1 });
  fetcher.mockReset();
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  vi.unstubAllGlobals();
});

function Menu({ active = true, initialIdentity }: { active?: boolean; initialIdentity?: typeof identity }) {
  const { canViewOfficialVideoInbox, query } = useOfficialVideoWikis({ active, initialIdentity });
  return <>
    <output data-testid="query-status">{query.status}</output>
    <WikiLayoutClient
      canViewOfficialVideoInbox={canViewOfficialVideoInbox}
      isAuthenticated isPending={false} selectedWikiTab="editingWikis"
      state={{ status: "available", principal: { status: "active", isDelegatedPrincipal: false, accountPrincipalCount: 1, principalIdentifier: "wiki-user", identityIdentifier: identity.identityIdentifier, policies: [] } }}
      t={t} onActivate={vi.fn()} onRetry={vi.fn()} onOpenCreateDraftWiki={vi.fn()}
    >{() => null}</WikiLayoutClient>
  </>;
}
function mount(active = true, initialIdentity?: typeof identity) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Menu active={active} initialIdentity={initialIdentity} /></QueryClientProvider>);
}
const tab = () => screen.queryByRole("tab", { name: t.officialVideoInbox.title });

it("shows the tab only after eligible owned Wikis are confirmed", async () => {
  let resolve!: (value: Response) => void;
  fetcher.mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
  mount();
  expect(tab()).toBeNull();
  await act(async () => { resolve(Response.json({ wikis: [wiki] })); });
  await waitFor(() => expect(tab()).toBeVisible());
});
it.each([200, 401, 403, 502])("hides the tab for empty or unavailable eligibility (%s)", async (status) => {
  fetcher.mockResolvedValue(Response.json({ wikis: [] }, { status }));
  mount();
  await waitFor(() => expect(screen.getByTestId("query-status")).toHaveTextContent(status === 200 ? "success" : "error"));
  expect(tab()).toBeNull();
  expect(screen.getByRole("tab", { name: t.editingWikisTab })).toBeVisible();
});
it("hides the tab and skips fetching during delegation", () => {
  useAuthStore.setState({ identity: { ...identity, delegationIdentifier: "delegation-1" } });
  mount();
  expect(tab()).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it("skips eligibility fetching when the Wiki principal is unavailable", () => {
  mount(false);
  expect(tab()).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});
it("removes the previous account's tab immediately when the account changes", async () => {
  fetcher.mockResolvedValue(Response.json({ wikis: [wiki] }));
  mount();
  await waitFor(() => expect(tab()).toBeVisible());
  fetcher.mockImplementation(() => new Promise(() => {}));
  act(() => useAuthStore.setState({ identity: { ...identity, accountIdentifier: "other" } }));
  expect(tab()).toBeNull();
});

it("uses the server identity on initial load without refreshing authentication", async () => {
  const refreshIdentity = vi.fn();
  useAuthStore.setState({ status: "loading", identity: null, sessionVersion: 0, refreshIdentity });
  fetcher.mockResolvedValue(Response.json({ wikis: [wiki] }));
  mount(true, identity);
  await waitFor(() => expect(tab()).toBeVisible());
  expect(refreshIdentity).not.toHaveBeenCalled();
});
it("does not reuse the server identity after logout", async () => {
  fetcher.mockResolvedValue(Response.json({ wikis: [wiki] }));
  mount(true, identity);
  await waitFor(() => expect(tab()).toBeVisible());
  act(() => useAuthStore.getState().clearIdentity());
  expect(tab()).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
});
