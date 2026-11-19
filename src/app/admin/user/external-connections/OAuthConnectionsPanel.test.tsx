import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OAuthConnectionsPanel } from "./OAuthConnectionsPanel";
import { oauthConnectionsBrowserApi } from "@/gateways/identity/oauthConnectionsBrowserApi";
const connection = {
  connectionIdentifier: "11111111-1111-4111-8111-111111111111",
  clientIdentifier: "22222222-2222-4222-8222-222222222222",
  clientName: "ChatGPT",
  scopes: ["wiki-drafts:write"] as const,
  createdAt: "2026-11-01T00:00:00Z",
  revokedAt: null,
};
afterEach(cleanup);
function setup(overrides: Partial<typeof oauthConnectionsBrowserApi> = {}) {
  const api = {
    ...oauthConnectionsBrowserApi,
    settings: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { scopes: ["wiki:read"] } }),
    save: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    list: vi
      .fn()
      .mockResolvedValue({
        ok: true,
        data: {
          connections: [
            connection,
            {
              ...connection,
              connectionIdentifier: "33333333-3333-4333-8333-333333333333",
            },
          ],
        },
      }),
    revoke: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    ...overrides,
  };
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <OAuthConnectionsPanel
        identityIdentifier="owner"
        sessionVersion={0}
        api={api}
      />
    </QueryClientProvider>,
  );
  return api;
}
it("shows app logos and names without connection metadata or scopes", async () => {
  setup();
  await screen.findAllByRole("heading", { name: "ChatGPT" });
  const list = screen.getByRole("list");
  expect(within(list).getAllByRole("button", { name: "連携解除" })).toHaveLength(2);
  for (const logo of within(list).getAllByAltText("")) {
    expect(logo).toHaveAttribute("src", expect.stringContaining("ChatGPT-Logo.webp"));
  }
  expect(within(list).getAllByAltText("")).toHaveLength(2);
  expect(list).not.toHaveTextContent(connection.clientIdentifier);
  expect(list).not.toHaveTextContent(connection.connectionIdentifier);
  expect(list).not.toHaveTextContent("有効");
  expect(list).not.toHaveTextContent("作成日時");
  expect(list).not.toHaveTextContent("wiki-drafts:write");
  expect(within(list).queryByText(/作成・編集/)).not.toBeInTheDocument();
});
it("uses API defaults, saves empty scopes, and does not rewrite existing grants", async () => {
  const api = setup();
  const checkbox = await screen.findByRole("checkbox", { name: /公開 Wiki の取得/ });
  expect(checkbox).toBeChecked();
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(api.save).toHaveBeenCalledWith([], "ja"));
  expect(
    await screen.findByText("許可 Scope 設定を保存しました。"),
  ).toBeVisible();
  expect(
    screen.getAllByText(/作成・編集/),
  ).toHaveLength(1);
});
it("confirms and revokes only the selected connection when client names match", async () => {
  const api = setup();
  const buttons = await screen.findAllByRole("button", { name: "連携解除" });
  fireEvent.click(buttons[1]);
  const confirmation = screen.getByRole("group", { name: "連携解除の確認" });
  expect(
    within(confirmation).getByText("ChatGPT"),
  ).toBeVisible();
  expect(api.revoke).not.toHaveBeenCalled();
  fireEvent.click(
    within(confirmation).getByRole("button", { name: "解除する" }),
  );
  await waitFor(() =>
    expect(api.revoke).toHaveBeenCalledWith(
      "33333333-3333-4333-8333-333333333333",
      "ja",
    ),
  );
  expect(
    await screen.findByText(
      "連携を解除しました。この接続からの操作とトークン更新はできません。",
    ),
  ).toBeVisible();
});

