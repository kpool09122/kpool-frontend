import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { browserApiFetch } from "./browserApiFetch";

const clearToken = () => { document.cookie = "XSRF-TOKEN=; Max-Age=0; Path=/"; };

describe("browserApiFetch", () => {
  beforeEach(clearToken);
  afterEach(() => { clearToken(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("initializes cookies before a mutation and forwards the URL-decoded token", async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: string) => {
      if (input === "/api/identity/auth/csrf-token") {
        document.cookie = "XSRF-TOKEN=encrypted%2Btoken%3D; Path=/";
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    await browserApiFetch("/api/account/accounts/setup", {
      method: "POST", credentials: "include", body: "{}",
      headers: { "Content-Type": "application/json", "Accept-Language": "ja" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/identity/auth/csrf-token", {
      credentials: "same-origin", cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/account/accounts/setup", {
      method: "POST", credentials: "include", body: "{}",
      headers: { "Content-Type": "application/json", "Accept-Language": "ja", "X-XSRF-TOKEN": "encrypted+token=" },
    });
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("uses the latest cookie on every %s request", async (method) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=before-login; Path=/";
    await browserApiFetch("/api/identity", { method });
    document.cookie = "XSRF-TOKEN=after-login; Path=/";
    await browserApiFetch("/api/identity", { method });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/identity", {
      method, headers: { "X-XSRF-TOKEN": "after-login" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("leaves GET requests unchanged without initializing a token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await browserApiFetch("/api/identity/auth/me", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/identity/auth/me", { cache: "no-store" });
  });

  it("shares initialization between concurrent mutations", async () => {
    let finish: (() => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((input: string) => {
      if (input === "/api/identity/auth/csrf-token") {
        return new Promise<Response>((resolve) => {
          finish = () => {
            document.cookie = "XSRF-TOKEN=shared; Path=/";
            resolve(new Response(null, { status: 204 }));
          };
        });
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const first = browserApiFetch("/api/contact", { method: "POST" });
    const second = browserApiFetch("/api/identity", { method: "PATCH" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    finish?.();
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not send a mutation after failed initialization and can initialize again", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockImplementationOnce(async () => {
        document.cookie = "XSRF-TOKEN=recovered; Path=/";
        return new Response(null, { status: 204 });
      }).mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(browserApiFetch("/api/contact", { method: "POST" })).rejects.toThrow("CSRF initialization failed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await browserApiFetch("/api/contact", { method: "POST" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not send a mutation if initialization supplies no readable cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(browserApiFetch("/api/contact", { method: "POST" })).rejects.toThrow("CSRF cookie is unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not leak a token to another origin", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "XSRF-TOKEN=secret; Path=/";
    await expect(browserApiFetch("https://other.example.test/api/contact", { method: "POST" })).rejects.toThrow("same-origin API");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("replaces an existing header using the latest cookie and preserves other Headers", async () => {
    document.cookie = "XSRF-TOKEN=current; Path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await browserApiFetch("/api/contact", { method: "POST", headers: new Headers({ "X-XSRF-TOKEN": "old", "Accept-Language": "ja" }) });
    const sent = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(sent.get("X-XSRF-TOKEN")).toBe("current");
    expect(sent.get("Accept-Language")).toBe("ja");
  });

  it("does not replay mutations after a 419 response", async () => {
    document.cookie = "XSRF-TOKEN=stale; Path=/";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 419 }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await browserApiFetch("/api/contact", { method: "POST" })).status).toBe(419);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
