import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/gateways/auth/authStore";
import { buildLocaleChangePath, Header } from "./Header";

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
  useAuthStore.setState({ identity: null, status: "loading" });
});

afterEach(() => {
  cleanup();
});

describe("Header", () => {
  it("renders the logo and desktop login link", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "K-Pool",
      }),
    ).toHaveAttribute("href", "/ja");

    const desktopLoginLink = screen.getByRole("link", {
      name: "ログイン",
    });
    expect(desktopLoginLink).toHaveAttribute("href", "/login");
    expect(desktopLoginLink).toHaveClass("hidden", "sm:inline-flex");
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
      "アカウントの切り替えに失敗しました。",
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

  it("logs out and navigates back to login", async () => {
    const logoutAdapter = vi.fn().mockResolvedValue(undefined);
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

  it("reenables logout after signing in again without a reload", async () => {
    const logoutAdapter = vi.fn().mockResolvedValue(undefined);
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
        pathname: "/login",
        searchParams: new URLSearchParams(),
      }),
    ).toBeNull();
  });
});
