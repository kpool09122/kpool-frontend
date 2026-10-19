import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { QueryProvider } from "../QueryProvider";
import type { WikiPrincipalState } from "@/gateways/wiki/wikiPrincipal";
import { useAdminWikiPrincipal } from "./useAdminWikiPrincipal";
import { AdminProvider, useAdmin } from "./AdminProvider";
import { AdminRouteProvider } from "./AdminRouteProvider";
import { getAdminAccountScope } from "./accountScope";
import type { AdminRouteData } from "./adminTypes";

const original: AuthenticatedIdentitySummary = {
  identityIdentifier: "identity-1", identityName: "member", email: "member@example.com", language: "ja",
  accountIdentifier: "account-a", accountPrincipalIdentifier: "principal-a", delegationIdentifier: null,
};
const delegated: AuthenticatedIdentitySummary = {
  ...original, accountIdentifier: "account-b", accountPrincipalIdentifier: "principal-b", delegationIdentifier: "delegation-b",
};
function CachedScreen({ snapshot }: { snapshot: string }) {
  const { data } = useQuery({ queryKey: ["admin", "same-list-key"], queryFn: async () => snapshot, enabled: false, initialData: snapshot, staleTime: Infinity });
  const [draft, setDraft] = useState("");
  return <><p>{data}</p><input aria-label="draft" value={draft} onChange={(event) => setDraft(event.target.value)} /></>;
}
const routeData = (identity: AuthenticatedIdentitySummary): AdminRouteData => ({
  accountScope: getAdminAccountScope(identity), initialPrincipalState: { status: "missing" },
  initialDraftWikis: { editingWikis: emptyWikis, submittedWikis: emptyWikis, unapprovedWikis: emptyWikis, approvedWikis: emptyWikis, untranslatedWikis: emptyWikis },
  initialDraftImages: { images: [], isInitialLoading: false, isLoadingMore: false, loadError: null, pageInfo: null },
  initialImageDeletionRequests: { images: [], isInitialLoading: false, isLoadingMore: false, loadError: null, pageInfo: null },
});
const emptyWikis = { wikis: [], isInitialLoading: false, isLoadingMore: false, loadError: null, pageInfo: null };

beforeEach(() => useAuthStore.setState({ ...useAuthStore.getInitialState(), identity: original, status: "authenticated" }, true));
afterEach(() => { cleanup(); useAuthStore.setState(useAuthStore.getInitialState(), true); });

