import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as navigation from "next/navigation";
import { I18nProvider } from "../i18n/I18nProvider";

import { useUnsavedChangesGuard } from "@/components/UnsavedChangesGuard/useUnsavedChangesGuard";
import { useAuthStore } from "@/gateways/auth/authStore";
import { buildLocaleChangePath, Header } from "./Header";
import { applyThemeMode } from "./themeMode";
it.each(["/ja/announcements", "/ja/announcements/019b0000-0000-7000-8000-000000000001"])("changes announcement route language for %s", (pathname) => {
 expect(buildLocaleChangePath({ nextLocale: "ko", pathname, searchParams: new URLSearchParams("page=2") })).toBe(pathname.replace("/ja/", "/ko/") + "?page=2");
});

const switchableIdentity = {
  identityIdentifier: "11111111-1111-4111-8111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "ja",
  profileImage: null,
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "33333333-3333-4333-8333-333333333333",
  accountType: "agency",
  accountPolicies: [],
  account: null,
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [
    {
      delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      accountIdentifier: "44444444-4444-4444-8444-444444444444",
      account: {
        accountIdentifier: "44444444-4444-4444-8444-444444444444",
        name: "Aurora Agency",
      },
      isCurrent: false,
    },
  ],
};

beforeEach(() => {
  useAuthStore.setState({ identity: null, status: "loading", sessionVersion: 0 });
  document.documentElement.dataset.theme = "light";
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Header", () => {
  it.each(["/wiki/draft-1/edit", "/wiki/ko/gr-twice/edit", "/ko/wiki/gr-twice/edit"])(
    "changes UI language without navigating or refreshing the editor at %s", (pathname) => {
      vi.spyOn(navigation, "usePathname").mockReturnValue(pathname);
      const navigate = vi.fn();
      const refresh = vi.fn();
      render(<I18nProvider initialLocale="ja"><Header navigate={navigate} refresh={refresh} /></I18nProvider>);
      fireEvent.change(screen.getByRole("combobox", { name: "言語" }), { target: { value: "en" } });
      expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue("en");
      expect(navigate).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
      expect(buildLocaleChangePath({ nextLocale: "en", pathname, searchParams: new URLSearchParams("resourceType=group") })).toBeNull();
    },
  );
  it("renders the logo and desktop login link", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "k-pool",
      }),
    ).toHaveAttribute("href", "/ja");

    const desktopLoginLink = screen.getByRole("link", {
      name: "ログイン",
    });
    expect(desktopLoginLink).toHaveAttribute("href", "/login");
    expect(desktopLoginLink).toHaveClass("hidden", "sm:inline-flex", "text-text-strong");
    expect(desktopLoginLink).not.toHaveClass("bg-brand-primary", "text-on-primary");
  });

  it("renders the desktop profile menu with admin and logout when authenticated", () => {
    render(<Header initialIsAuthenticated />);

    expect(screen.getByRole("button", { name: "管理画面" })).toHaveClass("rounded-full");
    const desktopAdminLink = screen.getByRole("link", {
      name: "管理画面",
    });
    expect(desktopAdminLink).toHaveAttribute("href", "/admin");
    expect(
      screen.queryByRole("link", {
        name: "ログイン",
      }),
    ).not.toBeInTheDocument();
    const logoutButton = screen.getByRole("button", {
      name: "ログアウト",
    });
    expect(logoutButton).toHaveClass("text-left");
  });

  it("switches accounts from the desktop submenu and refreshes identity and the page", async () => {
    const switchAccountAdapter = vi.fn().mockResolvedValue({});
    const refreshIdentityAdapter = vi.fn().mockResolvedValue(switchableIdentity);
    const refresh = vi.fn();

    render(
      <Header
        initialIdentity={switchableIdentity}
        initialIsAuthenticated
        refresh={refresh}
        refreshIdentityAdapter={refreshIdentityAdapter}
        switchAccountAdapter={switchAccountAdapter}
      />,
    );

    expect(screen.getByRole("button", { name: "アカウント切り替え" })).toHaveAttribute(
      "aria-haspopup",
      "menu",
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Aurora Agency" }));

    await vi.waitFor(() => expect(switchAccountAdapter).toHaveBeenCalledWith({
      delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fallbackErrorMessage: "アカウントの切り替えに失敗しました。",
    }));
    expect(refreshIdentityAdapter).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("shows the original account option while delegated and sends null to return", async () => {
    const switchAccountAdapter = vi.fn().mockResolvedValue({});
    const delegatedIdentity = {
      ...switchableIdentity,
      delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      originalAccount: {
        accountIdentifier: "22222222-2222-4222-8222-222222222222",
        name: "Original Account",
      },
      switchableAccounts: switchableIdentity.switchableAccounts.map((account) => ({
        ...account,
        isCurrent: true,
      })),
    };

    render(
      <Header
        initialIdentity={delegatedIdentity}
        initialIsAuthenticated
        refreshIdentityAdapter={() => delegatedIdentity}
        switchAccountAdapter={switchAccountAdapter}
      />,
    );

    expect(screen.getByRole("menuitem", { name: "Aurora Agency" })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: "Aurora Agency" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /元のアカウントに戻る/ }));

    await vi.waitFor(() => expect(switchAccountAdapter).toHaveBeenCalledWith({
      delegationIdentifier: null,
      fallbackErrorMessage: "アカウントの切り替えに失敗しました。",
    }));
  });

  it("does not show an empty account switch menu", () => {
    render(
      <Header
        initialIdentity={{ ...switchableIdentity, switchableAccounts: [] }}
        initialIsAuthenticated
      />,
    );

    expect(screen.queryByRole("button", { name: "アカウント切り替え" })).not.toBeInTheDocument();
  });

  it("keeps the current identity visible and reports an account switch failure", async () => {
    const switchAccountAdapter = vi.fn().mockRejectedValue(new Error("forbidden"));

    render(
      <Header
        initialIdentity={switchableIdentity}
        initialIsAuthenticated
        switchAccountAdapter={switchAccountAdapter}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Aurora Agency" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "forbidden",
    );
    expect(screen.getByRole("button", { name: "member" })).toBeInTheDocument();
  });

  it("renders the initial profile image while the auth store is loading", () => {
    const { container } = render(
      <Header
        initialIdentity={{
          identityIdentifier: "11111111-1111-1111-1111-111111111111",
          identityName: "member",
          email: "member@example.com",
          language: "ja",
          profileImage: "https://images.example.test/member.jpg",
        }}
        initialIsAuthenticated
      />,
    );

    expect(screen.getByRole("button", { name: "member" })).toBeInTheDocument();
    expect(container.querySelector('img[src="https://images.example.test/member.jpg"]')).toBeInTheDocument();
  });

  it("opens and closes the mobile login menu from the hamburger button", () => {
    render(<Header />);

    const menuButton = screen.getByRole("button", {
      name: "ナビゲーションメニュー",
    });

    expect(menuButton).toHaveAttribute("aria-controls", "mobile-navigation");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveClass("sm:hidden");
    expect(
      screen.queryByRole("navigation", {
        name: "モバイルメニュー",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const mobileNavigation = screen.getByRole("navigation", {
      name: "モバイルメニュー",
    });
    expect(
      within(mobileNavigation).getByRole("link", {
        name: "ログイン",
      }),
    ).toHaveAttribute("href", "/login");

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("navigation", {
        name: "モバイルメニュー",
      }),
    ).not.toBeInTheDocument();
  });

  it("closes the mobile submenu on an outside tap without blocking the content action", () => {
    const onContentClick = vi.fn();
    render(<><Header /><main><button onClick={onContentClick}><span>コンテンツ操作</span></button></main></>);

    const menuButton = screen.getByRole("button", { name: "ナビゲーションメニュー" });
    fireEvent.click(menuButton);
    const mobile = screen.getByRole("navigation", { name: "モバイルメニュー" });
    const themeRow = within(mobile).getByRole("button", { name: "表示モード" });
    fireEvent.pointerDown(themeRow);
    fireEvent.click(themeRow);
    expect(within(mobile).getByRole("radio", { name: "ライト" })).toBeInTheDocument();
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const content = screen.getByText("コンテンツ操作");
    fireEvent.pointerDown(content, { pointerType: "touch" });
    fireEvent.click(content);
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "モバイルメニュー" })).not.toBeInTheDocument();
    expect(onContentClick).toHaveBeenCalledOnce();

    fireEvent.click(menuButton);
    expect(screen.getByRole("navigation", { name: "モバイルメニュー" })).toContainElement(screen.getByRole("button", { name: "表示モード" }));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("shows the admin link in the mobile menu when authenticated", () => {
    render(<Header initialIsAuthenticated />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "ナビゲーションメニュー",
      }),
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: "モバイルメニュー",
    });
    expect(
      within(mobileNavigation).getByRole("link", {
        name: "管理画面",
      }),
    ).toHaveAttribute("href", "/admin");
    expect(
      within(mobileNavigation).getByRole("button", {
        name: "ログアウト",
      }),
    ).toBeInTheDocument();
  });

  it("opens the mobile account view and switches the selected account", async () => {
    const switchAccountAdapter = vi.fn().mockResolvedValue({});
    const refreshIdentityAdapter = vi.fn().mockResolvedValue(switchableIdentity);

    render(
      <Header
        initialIdentity={switchableIdentity}
        initialIsAuthenticated
        refreshIdentityAdapter={refreshIdentityAdapter}
        switchAccountAdapter={switchAccountAdapter}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ナビゲーションメニュー" }));
    let mobileNavigation = screen.getByRole("navigation", { name: "モバイルメニュー" });
    fireEvent.click(within(mobileNavigation).getByRole("button", { name: "アカウント切り替え" }));

    mobileNavigation = screen.getByRole("navigation", { name: "モバイルメニュー" });
    expect(within(mobileNavigation).getByRole("button", { name: "メニューに戻る" })).toBeInTheDocument();
    fireEvent.click(within(mobileNavigation).getByRole("button", { name: "Aurora Agency" }));

    await vi.waitFor(() => expect(switchAccountAdapter).toHaveBeenCalledWith({
      delegationIdentifier: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      fallbackErrorMessage: "アカウントの切り替えに失敗しました。",
    }));
    expect(refreshIdentityAdapter).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(
      screen.queryByRole("navigation", { name: "モバイルメニュー" }),
    ).not.toBeInTheDocument());
  });

  it("keeps the authenticated session when leaving an unsaved editor is cancelled", async () => {
    const logoutAdapter = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    const navigate = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    function GuardedHeader() {
      useUnsavedChangesGuard(true, "Unsaved edits will be lost.");
      return <Header initialIsAuthenticated logoutAdapter={logoutAdapter} navigate={navigate} />;
    }
    render(<GuardedHeader />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(confirm).toHaveBeenCalledWith("Unsaved edits will be lost.");
    expect(logoutAdapter).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
  });

  it("confirms before logging out and permits the resulting login navigation without another warning", async () => {
    const browserNavigation = new EventTarget();
    vi.stubGlobal("navigation", browserNavigation);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(true).mockReturnValue(false);
    const logoutAdapter = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    const loginNavigation = new Event("navigate", { cancelable: true });
    Object.assign(loginNavigation, { destination: { url: new URL("/login", window.location.href).href }, hashChange: false, navigationType: "replace" });
    const navigate = vi.fn(() => browserNavigation.dispatchEvent(loginNavigation));
    function GuardedHeader() {
      useUnsavedChangesGuard(true, "Unsaved edits will be lost.");
      return <Header initialIsAuthenticated logoutAdapter={logoutAdapter} navigate={navigate} />;
    }
    render(<GuardedHeader />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(logoutAdapter).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(loginNavigation.defaultPrevented).toBe(false);
  });

  it("restores unsaved protection when a confirmed logout fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const logoutAdapter = vi.fn().mockResolvedValue({ ok: false, message: "Failed", status: 500 });
    const navigate = vi.fn();
    function GuardedHeader() {
      useUnsavedChangesGuard(true, "Unsaved edits will be lost.");
      return <Header initialIsAuthenticated logoutAdapter={logoutAdapter} navigate={navigate} />;
    }
    render(<GuardedHeader />);
    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Failed");
    expect(navigate).not.toHaveBeenCalled();
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("logs out and navigates back to login", async () => {
    const logoutAdapter = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    const navigate = vi.fn();

    render(
      <Header
        initialIsAuthenticated
        logoutAdapter={logoutAdapter}
        navigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    await vi.waitFor(() => expect(logoutAdapter).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it.each([
    ["CSRF initialization failure", true, 500],
    ["CSRF initialization without a readable cookie", true, 204],
    ["CSRF rejection", false, 419],
    ["server failure", false, 500],
  ])("preserves identity and navigation on %s during logout", async (_name, needsInitialization, status) => {
    useAuthStore.setState({ identity: switchableIdentity, status: "authenticated" });
    if (needsInitialization) document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status }));
    vi.stubGlobal("fetch", fetchMock);
    const navigate = vi.fn();
    const refresh = vi.fn();
    render(<Header navigate={navigate} refresh={refresh} />);

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Authentication failed. Please try again later.");
    expect(useAuthStore.getState().identity).toEqual(switchableIdentity);
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(navigate).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "ログアウト" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(needsInitialization
      ? "/api/identity/auth/csrf-token"
      : "/api/identity/auth/logout");
  });

  it.each([200, 204])("clears identity after a successful %s logout response", async (status) => {
    useAuthStore.setState({ identity: switchableIdentity, status: "authenticated" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    const navigate = vi.fn();
    render(<Header navigate={navigate} />);

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().identity).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can retry logout after an adapter throws synchronously", async () => {
    useAuthStore.setState({ identity: switchableIdentity, status: "authenticated" });
    const logoutAdapter = vi.fn().mockImplementationOnce(() => { throw new Error("Network unavailable"); })
      .mockResolvedValue({ ok: true, data: undefined });
    const navigate = vi.fn();
    render(<Header logoutAdapter={logoutAdapter} navigate={navigate} />);

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
    expect(useAuthStore.getState().identity).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reenables logout after signing in again without a reload", async () => {
    const logoutAdapter = vi.fn().mockResolvedValue({ ok: true, data: undefined });
    const navigate = vi.fn();

    render(
      <Header
        initialIdentity={switchableIdentity}
        initialIsAuthenticated
        logoutAdapter={logoutAdapter}
        navigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(screen.getByRole("button", { name: "ログアウト中" })).toBeDisabled();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));

    act(() => {
      useAuthStore.setState({ identity: switchableIdentity, status: "authenticated" });
    });

    expect(screen.getByRole("button", { name: "ログアウト" })).toBeEnabled();
  });

  it("builds language-prefixed navigation paths when switching locale", () => {
    expect(
      buildLocaleChangePath({
        nextLocale: "en",
        pathname: "/ja",
        searchParams: new URLSearchParams("updatedResourceType=group"),
      }),
    ).toBe("/en?updatedResourceType=group");
    expect(
      buildLocaleChangePath({
        nextLocale: "ko",
        pathname: "/ja/wiki/gr-aurora-echo",
        searchParams: new URLSearchParams("themeColor=%23fff"),
      }),
    ).toBe("/ko/wiki/gr-aurora-echo?themeColor=%23fff");
    expect(
      buildLocaleChangePath({
        nextLocale: "en",
        pathname: "/ja/terms",
        searchParams: new URLSearchParams(),
      }),
    ).toBe("/en/terms");
    expect(
      buildLocaleChangePath({
        nextLocale: "ko",
        pathname: "/en/privacy",
        searchParams: new URLSearchParams("source=footer"),
      }),
    ).toBe("/ko/privacy?source=footer");
    expect(
      buildLocaleChangePath({
        nextLocale: "en",
        pathname: "/login",
        searchParams: new URLSearchParams(),
      }),
    ).toBeNull();
  });
});


it("selects mobile display mode from a submenu and synchronizes the desktop toggle", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  render(<Header />);
  const toggle = screen.getByRole("switch", { name: "表示モード" });
  fireEvent.click(screen.getByRole("button", { name: "ナビゲーションメニュー" }));
  const mobile = screen.getByRole("navigation", { name: "モバイルメニュー" });
  expect(within(mobile).queryByRole("radio")).not.toBeInTheDocument();
  fireEvent.click(within(mobile).getByRole("button", { name: "表示モード" }));
  const light = within(mobile).getByRole("radio", { name: "ライト" });
  const dark = within(mobile).getByRole("radio", { name: "ダーク" });
  expect(light).toBeChecked();
  fireEvent.click(dark);
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(window.localStorage.getItem("kpool-theme")).toBe("dark");
  expect(toggle).toHaveAttribute("aria-checked", "true");
  expect(dark).toBeChecked();
  fireEvent.click(toggle);
  expect(light).toBeChecked();
  expect(window.localStorage.getItem("kpool-theme")).toBe("light");
  fireEvent.click(within(mobile).getByRole("button", { name: "メニューに戻る" }));
  expect(within(mobile).getByRole("button", { name: "言語" })).toBeInTheDocument();
  fireEvent.click(within(mobile).getByRole("button", { name: "表示モード" }));
  fireEvent.click(screen.getByRole("button", { name: "ナビゲーションメニュー" }));
  fireEvent.click(screen.getByRole("button", { name: "ナビゲーションメニュー" }));
  expect(screen.getByRole("navigation", { name: "モバイルメニュー" })).toContainElement(screen.getByRole("button", { name: "表示モード" }));
  expect(screen.queryByText("この端末の表示設定")).not.toBeInTheDocument();
  expect(fetchSpy).not.toHaveBeenCalled();
});


it("retains the device theme through account switching, logout and sign-in without an account", async () => {
  applyThemeMode("dark", true);
  const switchAccountAdapter = vi.fn().mockResolvedValue({});
  const logoutAdapter = vi.fn().mockResolvedValue({ ok: true });
  render(<Header initialIdentity={switchableIdentity} initialIsAuthenticated switchAccountAdapter={switchAccountAdapter} refreshIdentityAdapter={() => switchableIdentity} logoutAdapter={logoutAdapter} navigate={() => undefined} refresh={() => undefined} />);
  fireEvent.click(screen.getByRole("menuitem", { name: "Aurora Agency" }));
  await vi.waitFor(() => expect(switchAccountAdapter).toHaveBeenCalledOnce());
  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));
  await vi.waitFor(() => expect(logoutAdapter).toHaveBeenCalledOnce());
  await act(async () => undefined);
  act(() => useAuthStore.setState({ identity: { ...switchableIdentity, account: null, accountIdentifier: null, switchableAccounts: [] }, status: "authenticated" }));
  expect(screen.getByRole("switch", { name: "表示モード" })).toHaveAttribute("aria-checked", "true");
  expect(window.localStorage.getItem("kpool-theme")).toBe("dark");
});
