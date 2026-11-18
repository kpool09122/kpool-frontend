import { describe, expect, it } from "vitest";
import Page from "./page";

describe("login return destination from the route", () => {
  it("passes the current route's opaque OAuth destination rather than the previous browser URL", async () => {
    const returnTo = "/auth/oauth/authorize?state=opaque%2B%26%25&resource=https%3A%2F%2Fapi.example%2Fmcp";
    const page = await Page({ searchParams: Promise.resolve({ returnTo }) });
    expect(page.props.returnTo).toBe(returnTo);
  });
  it.each([undefined, ["/wiki/ja/example", "https://evil.example"]])("defaults missing or ambiguous destinations %j", async (returnTo) => {
    const page = await Page({ searchParams: Promise.resolve({ returnTo }) });
    expect(page.props.returnTo).toBe("/admin");
  });
});
