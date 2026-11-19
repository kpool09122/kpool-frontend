import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFrame } from "./SiteFrame";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
afterEach(cleanup);

const frame = <SiteFrame header={<header>Site header</header>} footer={<footer>Site footer</footer>}>
  <main>Page content</main>
</SiteFrame>;

describe("SiteFrame", () => {
  it("omits site navigation on OAuth consent and restores it after leaving", () => {
    navigation.pathname = "/auth/oauth/authorize";
    const view = render(frame);
    expect(screen.getByRole("main")).toHaveTextContent("Page content");
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();

    navigation.pathname = "/login";
    view.rerender(<SiteFrame header={<header>Site header</header>} footer={<footer>Site footer</footer>}>
      <main>Login</main>
    </SiteFrame>);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Login");
  });

  it.each(["/", "/admin/user/external-connections", "/auth/oauth/authorize/other"])("keeps site navigation on %s", (pathname) => {
    navigation.pathname = pathname;
    render(frame);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
