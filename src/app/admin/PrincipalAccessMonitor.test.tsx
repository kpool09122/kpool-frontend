import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PrincipalAccessMonitor } from "./PrincipalAccessMonitor";
import { useAuthStore } from "@/gateways/auth/authStore";
import { dictionaries } from "@/i18n/dictionaries";
import { adminQueryKeys } from "./queryKeys";
const api = vi.hoisted(() => ({
  principal: vi.fn(),
  path: "/admin/wiki/editing",
}));
vi.mock("next/navigation", () => ({ usePathname: () => api.path }));
vi.mock("@/gateways/wiki/wikiPrincipal", () => ({
  getCurrentWikiPrincipal: api.principal,
}));
const identity = {
  identityIdentifier: "actor",
  accountIdentifier: "account",
  identityName: "User",
  email: "u@example.test",
  language: "ja",
  accountPrincipalStatus: "active" as const,
};
const signal = () =>
  window.dispatchEvent(
    new CustomEvent("kpool:principal-inactive", {
      detail: { path: "/api/wiki/draft-wikis" },
    }),
  );
beforeEach(() => {
  api.path = "/admin/wiki/editing";
  api.principal.mockReset().mockResolvedValue({
    status: "available",
    principal: { status: "suspended" },
  });
  useAuthStore.setState({ identity, sessionVersion: 1 });
});
afterEach(() => {
  cleanup();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});
function mount(refresh = vi.fn().mockResolvedValue(identity)) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <PrincipalAccessMonitor
        identity={identity}
        refreshIdentity={refresh}
        t={dictionaries.ja.admin}
      >
        <p>protected children</p>
      </PrincipalAccessMonitor>
    </QueryClientProvider>,
  );
  return { client, refresh };
}
it("locks stale tools immediately and refreshes both auth and Wiki principal caches", async () => {
  let resolve!: (value: typeof identity) => void;
  const refresh = vi.fn().mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { client } = mount(refresh);
  act(signal);
  expect(screen.queryByText("protected children")).not.toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(dictionaries.ja.admin.principalStatus.inactive);
  await act(async () => resolve(identity));
  expect(refresh).toHaveBeenCalledWith({ preserveOnNull: true });
  expect(api.principal).toHaveBeenCalledTimes(1);
  expect(
    client.getQueryData(adminQueryKeys.principal.current("actor", "account")),
  ).toMatchObject({ principal: { status: "suspended" } });
});
it("keeps stale tools locked with only a message when identity cannot be confirmed", async () => {
  mount(vi.fn().mockResolvedValue(null));
  act(signal);
  await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
  expect(screen.queryByText("protected children")).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(api.principal).not.toHaveBeenCalled();
});
it("does not overwrite principal cache with an old-session response", async () => {
  let resolve!: (value: unknown) => void;
  api.principal.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { client } = mount();
  act(signal);
  await waitFor(() => expect(api.principal).toHaveBeenCalledTimes(1));
  useAuthStore.setState({ sessionVersion: 2 });
  await act(async () =>
    resolve({ status: "available", principal: { status: "active" } }),
  );
  expect(
    client.getQueryData(adminQueryKeys.principal.current("actor", "account")),
  ).toBeUndefined();
});
it("does not block user settings after an ambiguous refresh", async () => {
  api.path = "/admin/user/profile";
  const { refresh } = mount(vi.fn().mockResolvedValue(null));
  act(signal);
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(screen.getByText("protected children")).toBeVisible();
});
