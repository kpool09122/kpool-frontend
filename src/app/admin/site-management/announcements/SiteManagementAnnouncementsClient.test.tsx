import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { SiteManagementAnnouncementsClient } from "./SiteManagementAnnouncementsClient";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  refresh: vi.fn(),
  identity: {
    identityIdentifier: "identity",
    accountIdentifier: "account",
    account: { status: "active" },
    siteManagementPrincipalIdentifier: "principal",
    siteManagementPolicies: [
      {
        statements: [
          {
            actions: [
              "announcement:view-draft",
              "announcement:create",
              "announcement:update",
              "announcement:translate",
              "announcement:delete",
              "announcement:publish",
            ],
            resourceTypes: ["announcement"],
            condition: null,
            effect: "allow",
          },
        ],
      },
    ],
  },
}));
vi.mock("../../AdminProvider", () => ({
  useAdmin: () => ({
    currentIdentity: mocks.identity,
    locale: "ja",
    refreshIdentity: mocks.refresh,
  }),
}));
vi.mock("@/gateways/site-management/announcements", async (original) => ({
  ...(await original<
    typeof import("@/gateways/site-management/announcements")
  >()),
  announcementRequest: mocks.request,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const draft = {
  announcementIdentifier: "019b0000-0000-7000-8000-000000000001",
  sourceLanguage: "ja",
  category: 1,
  contents: { ja: { title: "タイトル", content: "本文" } },
};
const list = {
  announcements: [draft],
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 1,
};
it("blocks duplicate mutation calls while one is pending", async () => {
  let resolveSave!: (value: unknown) => void;
  mocks.request.mockImplementation(
    (path: string, _schema: unknown, method: string) =>
      method === "PUT"
        ? new Promise((resolve) => {
            resolveSave = resolve;
          })
        : Promise.resolve(path.includes("?page=") ? list : draft),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SiteManagementAnnouncementsClient />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "タイトル" }));
  fireEvent.change(await screen.findByLabelText("タイトル"), {
    target: { value: "編集" },
  });
  const save = screen.getByRole("button", { name: "保存" });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(
    mocks.request.mock.calls.filter((call) => call[2] === "PUT"),
  ).toHaveLength(1);
  resolveSave(draft);
  await screen.findByText("保存しました。");
});
it("stops stale editing and refreshes permissions on a forbidden mutation", async () => {
  mocks.refresh.mockResolvedValue(mocks.identity);
  mocks.request.mockImplementation(
    (path: string, _schema: unknown, method: string) =>
      method === "POST"
        ? Promise.reject(Object.assign(new Error("forbidden"), { status: 403 }))
        : Promise.resolve(path.includes("?page=") ? list : draft),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SiteManagementAnnouncementsClient />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "タイトル" }));
  fireEvent.click(await screen.findByRole("button", { name: "翻訳" }));
  await waitFor(() =>
    expect(screen.queryByLabelText("タイトル")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("閲覧権限がありません");
  expect(mocks.refresh).toHaveBeenCalled();
});
it("discards pending old-actor draft reads after an account switch", async () => {
  let resolveDetail!: (value: unknown) => void;
  mocks.request.mockImplementation((path: string) =>
    path.includes("?page=")
      ? Promise.resolve(list)
      : new Promise((resolve) => {
          resolveDetail = resolve;
        }),
  );
  const client = new QueryClient();
  const view = () => (
    <QueryClientProvider client={client}>
      <SiteManagementAnnouncementsClient />
    </QueryClientProvider>
  );
  const { rerender } = render(view());
  fireEvent.click(await screen.findByRole("button", { name: "タイトル" }));
  const before = mocks.identity.accountIdentifier;
  mocks.identity.accountIdentifier = "another-account";
  rerender(view());
  resolveDetail(draft);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "新規作成" }),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByLabelText("タイトル")).not.toBeInTheDocument();
  mocks.identity.accountIdentifier = before;
});
it("loads authoritative draft, preserves editing on translation failure, then clears feedback on close", async () => {
  mocks.request.mockImplementation(
    (path: string, _schema: unknown, method: string) =>
      path === "draft-announcements?page=1"
        ? Promise.resolve(list)
        : path.endsWith("/translate")
          ? Promise.reject(new Error("failed"))
          : Promise.resolve(
              method === "PUT"
                ? {
                    ...draft,
                    contents: { ja: { title: "編集", content: "本文" } },
                  }
                : draft,
            ),
  );
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <SiteManagementAnnouncementsClient />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "タイトル" }));
  fireEvent.click(await screen.findByRole("button", { name: "翻訳" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("失敗");
  expect(screen.getByLabelText("タイトル")).toHaveValue("タイトル");
  fireEvent.change(screen.getByLabelText("タイトル"), {
    target: { value: "編集" },
  });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith(
      expect.stringContaining(draft.announcementIdentifier),
      expect.anything(),
      "PUT",
      expect.objectContaining({ title: "編集", language: "ja" }),
    ),
  );
  expect(await screen.findByText("保存しました。")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
  expect(screen.getByRole("button", { name: "新規作成" })).toBeInTheDocument();
  expect(screen.queryByText("保存しました。")).not.toBeInTheDocument();
});
