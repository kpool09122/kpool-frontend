import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAuthStore } from "@/gateways/auth/authStore";
import { AnalyzeClient } from "./AnalyzeClient";
vi.mock("./AnalyzeDashboard", () => ({ AnalyzeDashboard: () => <section aria-label="分析レポート" /> }));
const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  fetch: vi.fn(),
  identity: {
    identityIdentifier: "22222222-2222-4222-8222-222222222222",
    accountIdentifier: "account-a",
    accountPrincipalIdentifier: "account-principal",
    identityName: "User",
    email: "u@example.test",
    language: "ja",
    account: { status: "active" },
    accountPrincipalStatus: "active" as const,
  },
}));
vi.mock("../AdminProvider", () => ({
  useAdmin: () => ({
    currentIdentity: mocks.identity,
    t: dictionaries.ja.admin,
    locale: "ja",
    refreshIdentity: mocks.refresh,
  }),
}));
vi.mock("@/gateways/support/browserApiFetch", () => ({
  browserApiFetch: (...args: unknown[]) => mocks.fetch(...args),
}));
const principal = {
  principalIdentifier: "11111111-1111-4111-8111-111111111111",
  identityIdentifier: mocks.identity.identityIdentifier,
  status: "active",
  policies: [
    {
      policyIdentifier: "33333333-3333-4333-8333-333333333333",
      name: "General",
      statements: [
        {
          effect: "allow",
          actions: ["analysis:view"],
          resourceTypes: ["analysis"],
        },
      ],
    },
  ],
};
const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <AnalyzeClient />
    </QueryClientProvider>,
  );
beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.refresh.mockReset().mockImplementation(async () => {
    useAuthStore.setState({ status: "loading" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    useAuthStore.setState({ status: "authenticated" });
    return mocks.identity;
  });
  useAuthStore.setState({
    status: "authenticated",
    identity: mocks.identity,
    sessionVersion: 0,
  });
});
afterEach(cleanup);
describe("Analyze enrollment", () => {
  it("enrolls only after 404, refreshes identity and authoritative principal", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json(principal, { status: 201 }))
      .mockImplementation(async () => Response.json(principal));
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "分析サービスの利用を開始" }),
    );
    await screen.findByRole("region", { name: "分析レポート" });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/analyze/principal/me",
      "/api/analyze/principals",
      "/api/analyze/principal/me",
    ]);
  });
  it.each(["suspended", "forced_stop", "denied", "no-policy", "403"])(
    "does not offer enrollment for %s",
    async (mode) => {
      mocks.fetch.mockResolvedValue(
        Response.json(
          mode === "403"
            ? {}
            : {
                ...principal,
                status:
                  mode === "suspended" || mode === "forced_stop"
                    ? mode
                    : "active",
                policies:
                  mode === "no-policy"
                    ? []
                    : mode === "denied"
                      ? [
                          {
                            ...principal.policies[0],
                            statements: [
                              ...principal.policies[0].statements,
                              {
                                effect: "deny",
                                actions: ["analysis:view"],
                                resourceTypes: ["analysis"],
                              },
                            ],
                          },
                        ]
                      : principal.policies,
              },
          { status: mode === "403" ? 403 : 200 },
        ),
      );
      renderPage();
      await screen.findByRole("alert");
      expect(
        screen.queryByRole("button", { name: "分析サービスの利用を開始" }),
      ).not.toBeInTheDocument();
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it("recovers duplicate enrollment by reading, without restoring permissions", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json({}, { status: 409 }))
      .mockResolvedValue(Response.json({ ...principal, policies: [] }));
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "分析サービスの利用を開始" }),
    );
    await screen.findByText(
      "すでに有効化されています。現在の権限を確認しました。",
    );
    expect(
      screen.queryByRole("button", { name: "分析サービスの利用を開始" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("権限");
  });
  it("allows retry after activation failure", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(Response.json(principal, { status: 201 }))
      .mockImplementation(async () => Response.json(principal));
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "分析サービスの利用を開始" }),
    );
    await screen.findByRole("alert");
    fireEvent.click(
      screen.getByRole("button", { name: "分析サービスの利用を開始" }),
    );
    await screen.findByRole("region", { name: "分析レポート" });
  });
  it("ignores a late activation result after account switch", async () => {
    let finish: (value: Response) => void = () => {};
    mocks.fetch
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      );
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "分析サービスの利用を開始" }),
    );
    useAuthStore.setState({
      identity: { ...mocks.identity, accountIdentifier: "account-b" },
    });
    finish(Response.json(principal, { status: 201 }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "有効化しています…" }),
      ).not.toBeInTheDocument(),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it("initializes a fresh browser identity before requesting Analyze", async () => {
    useAuthStore.setState({
      identity: null,
      status: "loading",
      sessionVersion: 0,
    });
    mocks.refresh.mockImplementation(async () => {
      useAuthStore.setState({
        identity: mocks.identity,
        status: "authenticated",
      });
      return mocks.identity;
    });
    mocks.fetch.mockImplementation(async () => Response.json(principal));
    renderPage();
    await screen.findByRole("region", { name: "分析レポート" });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("does not confuse committed enrollment with a failed status refresh", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json(principal, { status: 201 }))
      .mockResolvedValueOnce(Response.json({}, { status: 503 }))
      .mockImplementation(async () => Response.json(principal));
    const view = renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "分析サービスの利用を開始" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "有効化の処理後",
    );
    expect(
      screen.queryByRole("button", { name: "分析サービスの利用を開始" }),
    ).not.toBeInTheDocument();
    view.unmount();
    renderPage();
    await screen.findByRole("region", { name: "分析レポート" });
    expect(
      mocks.fetch.mock.calls.filter(
        ([url]) => url === "/api/analyze/principals",
      ),
    ).toHaveLength(1);
  });
  it("keeps reports unavailable after a failed identity refresh without re-enrolling", async () => {
    mocks.refresh.mockResolvedValueOnce(null).mockResolvedValue(mocks.identity);
    mocks.fetch
      .mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json(principal, { status: 201 }))
      .mockImplementation(async () => Response.json(principal));
    renderPage();
    fireEvent.click(
      await screen.findByRole("button", { name: "分析サービスの利用を開始" }),
    );
    await screen.findByRole("alert");
    expect(screen.queryByRole("region", { name: "分析レポート" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "分析サービスの利用を開始" })).not.toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
  it("loads the new account enrollment state instead of reusing the old account cache", async () => {
    mocks.fetch
      .mockResolvedValueOnce(Response.json(principal))
      .mockResolvedValueOnce(Response.json({}, { status: 404 }));
    renderPage();
    await screen.findByRole("region", { name: "分析レポート" });
    const previous = mocks.identity;
    mocks.identity = { ...previous, accountIdentifier: "account-b" };
    useAuthStore.setState({ identity: mocks.identity });
    await screen.findByRole("button", { name: "分析サービスの利用を開始" });
    expect(screen.queryByRole("region", { name: "分析レポート" })).not.toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    mocks.identity = previous;
  });
  it("hides previous account data during identity switch", async () => {
    mocks.fetch.mockImplementation(async () => Response.json(principal));
    renderPage();
    await screen.findByRole("region", { name: "分析レポート" });
    useAuthStore.setState({
      identity: { ...mocks.identity, accountIdentifier: "account-b" },
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "分析レポート" }),
      ).not.toBeInTheDocument(),
    );
  });
});
