import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Header } from "./Header";
import { I18nProvider } from "../i18n/I18nProvider";

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
    ).toHaveAttribute("href", "/");

    const desktopLoginLink = screen.getByRole("link", {
      name: "ログイン",
    });
    expect(desktopLoginLink).toHaveAttribute("href", "/login");
    expect(desktopLoginLink).toHaveClass("hidden", "sm:inline-flex");
  });

  it("renders the desktop mypage and logout links when authenticated", () => {
    render(<Header initialIsAuthenticated />);

    const desktopMyPageLink = screen.getByRole("link", {
      name: "マイページ",
    });
    expect(desktopMyPageLink).toHaveAttribute("href", "/mypage");
    expect(
      screen.queryByRole("link", {
        name: "ログイン",
      }),
    ).not.toBeInTheDocument();
    const logoutButton = screen.getByRole("button", {
      name: "ログアウト",
    });
    expect(logoutButton).toHaveClass("hidden", "sm:inline-flex");
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

  it("shows the mypage link in the mobile menu when authenticated", () => {
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
        name: "マイページ",
      }),
    ).toHaveAttribute("href", "/mypage");
    expect(
      within(mobileNavigation).getByRole("button", {
        name: "ログアウト",
      }),
    ).toBeInTheDocument();
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

  it("switches fixed header text when the locale selector changes", () => {
    const refresh = vi.fn();

    render(
      <I18nProvider initialLocale="en">
        <Header refresh={refresh} />
      </I18nProvider>,
    );

    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "ko" },
    });

    expect(screen.getByRole("link", { name: "로그인" })).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });
});