describe("admin account switching", () => {

  it("waits for the server snapshot and resets cached data and draft state in both directions", async () => {
    const view = render(<AdminProvider initialIdentity={original}><CachedScreen snapshot="original permissions" /></AdminProvider>);
    fireEvent.change(screen.getByLabelText("draft"), { target: { value: "original draft" } });
    act(() => useAuthStore.setState({ identity: delegated }));
    expect(screen.queryByText("original permissions")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("切り替え中");
    view.rerender(<AdminProvider initialIdentity={delegated}><CachedScreen snapshot="delegated permissions" /></AdminProvider>);
    await screen.findByText("delegated permissions");
    expect(screen.getByLabelText("draft")).toHaveValue("");
    act(() => useAuthStore.setState({ identity: original }));
    view.rerender(<AdminProvider initialIdentity={original}><CachedScreen snapshot="updated original permissions" /></AdminProvider>);
    await screen.findByText("updated original permissions");
    expect(screen.queryByText("delegated permissions")).not.toBeInTheDocument();
  });

  it("does not hydrate the new account with a stale page snapshot when layout and page arrive separately", async () => {
    useAuthStore.setState({ identity: delegated });
    const view = render(<AdminProvider initialIdentity={delegated}><AdminRouteProvider value={routeData(original)}><CachedScreen snapshot="stale original list" /></AdminRouteProvider></AdminProvider>);
    expect(screen.queryByText("stale original list")).not.toBeInTheDocument();
    view.rerender(<AdminProvider initialIdentity={delegated}><AdminRouteProvider value={routeData(delegated)}><CachedScreen snapshot="delegated list" /></AdminRouteProvider></AdminProvider>);
    await screen.findByText("delegated list");
  });

  it("recovers auth state from the refreshed server snapshot when auth/me retained the old account", async () => {
    const refreshIdentity = vi.fn().mockImplementation(async () => {
      useAuthStore.getState().setIdentity(delegated);
      return delegated;
    });
    useAuthStore.setState({ refreshIdentity });
    const view = render(<AdminProvider initialIdentity={original}><CachedScreen snapshot="original" /></AdminProvider>);
    view.rerender(<AdminProvider initialIdentity={delegated}><CachedScreen snapshot="delegated" /></AdminProvider>);
    await screen.findByText("delegated");
    expect(useAuthStore.getState().identity).toEqual(delegated);
    expect(refreshIdentity).toHaveBeenCalledWith({ preserveOnNull: true });
  });

  it("ignores an old account response that arrives after switching", async () => {
    let resolveOriginal!: (value: string) => void;
    const fetchData = vi.fn().mockImplementationOnce(() => new Promise<string>((resolve) => { resolveOriginal = resolve; })).mockResolvedValue("new account list");
    function AsyncScreen() {
      const { data } = useQuery({ queryKey: ["admin", "list"], queryFn: fetchData });
      return <p>{data ?? "loading"}</p>;
    }
    const view = render(<AdminProvider initialIdentity={original}><AsyncScreen /></AdminProvider>);
    await waitFor(() => expect(fetchData).toHaveBeenCalledTimes(1));
    act(() => useAuthStore.setState({ identity: delegated }));
    view.rerender(<AdminProvider initialIdentity={delegated}><AsyncScreen /></AdminProvider>);
    await screen.findByText("new account list");
    await act(async () => resolveOriginal("old account list"));
    expect(screen.queryByText("old account list")).not.toBeInTheDocument();
    expect(screen.getByText("new account list")).toBeInTheDocument();
  });

  it("hides the delegated snapshot after logout and shows only the original account after relogin", async () => {
    useAuthStore.getState().setIdentity(delegated);
    const view = render(<AdminProvider initialIdentity={delegated}><CachedScreen snapshot="delegated cache" /></AdminProvider>);
    expect(screen.getByText("delegated cache")).toBeInTheDocument();
    act(() => useAuthStore.getState().clearIdentity());
    expect(screen.queryByText("delegated cache")).not.toBeInTheDocument();
    act(() => useAuthStore.getState().setIdentity(original));
    expect(screen.queryByText("delegated cache")).not.toBeInTheDocument();
    view.rerender(<AdminProvider initialIdentity={original}><CachedScreen snapshot="original after login" /></AdminProvider>);
    await screen.findByText("original after login");
    expect(useAuthStore.getState().identity).toEqual(original);
  });

  it("does not overwrite fresh login identity with an old server snapshot", async () => {
    const refreshIdentity = vi.fn().mockResolvedValue(original);
    useAuthStore.setState({ refreshIdentity });
    const view = render(<AdminProvider initialIdentity={original}><CachedScreen snapshot="original" /></AdminProvider>);
    view.rerender(<AdminProvider initialIdentity={delegated}><CachedScreen snapshot="stale delegated" /></AdminProvider>);
    await waitFor(() => expect(refreshIdentity).toHaveBeenCalled());
    expect(useAuthStore.getState().identity).toEqual(original);
    expect(screen.queryByText("stale delegated")).not.toBeInTheDocument();
    view.rerender(<AdminProvider initialIdentity={original}><CachedScreen snapshot="fresh original" /></AdminProvider>);
    await screen.findByText("fresh original");
  });

  it("resets the query cache even when relogin uses the same account and logout was batched", () => {
    const view = render(<QueryProvider><CachedScreen snapshot="old session cache" /></QueryProvider>);
    expect(screen.getByText("old session cache")).toBeInTheDocument();
    act(() => {
      useAuthStore.getState().clearIdentity();
      useAuthStore.getState().setIdentity(original);
      view.rerender(<QueryProvider><CachedScreen snapshot="new session data" /></QueryProvider>);
    });
    expect(screen.getByText("new session data")).toBeInTheDocument();
    expect(screen.queryByText("old session cache")).not.toBeInTheDocument();
  });

});


const principalSnapshot = (status: "active" | "suspended"): WikiPrincipalState => ({
  status: "available", principal: { principalIdentifier: "wiki-user", identityIdentifier: "actor", status, policies: [], accountPrincipalCount: 1, isDelegatedPrincipal: false },
});
function SharedPrincipalView() {
  const { principalState } = useAdmin();
  return <p data-testid="shared-principal">{principalState.status === "available" ? principalState.principal.status : principalState.status}</p>;
}

it("hydrates newer route snapshots into the shared cache and ignores older snapshots", async () => {
  const initial = principalSnapshot("active");
  const data = { ...routeData(original), initialPrincipalState: initial, principalStateUpdatedAt: 200 };
  const view = render(<AdminProvider initialIdentity={original} initialPrincipalState={initial} principalStateUpdatedAt={100}>
    <AdminRouteProvider value={data}><SharedPrincipalView /></AdminRouteProvider>
  </AdminProvider>);
  expect(screen.getByTestId("shared-principal")).toHaveTextContent("active");
  view.rerender(<AdminProvider initialIdentity={original} initialPrincipalState={initial} principalStateUpdatedAt={100}>
    <AdminRouteProvider value={{ ...data, initialPrincipalState: principalSnapshot("suspended"), principalStateUpdatedAt: 300 }}><SharedPrincipalView /></AdminRouteProvider>
  </AdminProvider>);
  await waitFor(() => expect(screen.getByTestId("shared-principal")).toHaveTextContent("suspended"));
  view.rerender(<AdminProvider initialIdentity={original} initialPrincipalState={initial} principalStateUpdatedAt={100}>
    <AdminRouteProvider value={{ ...data, principalStateUpdatedAt: 250 }}><SharedPrincipalView /></AdminRouteProvider>
  </AdminProvider>);
  expect(screen.getByTestId("shared-principal")).toHaveTextContent("suspended");
});


it("shares the initial Wiki snapshot and one explicit refresh with the Wiki screen", async () => {
  const getCurrentPrincipal = vi.fn().mockResolvedValue(principalSnapshot("suspended"));
  const createPrincipal = vi.fn();
  function WikiScreen() {
    const { principalState, loadCurrentPrincipal } = useAdminWikiPrincipal({
      adapter: { getCurrentPrincipal, createPrincipal }, initialIdentity: original,
      initialPrincipalState: { status: "idle" }, messages: { accountUnavailableMessage: "account", identityUnavailableMessage: "identity" },
      onPrincipalReady: vi.fn(), refreshIdentity: vi.fn(),
    });
    return <><p data-testid="wiki-principal">{principalState.status === "available" ? principalState.principal.status : principalState.status}</p><button onClick={() => void loadCurrentPrincipal()}>refresh Wiki</button></>;
  }
  function Screens() {
    const [wikiOpen, setWikiOpen] = useState(false);
    return <><SharedPrincipalView /><button onClick={() => setWikiOpen(true)}>open Wiki</button>{wikiOpen ? <WikiScreen /> : null}</>;
  }
  render(<AdminProvider initialIdentity={original} initialPrincipalState={principalSnapshot("active")}><Screens /></AdminProvider>);
  expect(screen.getByTestId("shared-principal")).toHaveTextContent("active");
  fireEvent.click(screen.getByRole("button", { name: "open Wiki" }));
  expect(screen.getByTestId("wiki-principal")).toHaveTextContent("active");
  expect(getCurrentPrincipal).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "refresh Wiki" }));
  await waitFor(() => {
    expect(screen.getByTestId("shared-principal")).toHaveTextContent("suspended");
    expect(screen.getByTestId("wiki-principal")).toHaveTextContent("suspended");
  });
  expect(getCurrentPrincipal).toHaveBeenCalledTimes(1);
});
