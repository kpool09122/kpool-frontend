import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dictionaries } from "@/i18n/dictionaries";
import { useAuthStore } from "@/gateways/auth/authStore";
import {
  appReport,
  wikiReport,
} from "../../../../tests/fixtures/analyzeReports";
import { AnalyzeClient } from "./AnalyzeClient";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  refresh: vi.fn(),
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
beforeEach(() => {
  mocks.fetch.mockReset();
  useAuthStore.setState({
    status: "authenticated",
    identity: mocks.identity,
    sessionVersion: 0,
  });
});
afterEach(cleanup);
it("cancels in-flight reports on Account switch and ignores their late results", async () => {
  let finish: (response: Response) => void = () => {};
  let oldSignal: AbortSignal | undefined;
  mocks.fetch.mockImplementation(async (url: string, options?: RequestInit) => {
    if (url.includes("/principal/me")) return Response.json(principal);
    if (url.includes("/app/")) return Response.json(appReport);
    if (mocks.identity.accountIdentifier === "account-a") {
      oldSignal = options?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        finish = resolve;
      });
    }
    return Response.json({
      ...wikiReport,
      views: { ...wikiReport.views, total: "777" },
    });
  });
  const client = new QueryClient();
  const view = render(
    <QueryClientProvider client={client}>
      <AnalyzeClient />
    </QueryClientProvider>,
  );
  await screen.findByRole("region", { name: "延べ利用者数" });
  await waitFor(() => expect(oldSignal).toBeDefined());
  const previous = mocks.identity;
  mocks.identity = { ...previous, accountIdentifier: "account-b" };
  await act(async () => {
    useAuthStore.setState({ identity: mocks.identity });
  });
  view.rerender(
    <QueryClientProvider client={client}>
      <AnalyzeClient />
    </QueryClientProvider>,
  );
  const views = await screen.findByRole("region", {
    name: "閲覧回数",
  });
  expect(within(views).getByTestId("metric-total")).toHaveTextContent("777");
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => {
    finish(Response.json(wikiReport));
  });
  expect(within(views).getByTestId("metric-total")).toHaveTextContent("777");
  expect(
    mocks.fetch.mock.calls.filter(([url]) =>
      String(url).includes("/wiki/daily-summary"),
    ),
  ).toHaveLength(2);
  mocks.identity = previous;
  client.clear();
});
it("shows stored metrics without inferring an import failure from timestamps", async () => {
  mocks.fetch.mockImplementation(async (url: string) =>
    Response.json(
      url.includes("/principal/me")
        ? principal
        : url.includes("/app/")
          ? appReport
          : wikiReport,
    ),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AnalyzeClient />
    </QueryClientProvider>,
  );
  const views = await screen.findByRole("region", {
    name: "閲覧回数",
  });
  expect(within(views).getByTestId("metric-total")).toHaveTextContent("9,007,199,254,740,993");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("starts and resets the globe facing the visitor country", async () => {
  mocks.fetch.mockImplementation(async (url: string) => Response.json(
    url.includes("/principal/me") ? principal : url.includes("/app/") ? appReport : wikiReport,
  ));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AnalyzeClient initialCountry="BR" />
    </QueryClientProvider>,
  );
  const globe = await screen.findByRole("group", { name: "国別の地球儀" });
  expect(within(globe).getByRole("button", { name: /\(BR\):/ })).toBeInTheDocument();
  expect(within(globe).queryByRole("button", { name: /\(JP\):/ })).not.toBeInTheDocument();
  const original = globe.getAttribute("data-rotation");
  fireEvent.keyDown(globe, { key: "ArrowRight" });
  expect(globe.getAttribute("data-rotation")).not.toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "表示をリセット" }));
  expect(globe).toHaveAttribute("data-rotation", original);
});