it("shows ChatGPT as not connected and disables controls while loading API defaults", async () => {
  let resolve!: (value: unknown) => void;
  setup({
    settings: vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
    list: vi.fn().mockResolvedValue({ ok: true, data: { connections: [] } }),
  });
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(await screen.findByText("未連携")).toBeVisible();
  const row = screen.getByRole("listitem");
  expect(within(row).getByRole("heading", { name: "ChatGPT" })).toBeVisible();
  expect(within(row).getByAltText("")).toHaveAttribute("src", expect.stringContaining("ChatGPT-Logo.webp"));
  expect(within(row).queryByRole("button")).not.toBeInTheDocument();
  resolve({ ok: true, data: { scopes: [] } });
  await waitFor(() =>
    expect(
      screen
        .getAllByRole("checkbox")
        .every((input) => !(input as HTMLInputElement).checked),
    ).toBe(true),
  );
});
it("keeps the ChatGPT not-connected row when another app is connected", async () => {
  setup({
    list: vi.fn().mockResolvedValue({ ok: true, data: { connections: [{ ...connection, clientName: "Other app" }] } }),
  });
  await screen.findByRole("heading", { name: "Other app" });
  const chatgptRow = screen.getAllByRole("listitem").find((row) => within(row).queryByRole("heading", { name: "ChatGPT" }));
  expect(chatgptRow).toBeDefined();
  expect(within(chatgptRow!).getByText("未連携")).toBeVisible();
  expect(within(chatgptRow!).queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "連携解除" })).toHaveLength(1);
});
it.each([0, 403, 419, 422, 500])(
  "keeps the draft and existing grants on save failure %i",
  async (status) => {
    const api = setup({
      save: vi
        .fn()
        .mockResolvedValue({ ok: false, status, message: "private detail" }),
    });
    fireEvent.click(await screen.findByRole("checkbox", { name: /公開 Wiki の取得/ }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("通信に失敗");
    expect(
      screen.getByRole("checkbox", { name: /公開 Wiki の取得/ }),
    ).not.toBeChecked();
    expect(screen.queryByText("private detail")).not.toBeInTheDocument();
    expect(api.revoke).not.toHaveBeenCalled();
  },
);
it("shows save progress and prevents duplicate writes", async () => {
  let resolve!: (value: unknown) => void;
  const api = setup({
    save: vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
  });
  await screen.findByRole("checkbox", { name: /公開 Wiki の取得/ });
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
  expect(api.save).toHaveBeenCalledTimes(1);
  resolve({ ok: true, data: [] });
  expect(
    await screen.findByText("許可 Scope 設定を保存しました。"),
  ).toBeVisible();
});
it.each(["settings", "list", "save", "revoke"] as const)(
  "stops stale editing on expired %s",
  async (action) => {
    const failure = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, message: "private" });
    setup({ [action]: failure });
    if (action === "save") {
      await screen.findByRole("checkbox", { name: /公開 Wiki の取得/ });
      fireEvent.click(screen.getByRole("button", { name: "保存" }));
    }
    if (action === "revoke") {
      fireEvent.click(
        (await screen.findAllByRole("button", { name: "連携解除" }))[0],
      );
      fireEvent.click(screen.getByRole("button", { name: "解除する" }));
    }
    expect(
      await screen.findByText(
        "セッションが切れました。再度ログインしてください。",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("ChatGPT")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fadmin%2Fuser%2Fexternal-connections",
    );
  },
);
it("does not offer revocation for already-revoked rows", async () => {
  setup({
    list: vi
      .fn()
      .mockResolvedValue({
        ok: true,
        data: {
          connections: [{ ...connection, revokedAt: "2026-11-02T00:00:00Z" }],
        },
      }),
  });
  expect(await screen.findByText("未連携")).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "連携解除" }),
  ).not.toBeInTheDocument();
});
it("retains success and removes stale revoke controls when refetch fails after revocation", async () => {
  const list = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, data: { connections: [connection] } })
    .mockResolvedValue({ ok: false, status: 500, message: "private" });
  setup({ list });
  fireEvent.click(
    (await screen.findAllByRole("button", { name: "連携解除" }))[0],
  );
  fireEvent.click(screen.getByRole("button", { name: "解除する" }));
  expect(
    await screen.findByText(
      "連携を解除しました。この接続からの操作とトークン更新はできません。",
    ),
  ).toBeVisible();
  expect(await screen.findByRole("alert")).toHaveTextContent("通信に失敗");
  expect(
    screen.queryByRole("button", { name: "連携解除" }),
  ).not.toBeInTheDocument();
});
it.each([404, 500])(
  "handles revocation result %i and permits retry or cancellation",
  async (status) => {
    setup({
      revoke: vi
        .fn()
        .mockResolvedValue({ ok: false, status, message: "private" }),
    });
    fireEvent.click(
      (await screen.findAllByRole("button", { name: "連携解除" }))[0],
    );
    fireEvent.click(screen.getByRole("button", { name: "解除する" }));
    if (status === 404)
      expect(
        await screen.findByText("この接続は既に解除済み、または存在しません。"),
      ).toBeVisible();
    else {
      expect(await screen.findByRole("alert")).toHaveTextContent("通信に失敗");
      fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
      expect(
        screen.queryByRole("group", { name: "連携解除の確認" }),
      ).not.toBeInTheDocument();
    }
  },
);

