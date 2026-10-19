import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { announcementHandler } from "./announcementHandler";

const id = "019b0000-0000-7000-8000-000000000001";
const draft = {
  announcementIdentifier: id,
  sourceLanguage: "ja",
  category: 1,
  contents: { ja: { title: "タイトル", content: "本文" } },
};
const body = {
  language: "ja",
  category: 1,
  title: "タイトル",
  content: "本文",
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const request = (path: string, method = "GET", payload?: unknown) =>
  new NextRequest(`http://localhost/api/site-management/${path}`, {
    method,
    headers: {
      cookie: "session=test",
      "X-XSRF-TOKEN": "csrf",
      "Accept-Language": "ja",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
describe("announcement BFF", () => {
  it.each([401, 403, 404, 422, 429, 500])(
    "preserves upstream status %i and cookies but hides backend messages",
    async (status) => {
      vi.stubEnv(
        "KPOOL_SITE_MANAGEMENT_API_BASE_URL",
        "https://backend.example",
      );
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json(
              { message: "secret" },
              { status, headers: { "Set-Cookie": "session=rotated" } },
            ),
          ),
      );
      const result = await announcementHandler(
        request(`draft-announcements/${id}`),
        ["draft-announcements", id],
      );
      expect(result.status).toBe(status);
      expect(result.headers.get("set-cookie")).toContain("session=rotated");
      expect(await result.text()).not.toContain("secret");
    },
  );
  it.each(["GET", "PUT", "DELETE", "translate", "publish"])(
    "validates and forwards draft %s operation",
    async (operation) => {
      vi.stubEnv(
        "KPOOL_SITE_MANAGEMENT_API_BASE_URL",
        "https://backend.example",
      );
      const complete = { ...draft, publishedDate: "2026-10-19", contents: { ja: body, en: body, ko: body } };
      const payload =
        operation === "translate" || operation === "DELETE"
          ? { announcements: [draft] }
          : operation === "publish"
            ? { announcements: [complete] }
            : draft;
      const fetcher = vi.fn().mockResolvedValue(Response.json(payload));
      vi.stubGlobal("fetch", fetcher);
      const method = ["translate", "publish"].includes(operation)
        ? "POST"
        : operation;
      const segments = [
        "draft-announcements",
        id,
        ...(["translate", "publish"].includes(operation) ? [operation] : []),
      ];
      const response = await announcementHandler(
        request(
          segments.join("/"),
          method,
          method === "PUT" ? body : undefined,
        ),
        segments,
      );
      expect(response.status).toBe(200);
      expect(fetcher.mock.calls[0][0]).toBe(
        `https://backend.example/api/v1/site-management/${segments.join("/")}`,
      );
      expect(fetcher.mock.calls[0][1].method).toBe(method);
    },
  );
  it("rejects malformed JSON, identifiers, queries and unsupported methods", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await announcementHandler(
          new NextRequest("http://localhost/api", {
            method: "POST",
            body: "{",
          }),
          ["draft-announcements"],
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await announcementHandler(request("draft-announcements/invalid"), [
          "draft-announcements",
          "invalid",
        ])
      ).status,
    ).toBe(404);
    expect(
      (
        await announcementHandler(request("announcements?language=zh"), [
          "announcements",
        ])
      ).status,
    ).toBe(422);
    expect(
      (
        await announcementHandler(
          request("announcements?language=ja&page=-1"),
          ["announcements"],
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await announcementHandler(request("announcements", "POST"), [
          "announcements",
        ])
      ).status,
    ).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns unavailable for missing configuration and network errors", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL", "");
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "");
    vi.stubEnv("KPOOL_WIKI_PRIVATE_API_BASE_URL", "");
    expect(
      (
        await announcementHandler(request("draft-announcements"), [
          "draft-announcements",
        ])
      ).status,
    ).toBe(503);
    vi.stubEnv(
      "KPOOL_SITE_MANAGEMENT_PUBLIC_API_BASE_URL",
      "https://backend.example",
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("secret")));
    expect(
      (
        await announcementHandler(request("draft-announcements"), [
          "draft-announcements",
        ])
      ).status,
    ).toBe(502);
  });
  it("validates create input and forwards only contract fields, cookies and CSRF", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://backend.example");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(draft, {
          headers: { "Set-Cookie": "session=rotated; HttpOnly" },
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const response = await announcementHandler(
      request("draft-announcements", "POST", {
        ...body,
        principalIdentifier: "forged",
      }),
      ["draft-announcements"],
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(draft);
    expect(response.headers.get("set-cookie")).toContain("session=rotated");
    expect(fetcher.mock.calls[0][0]).toBe(
      "https://backend.example/api/v1/site-management/draft-announcements",
    );
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({
      Cookie: "session=test",
      "X-XSRF-TOKEN": "csrf",
      "Accept-Language": "ja",
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
  });
  it("rejects blank content before upstream", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://backend.example");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await announcementHandler(
          request("draft-announcements", "POST", { ...body, title: "  " }),
          ["draft-announcements"],
        )
      ).status,
    ).toBe(422);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requests public language and stable descending sort without forwarding credentials", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://backend.example");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          announcements: [],
          current_page: 2,
          last_page: 2,
          per_page: 20,
          total: 21,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    const response = await announcementHandler(
      request("announcements?language=ko&page=2"),
      ["announcements"],
    );
    expect(response.status).toBe(200);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toContain("language=ko");
    expect(url).toContain("page=2");
    expect(url).toContain("sort=published_date&order=desc");
    expect(init.headers.Cookie).toBeUndefined();
  });
  it("preserves rotated cookies when upstream JSON is invalid and hides details", async () => {
    vi.stubEnv("KPOOL_SITE_MANAGEMENT_API_BASE_URL", "https://backend.example");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("secret stack", {
            headers: { "Set-Cookie": "session=new" },
          }),
        ),
    );
    const response = await announcementHandler(
      request(`draft-announcements/${id}`),
      ["draft-announcements", id],
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toContain("session=new");
    expect(await response.text()).not.toContain("secret");
  });
});
