import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WikiVideoPanel } from "./index";
import { parseAuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { useAuthStore } from "@/gateways/auth/authStore";
import { I18nProvider } from "@/i18n/I18nProvider";
useAuthStore.setState({ status: "guest", identity: null });
const authenticatedIdentity = {
  identityIdentifier: "11111111-1111-1111-1111-111111111111",
  identityName: "member",
  email: "member@example.com",
  language: "en",
  profileImage: null,
  accountIdentifier: "22222222-2222-4222-8222-222222222222",
  accountPrincipalIdentifier: "44444444-4444-4444-8444-444444444444",
  accountPrincipalStatus: "active",
  siteManagementPrincipalStatus: null,
  accountType: "individual",
  accountIdentityCount: 1,
  accountPolicies: [],
  account: {
    accountIdentifier: "22222222-2222-4222-8222-222222222222",
    email: "member@example.com",
    type: "individual",
    name: "Member",
    status: "active",
    accountCategory: "individual",
  },
  originalAccount: null,
  delegationIdentifier: null,
  switchableAccounts: [],
  authenticationMethods: { passkeyCount: 1, linkedSocialProviders: [] },
};
const identity = {
  language: "ja",
  resourceType: "group" as const,
  slug: "gr-test",
};
const video = {
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
  url: "https://youtu.be/abcdefghijk",
  title: "Collected video",
  thumbnailUrl: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
  publishedAt: null,
  durationSeconds: 253,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: null,
  videoUsage: "youtube_auto_view_count",
};
const wrap = (client: QueryClient, slug = identity.slug) => (
  <QueryClientProvider client={client}>
    <I18nProvider initialLocale="en">
      <WikiVideoPanel {...identity} slug={slug} />
    </I18nProvider>
  </QueryClientProvider>
);
const client = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });
afterEach(() => {
  cleanup();
  useAuthStore.setState({ status: "guest", identity: null, sessionVersion: 0 });
  vi.unstubAllGlobals();
});
describe("WikiVideoPanel", () => {
  it("ignores a late access grant after logout", async () => {
    useAuthStore.setState({ status: "authenticated" });
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        url.includes("delete-access")
          ? new Promise<Response>((resolve) => {
              finish = resolve;
            })
          : Promise.resolve(Response.json({ videos: [video] })),
      ),
    );
    render(wrap(client()));
    await screen.findByText(video.title);
    act(() => useAuthStore.getState().clearIdentity());
    await act(async () =>
      finish(
        Response.json({ canDelete: true, principalIdentifier: "wiki-me" }),
      ),
    );
    expect(
      screen.queryByRole("button", { name: `Delete video: ${video.title}` }),
    ).not.toBeInTheDocument();
  });
  it.each([
    ["ja", "動画を削除", "この動画を削除しますか？", "キャンセル"],
    ["ko", "동영상 삭제", "이 동영상을 삭제하시겠습니까?", "취소"],
  ] as const)(
    "localizes deletion controls in %s",
    async (locale, label, confirmation, cancel) => {
      useAuthStore.setState({ status: "authenticated" });
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementation((url: string) =>
            Promise.resolve(
              Response.json(
                url.includes("delete-access")
                  ? { canDelete: true, principalIdentifier: "wiki-me" }
                  : { videos: [video] },
              ),
            ),
          ),
      );
      render(
        <QueryClientProvider client={client()}>
          <I18nProvider initialLocale={locale}>
            <WikiVideoPanel {...identity} />
          </I18nProvider>
        </QueryClientProvider>,
      );
      fireEvent.click(
        await screen.findByRole("button", { name: `${label}: ${video.title}` }),
      );
      expect(
        screen.getByRole("dialog", { name: confirmation }),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: cancel }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    },
  );
  it("initializes authentication on a direct public-page visit before showing delete controls", async () => {
    useAuthStore.setState({
      status: "loading",
      identity: null,
      sessionVersion: 0,
    });
    let finish!: (response: Response) => void;
    const fetcher = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/identity/auth/me")
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return Promise.resolve(
        Response.json(
          url.includes("delete-access")
            ? { canDelete: true, principalIdentifier: "wiki-me" }
            : { videos: [video] },
        ),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    render(wrap(client()));
    await screen.findByText(video.title);
    expect(
      screen.queryByRole("button", { name: `Delete video: ${video.title}` }),
    ).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.some(([url]) => url.includes("delete-access")),
    ).toBe(false);
    await act(async () => finish(Response.json(authenticatedIdentity)));
    await screen.findByRole("button", { name: `Delete video: ${video.title}` });
    expect(useAuthStore.getState().status).toBe("authenticated");
  });
  it.each([
    ["music_video", "wiki-me", true],
    ["music_video", "other", false],
    ["music_video", null, false],
    ["youtube_auto_view_count", null, true],
    ["youtube_auto_like_count", null, true],
    ["youtube_auto_recent_popular", null, true],
  ])(
    "checks creator Wiki principal and usage: %s / %s",
    async (videoUsage, creatorPrincipalIdentifier, visible) => {
      useAuthStore.setState({ status: "authenticated" });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(
              url.includes("delete-access")
                ? { canDelete: true, principalIdentifier: "wiki-me" }
                : {
                    videos: [
                      {
                        ...video,
                        videoUsage,
                        creatorPrincipalIdentifier,
                        creatorIdentityName: "wiki-me",
                      },
                    ],
                  },
            ),
          ),
        ),
      );
      render(wrap(client()));
      await screen.findByText(video.title);
      await act(async () => {});
      expect(
        screen.queryByRole("button", {
          name: `Delete video: ${video.title}`,
        }) !== null,
      ).toBe(visible);
    },
  );
  it.each(["guest", "loading", "denied", "pending", "error", "invalid"])(
    "hides deletion while authorization is %s",
    async (state) => {
      useAuthStore.setState({
        status:
          state === "guest" || state === "loading" ? state : "authenticated",
      });
      const fetcher = vi.fn().mockImplementation((url: string) => {
        if (url === "/api/identity/auth/me") return new Promise(() => {});
        if (!url.includes("delete-access"))
          return Promise.resolve(Response.json({ videos: [video] }));
        if (state === "pending") return new Promise(() => {});
        return Promise.resolve(
          Response.json(
            state === "invalid"
              ? { canDelete: true }
              : { canDelete: false, principalIdentifier: null },
            { status: state === "error" ? 403 : 200 },
          ),
        );
      });
      vi.stubGlobal("fetch", fetcher);
      render(wrap(client()));
      await screen.findByText(video.title);
      await act(async () => {});
      expect(
        screen.queryByRole("button", { name: `Delete video: ${video.title}` }),
      ).not.toBeInTheDocument();
      if (state === "guest") expect(fetcher).toHaveBeenCalledTimes(1);
      if (state === "loading")
        expect(
          fetcher.mock.calls.some(([url]) => url.includes("delete-access")),
        ).toBe(false);
    },
  );
  it.each([401, 403, 404, 0])(
    "retains video and duration filters after deletion failure %i",
    async (status) => {
      useAuthStore.setState({ status: "authenticated" });
      document.cookie = ["XSRF-TOKEN", "csrf; path=/"].join("=");
      const fetcher = vi
        .fn()
        .mockImplementation((url: string, init?: RequestInit) => {
          if (url.includes("delete-access"))
            return Promise.resolve(
              Response.json({
                canDelete: true,
                principalIdentifier: "wiki-me",
              }),
            );
          if (init?.method === "DELETE")
            return status
              ? Promise.resolve(new Response(null, { status }))
              : Promise.reject(new Error("network"));
          return Promise.resolve(Response.json({ videos: [video] }));
        });
      vi.stubGlobal("fetch", fetcher);
      render(wrap(client()));
      await screen.findByText(video.title);
      fireEvent.change(
        screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
        { target: { value: "2" } },
      );
      fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
      fireEvent.click(
        await screen.findByRole("button", {
          name: `Delete video: ${video.title}`,
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not delete the video",
      );
      expect(
        screen.getByRole("heading", { name: video.title }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
      ).toHaveValue("2");
    },
  );
  it("prevents duplicate confirmation and refreshes every filter cache without affecting another wiki", async () => {
    useAuthStore.setState({ status: "authenticated" });
    document.cookie = ["XSRF-TOKEN", "csrf; path=/"].join("=");
    let finish!: (response: Response) => void;
    let deleted = false;
    const fetcher = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("delete-access"))
          return Promise.resolve(
            Response.json({ canDelete: true, principalIdentifier: "wiki-me" }),
          );
        if (init?.method === "DELETE")
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        return Promise.resolve(
          Response.json({ videos: deleted ? [] : [video] }),
        );
      });
    vi.stubGlobal("fetch", fetcher);
    const cache = client();
    const otherKey = ["public-wiki-videos", "ja", "group", "other-wiki", {}];
    cache.setQueryData(otherKey, { videos: [video] });
    render(wrap(cache));
    await screen.findByText(video.title);
    fireEvent.change(
      screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
      { target: { value: "2" } },
    );
    fireEvent.change(
      screen.getByRole("slider", { name: "Maximum duration (minutes)" }),
      { target: { value: "5" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: `Delete video: ${video.title}`,
      }),
    );
    const submit = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(
      fetcher.mock.calls.filter(([, init]) => init?.method === "DELETE"),
    ).toHaveLength(1);
    deleted = true;
    await act(async () => finish(new Response(null, { status: 204 })));
    await screen.findByText("No videos match this duration range.");
    expect(
      screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
    ).toHaveValue("2");
    expect(
      screen.getByRole("slider", { name: "Maximum duration (minutes)" }),
    ).toHaveValue("5");
    await waitFor(() =>
      expect(
        cache.getQueryData([
          "public-wiki-videos",
          "ja",
          "group",
          identity.slug,
          {},
        ]),
      ).toEqual({ videos: [] }),
    );
    expect(cache.getQueryData(otherKey)).toEqual({ videos: [video] });
    const listCalls = fetcher.mock.calls.filter(
      ([url]) =>
        !url.includes("delete-access") &&
        !url.includes(video.videoLinkIdentifier),
    );
    expect(
      listCalls.filter(([url]) =>
        url.includes("minDurationSeconds=120&maxDurationSeconds=300"),
      ),
    ).toHaveLength(2);
    expect(
      listCalls.filter(([url]) => !url.includes("minDurationSeconds")),
    ).toHaveLength(2);
  });
  it.each(["Close", "Escape", "backdrop"])(
    "does not send DELETE when closing via %s and restores trigger focus",
    async (method) => {
      useAuthStore.setState({ status: "authenticated" });
      const fetcher = vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(
              url.includes("delete-access")
                ? { canDelete: true, principalIdentifier: "wiki-me" }
                : { videos: [video] },
            ),
          ),
        );
      vi.stubGlobal("fetch", fetcher);
      render(wrap(client()));
      const trigger = await screen.findByRole("button", {
        name: `Delete video: ${video.title}`,
      });
      fireEvent.click(trigger);
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      if (method === "Escape")
        fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      else if (method === "backdrop")
        fireEvent.click(screen.getByRole("dialog"));
      else fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      expect(
        fetcher.mock.calls.some(([, init]) => init?.method === "DELETE"),
      ).toBe(false);
    },
  );
  it("removes stale controls and confirmation immediately on logout/account switch", async () => {
    useAuthStore.setState({ status: "authenticated" });
    let grant = true;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        url.includes("delete-access")
          ? grant
            ? Promise.resolve(
                Response.json({
                  canDelete: true,
                  principalIdentifier: "wiki-me",
                }),
              )
            : new Promise(() => {})
          : Promise.resolve(Response.json({ videos: [video] })),
      ),
    );
    render(wrap(client()));
    fireEvent.click(
      await screen.findByRole("button", {
        name: `Delete video: ${video.title}`,
      }),
    );
    grant = false;
    act(() =>
      useAuthStore.getState().setIdentity(
        parseAuthenticatedIdentitySummary({
          ...authenticatedIdentity,
          identityIdentifier: "55555555-5555-4555-8555-555555555555",
        }),
      ),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: `Delete video: ${video.title}` }),
    ).not.toBeInTheDocument();
    act(() => useAuthStore.getState().clearIdentity());
    expect(
      screen.getByRole("heading", { name: video.title }),
    ).toBeInTheDocument();
  });
  it("requires confirmation, cancels without sending and deletes only on confirmation", async () => {
    useAuthStore.setState({ status: "authenticated" });
    document.cookie = ["XSRF-TOKEN", "csrf; path=/"].join("=");
    let deleted = false;
    const fetcher = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("delete-access"))
          return Promise.resolve(
            Response.json({ canDelete: true, principalIdentifier: "wiki-me" }),
          );
        if (init?.method === "DELETE") {
          deleted = true;
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(
          Response.json({ videos: deleted ? [] : [video] }),
        );
      });
    vi.stubGlobal("fetch", fetcher);
    render(wrap(client()));
    const remove = await screen.findByRole("button", {
      name: `Delete video: ${video.title}`,
    });
    fireEvent.click(remove);
    expect(screen.getByRole("dialog")).toHaveTextContent("Delete this video?");
    expect(deleted).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleted).toBe(false);
    fireEvent.click(remove);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("No videos yet.");
    expect(deleted).toBe(true);
  });
  it("applies duration bounds only on search and distinguishes empty results", async () => {
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        Response.json({
          videos: url.includes("minDurationSeconds") ? [] : [video],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    render(wrap(client()));
    await screen.findByText(video.title);
    fireEvent.change(
      screen.getByRole("slider", { name: "Minimum duration (minutes)" }),
      { target: { value: "10" } },
    );
    fireEvent.change(
      screen.getByRole("slider", { name: "Maximum duration (minutes)" }),
      { target: { value: "20" } },
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
    await screen.findByText("No videos match this duration range.");
    const url = new URL(fetcher.mock.calls[1][0], "http://localhost");
    expect(url.searchParams.get("minDurationSeconds")).toBe("600");
    expect(url.searchParams.get("maxDurationSeconds")).toBe("1200");
    expect(screen.queryByText(video.title)).not.toBeInTheDocument();
  });

  it("treats 40+ as unbounded and prevents inverted ranges", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ videos: [video] }));
    vi.stubGlobal("fetch", fetcher);
    render(wrap(client()));
    await screen.findByText(video.title);
    const minimum = screen.getByRole("slider", {
      name: "Minimum duration (minutes)",
    });
    const maximum = screen.getByRole("slider", {
      name: "Maximum duration (minutes)",
    });
    fireEvent.change(minimum, { target: { value: "40" } });
    fireEvent.change(maximum, { target: { value: "20" } });
    expect(maximum).toHaveValue("40");
    fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    const url = new URL(fetcher.mock.calls[1][0], "http://localhost");
    expect(url.searchParams.get("minDurationSeconds")).toBe("2400");
    expect(url.searchParams.has("maxDurationSeconds")).toBe(false);
  });

  it("shows saved thumbnail/title, then the shared player and a YouTube fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ videos: [video] })),
    );
    render(wrap(client()));
    expect(screen.getByRole("status")).toHaveTextContent("Loading videos");
    expect(
      await screen.findByRole("img", { name: video.title }),
    ).toHaveAttribute("src", video.thumbnailUrl);
    expect(screen.getByText("4:13")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: `Play: ${video.title}` }),
    );
    expect(screen.getByTitle(`YouTube embed: ${video.title}`)).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghijk",
    );
    expect(
      screen.getByRole("link", { name: "Open on YouTube" }),
    ).toHaveAttribute("href", "https://www.youtube.com/watch?v=abcdefghijk");
  });
  it("omits duration when the API has no stored duration", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ videos: [{ ...video, durationSeconds: null }] }),
        ),
    );
    render(wrap(client()));
    await screen.findByText(video.title);
    expect(screen.queryByText("4:13")).not.toBeInTheDocument();
    expect(screen.queryByText("0:00")).not.toBeInTheDocument();
  });
  it("reuses cached results across remounts and never shows a previous wiki list", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ videos: [video] }))
      .mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const cache = client();
    const view = render(wrap(cache));
    await screen.findByRole("img", { name: video.title });
    view.unmount();
    render(wrap(cache));
    expect(screen.getByRole("img", { name: video.title })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
    render(wrap(cache, "other-wiki"));
    expect(screen.queryByText(video.title)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading videos");
  });
  it.each([
    { ...identity, language: "ko" },
    { ...identity, resourceType: "song" as const },
    { ...identity, slug: "other-wiki" },
  ])(
    "clears previous videos immediately when identity changes: %o",
    async (next) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(Response.json({ videos: [video] }))
          .mockImplementation(() => new Promise(() => {})),
      );
      const cache = client();
      const view = render(wrap(cache));
      await screen.findByRole("img", { name: video.title });
      view.rerender(
        <QueryClientProvider client={cache}>
          <I18nProvider initialLocale="en">
            <WikiVideoPanel {...next} />
          </I18nProvider>
        </QueryClientProvider>,
      );
      expect(screen.queryByText(video.title)).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("Loading videos");
    },
  );
  it("never renders arbitrary backend URLs as players, links or images", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          videos: [
            {
              ...video,
              url: "javascript:alert(1)",
              thumbnailUrl: "https://tracker.example/x",
            },
          ],
        }),
      ),
    );
    render(wrap(client()));
    await screen.findByText(video.title);
    expect(
      screen.getByRole("button", { name: `Play: ${video.title}` }),
    ).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("distinguishes empty and failed states and retries", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValue(Response.json({ videos: [] })),
    );
    render(wrap(client()));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load videos",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("No videos yet.")).toBeInTheDocument();
  });
  it.each([null, "https://tracking.example/x", video.thumbnailUrl])(
    "handles missing/unsafe/failed thumbnails (%s)",
    async (thumbnailUrl) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ videos: [{ ...video, thumbnailUrl }] }),
          ),
      );
      render(wrap(client()));
      await screen.findByText(video.title);
      const image = screen.queryByRole("img");
      if (image) fireEvent.error(image);
      await waitFor(() =>
        expect(screen.getByText("Thumbnail unavailable")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: `Play: ${video.title}` }),
      ).toBeEnabled();
    },
  );
});