import { I18nProvider } from "@/i18n/I18nProvider";
import { oauthConnectionsDictionaries } from "@/i18n/oauthConnections";
it.each(["ja", "en", "ko"] as const)(
  "renders localized settings and creation description in %s",
  async (locale) => {
    const client = new QueryClient();
    const api = {
      ...oauthConnectionsBrowserApi,
      settings: vi.fn().mockResolvedValue({ ok: true, data: { scopes: [] } }),
      list: vi.fn().mockResolvedValue({ ok: true, data: { connections: [] } }),
    };
    render(
      <I18nProvider initialLocale={locale}>
        <QueryClientProvider client={client}>
          <OAuthConnectionsPanel
            identityIdentifier="owner"
            sessionVersion={0}
            api={api}
          />
        </QueryClientProvider>
      </I18nProvider>,
    );
    expect(
      await screen.findByRole("button", {
        name: oauthConnectionsDictionaries[locale].save,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: /作成・編集|Create and edit Draft Wiki|생성·편집/ }),
    ).toHaveAccessibleName(
      /作成・編集|Create and edit Draft Wiki|생성·편집/,
    );
  },
);
it("isolates drafts and ignores late mutation completion after Identity/session changes", async () => {
  let resolve!: (value: unknown) => void;
  const client = new QueryClient();
  const api = {
    ...oauthConnectionsBrowserApi,
    settings: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { scopes: ["wiki:read"] } }),
    list: vi.fn().mockResolvedValue({ ok: true, data: { connections: [] } }),
    save: vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    ),
  };
  const view = (owner: string, version: number) => (
    <QueryClientProvider client={client}>
      <OAuthConnectionsPanel
        identityIdentifier={owner}
        sessionVersion={version}
        api={api}
      />
    </QueryClientProvider>
  );
  const rendered = render(view("old-owner", 0));
  fireEvent.click(await screen.findByRole("checkbox", { name: /公開 Wiki の取得/ }));
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  rendered.rerender(view("new-owner", 1));
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: /公開 Wiki の取得/ })).toBeChecked(),
  );
  resolve({ ok: true, data: [] });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled(),
  );
  expect(
    screen.queryByText("許可 Scope 設定を保存しました。"),
  ).not.toBeInTheDocument();
  expect(
    client.getQueryData(["identity-oauth-settings", "new-owner", 1, "ja"]),
  ).toEqual({ ok: true, data: { scopes: ["wiki:read"] } });
});

it("selects and clears all scopes while reflecting partial selection", async () => {
  const api = setup();
  const firstScope = await screen.findByRole("checkbox", { name: /公開 Wiki の取得/ });
  const selectAll = screen.getByRole("checkbox", { name: "すべて選択" });
  expect(selectAll).toBePartiallyChecked();
  fireEvent.click(selectAll);
  for (const checkbox of screen.getAllByRole("checkbox")) {
    expect(checkbox).toBeChecked();
  }
  fireEvent.click(firstScope);
  expect(selectAll).toBePartiallyChecked();
  fireEvent.click(selectAll);
  expect(firstScope).toBeChecked();
  expect(selectAll).toBeChecked();
  fireEvent.click(selectAll);
  for (const checkbox of screen.getAllByRole("checkbox")) {
    expect(checkbox).not.toBeChecked();
  }
  expect(selectAll).not.toBePartiallyChecked();
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(api.save).toHaveBeenCalledWith([], "ja"));
});
