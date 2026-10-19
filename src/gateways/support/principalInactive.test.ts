import { afterEach, expect, it, vi } from "vitest";
import { browserApiFetch } from "./browserApiFetch";
afterEach(() => vi.unstubAllGlobals());
it("signals inactive principals without consuming the API response", async () => {
  const received = vi.fn();
  window.addEventListener("kpool:principal-inactive", received);
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ code: "principal_inactive" }, { status: 403 }),
      ),
  );
  const response = await browserApiFetch("/api/wiki/draft-wikis");
  expect(received).toHaveBeenCalledTimes(1);
  expect(await response.json()).toEqual({ code: "principal_inactive" });
  window.removeEventListener("kpool:principal-inactive", received);
});
