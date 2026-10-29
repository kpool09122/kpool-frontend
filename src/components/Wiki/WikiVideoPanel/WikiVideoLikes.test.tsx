import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WikiVideoPanel } from "./index";
import { WikiVideoPlaybackLike } from "./WikiVideoLikeControl";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
import { parseAuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { wikiVideoAuthenticatedIdentity } from "../../../../tests/e2e/wiki-video-identity";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
const identity = {
  language: "ja",
  resourceType: "group" as const,
  slug: "gr-test",
};
const video: WikiVideo = {
  provider: "youtube", externalVideoId: "abcdefghijk",
  videoLinkIdentifier: "00000000-0000-4000-8000-000000000001",
  likeCount: 0, hasOfficialOwnerLike: false,
  url: "https://youtu.be/abcdefghijk",
  title: "Video",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 120,
  creatorPrincipalIdentifier: null,
  creatorIdentityName: null,
  videoUsage: "youtube_auto_view_count",
};
const key = ["public-wiki-videos", "ja", "group", "gr-test"];
const setup = (
  options: {
    liked?: boolean;
    denied?: boolean;
    missingCollaborator?: boolean;
    compact?: boolean;
    guest?: boolean;
    stateFailure?: boolean;
    pendingState?: boolean;
    locale?: "ja" | "en" | "ko";
  } = {},
) => {
  useAuthStore.setState({
    status: options.guest ? "guest" : "authenticated",
    identity: null,
    sessionVersion: 1,
  });
  document.cookie = "XSRF-TOKEN=csrf; path=/";
  let finish!: (response: Response) => void;
  let reject!: (error: Error) => void;
  let finishState!: (response: Response) => void;
  const fetcher = vi.fn().mockImplementation((url: string) => {
    if (url.includes("delete-access"))
      return Promise.resolve(
        Response.json({ canDelete: false, principalIdentifier: null }),
      );
    if (url.includes("like-access"))
      return Promise.resolve(
        Response.json({
          canLike: !options.denied,
          canUnlike: !options.denied,
          principalIdentifier: options.missingCollaborator ? null : "wiki-me",
        }),
      );
    if (url.includes("/likes?"))
      return options.pendingState
        ? new Promise<Response>((resolve) => {
            finishState = resolve;
          })
        : Promise.resolve(
            options.stateFailure
              ? Response.json({}, { status: 500 })
              : Response.json({
                  likedVideoLinkIdentifiers: options.liked
                    ? [video.videoLinkIdentifier]
                    : [],
                }),
          );
    if (url.endsWith("/like"))
      return new Promise<Response>((resolve, fail) => {
        finish = resolve;
        reject = fail;
      });
    return Promise.resolve(
      Response.json({
        videos: [{ ...video, likeCount: options.liked ? 1 : 0 }],
      }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrap = () => (
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={options.locale ?? "en"}>
        {options.compact ? <WikiVideoPlaybackLike identity={identity} video={video} /> : <WikiVideoPanel wikiTitle="Momo" {...identity} />}
      </I18nProvider>
    </QueryClientProvider>
  );
  render(wrap());
  return {
    fetcher,
    client,
    reject: () => reject(new Error("network")),
    takeState: () => finishState,
    finish: (response: Response) => finish(response),
    finishState: (response: Response) => finishState(response),
    wrap,
  };
};
afterEach(() => {
  cleanup();
  useAuthStore.setState({ status: "guest", identity: null, sessionVersion: 0 });
  vi.unstubAllGlobals();
});
const heart = () =>
  screen.getByRole("button", { name: /^(Like|Unlike): Video$/ });
const ready = async () => {
  await screen.findByRole("heading", { name: "Video" });
  await waitFor(() => expect(heart()).toBeEnabled());
};
it("optimistically likes/unlikes, prevents duplicate sends and updates filter caches without refetch", async () => {
  const state = setup();
  await ready();
  const personalKey = state.client
    .getQueryCache()
    .find({ queryKey: ["wiki-video-likes"], exact: false })!.queryKey;
  const relatedKey = [
    personalKey[0],
    personalKey[1],
    [video.videoLinkIdentifier, "other"],
  ];
  const unrelatedKey = [personalKey[0], personalKey[1], ["other"]];
  state.client.setQueryData(relatedKey, []);
  state.client.setQueryData(unrelatedKey, []);
  state.client.setQueryData([...key, { minDurationSeconds: 60 }], {
    videos: [video],
  });
  fireEvent.click(heart());
  fireEvent.click(heart());
  await waitFor(() => expect(heart()).toHaveAttribute("aria-pressed", "true"));
  expect(heart()).toBeDisabled();
  expect(within(heart()).getByText("1")).toBeInTheDocument();
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.filter(([url]) => url.endsWith("/like")),
    ).toHaveLength(1),
  );
  const reads = state.fetcher.mock.calls.filter(
    ([url]) => !url.endsWith("/like"),
  ).length;
  await act(async () => state.finish(new Response(null, { status: 204 })));
  await waitFor(() => expect(heart()).toBeEnabled());
  expect(
    state.client.getQueryData<{ videos: (typeof video)[] }>([
      ...key,
      { minDurationSeconds: 60 },
    ])?.videos[0].likeCount,
  ).toBe(1);
  expect(state.client.getQueryData(relatedKey)).toEqual([
    video.videoLinkIdentifier,
  ]);
  expect(state.client.getQueryData(unrelatedKey)).toEqual([]);
  fireEvent.click(heart());
  await waitFor(() => expect(heart()).toHaveAttribute("aria-pressed", "false"));
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.filter(([url]) => url.endsWith("/like")),
    ).toHaveLength(2),
  );
  await act(async () => state.finish(new Response(null, { status: 204 })));
  await waitFor(() => expect(heart()).toBeEnabled());
  expect(within(heart()).getByText("0")).toBeInTheDocument();
  expect(
    state.fetcher.mock.calls.filter(([url]) => !url.endsWith("/like")),
  ).toHaveLength(reads);
});
it.each([0, 401, 403, 404])(
  "rolls back a failed mutation (%i) and shows a localized error",
  async (status) => {
    const state = setup({ liked: true });
    await ready();
    fireEvent.click(heart());
    await waitFor(() =>
      expect(heart()).toHaveAttribute("aria-pressed", "false"),
    );
    await waitFor(() =>
      expect(
        state.fetcher.mock.calls.some(([url]) => url.endsWith("/like")),
      ).toBe(true),
    );
    await act(async () =>
      status ? state.finish(Response.json({}, { status })) : state.reject(),
    );
    await waitFor(() =>
      expect(heart()).toHaveAttribute("aria-pressed", "true"),
    );
    expect(within(heart()).getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update the like",
    );
  },
);
it("does not assume unliked while the personal state is loading", async () => {
  const state = setup({ pendingState: true });
  await screen.findByText("Video");
  expect(heart()).toBeDisabled();
  expect(heart()).not.toHaveAttribute("aria-pressed");
  expect(screen.getByRole("status")).toHaveTextContent("Loading likes");
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.some(([url]) => url.includes("/likes?")),
    ).toBe(true),
  );
  await act(async () =>
    state.finishState(
      Response.json({ likedVideoLinkIdentifiers: [video.videoLinkIdentifier] }),
    ),
  );
  await ready();
  expect(heart()).toHaveAttribute("aria-pressed", "true");
});
it("offers retry when the personal state fails, without enabling an unknown like", async () => {
  const state = setup({ stateFailure: true });
  await screen.findByText("Video");
  await screen.findByText("Could not load likes.");
  expect(heart()).toBeDisabled();
  state.fetcher.mockImplementation((url: string) =>
    Promise.resolve(
      Response.json(
        url.includes("/likes?")
          ? { likedVideoLinkIdentifiers: [video.videoLinkIdentifier] }
          : {},
      ),
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry likes" }));
  await ready();
  expect(heart()).toHaveAttribute("aria-pressed", "true");
});
for (const compact of [false, true]) {
  it.each([
    [{ guest: true }, "To like videos, log in and activate Wiki collaborator access."],
    [{ missingCollaborator: true }, "To like videos, activate Wiki collaborator access."],
    [{ denied: true }, "You do not have permission to change likes on this video."],
  ] as const)("explains unavailable likes after a click (%o, compact: " + compact + ")", async (options, message) => {
    const state = setup({ ...options, compact });
    await waitFor(() => expect(heart()).toBeEnabled());
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.click(heart());
    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(heart()).toHaveAccessibleDescription(message);
    fireEvent.click(screen.getByText(message));
    expect(screen.getByRole("status")).toHaveTextContent(message);
    fireEvent.click(document.body);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(heart()).not.toHaveAttribute("aria-describedby");
    fireEvent.click(heart());
    expect(screen.getByRole("status")).toHaveTextContent(message);
    fireEvent.focusIn(document.body);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.click(heart());
    fireEvent.blur(window);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    if (!compact) expect(within(heart()).getByText("0")).toBeInTheDocument();
    expect(state.fetcher.mock.calls.some(([url]) => url.endsWith("/like"))).toBe(false);
    if (!("denied" in options)) {
      expect(state.fetcher.mock.calls.some(([url]) => url.includes("/likes?"))).toBe(false);
    }
  });
}
it("discards an old session's optimistic count and late response after logout", async () => {
  const state = setup();
  await ready();
  fireEvent.click(heart());
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.some(([url]) => url.endsWith("/like")),
    ).toBe(true),
  );
  act(() => useAuthStore.getState().clearIdentity());
  expect(
    state.fetcher.mock.calls.find(([url]) => url.endsWith("/like"))?.[1].signal
      .aborted,
  ).toBe(true);
  expect(heart()).toBeEnabled();
  expect(heart()).not.toHaveAttribute("aria-pressed");
  expect(within(heart()).getByText("0")).toBeInTheDocument();
  await act(async () => state.finish(new Response(null, { status: 204 })));
  expect(within(heart()).getByText("0")).toBeInTheDocument();
});
it("keeps the playing video and duration filter intact during a like", async () => {
  const state = setup();
  const destroy = vi.fn(),
    loadVideoById = vi.fn();
  vi.stubGlobal("YT", {
    Player: vi.fn(function () {
      return { destroy, loadVideoById, playVideo: vi.fn() };
    }),
  });
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Play: Video" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Stop playback" }),
    ).toBeInTheDocument(),
  );
  const minimum = screen.getByRole("slider", {
    name: "Minimum duration (minutes)",
  });
  fireEvent.change(minimum, { target: { value: "1" } });
  const playbackHeart = () => within(screen.getByRole("region", { name: "Now playing" })).getByRole("button", { name: /^(Like|Unlike): Video$/ });
  await waitFor(() => expect(playbackHeart()).toBeEnabled());
  fireEvent.click(playbackHeart());
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.some(([url]) => url.endsWith("/like")),
    ).toBe(true),
  );
  await act(async () => state.finish(new Response(null, { status: 204 })));
  await waitFor(() => expect(playbackHeart()).toBeEnabled());
  expect(minimum).toHaveValue("1");
  expect(
    screen.getByRole("button", { name: "Stop playback" }),
  ).toBeInTheDocument();
  expect(destroy).not.toHaveBeenCalled();
  expect(loadVideoById).not.toHaveBeenCalled();
});
it("ignores the old account's late personal-state read", async () => {
  const state = setup({ pendingState: true });
  await screen.findByText("Video");
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.some(([url]) => url.includes("/likes?")),
    ).toBe(true),
  );
  const old = state.takeState();
  act(() =>
    useAuthStore
      .getState()
      .setIdentity(
        parseAuthenticatedIdentitySummary(wikiVideoAuthenticatedIdentity),
      ),
  );
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.filter(([url]) => url.includes("/likes?")),
    ).toHaveLength(2),
  );
  await act(async () =>
    state.finishState(Response.json({ likedVideoLinkIdentifiers: [] })),
  );
  await ready();
  await act(async () =>
    old(
      Response.json({ likedVideoLinkIdentifiers: [video.videoLinkIdentifier] }),
    ),
  );
  expect(heart()).toHaveAttribute("aria-pressed", "false");
});
it("does not double-apply the optimistic delta when a list snapshot arrives during a write", async () => {
  const state = setup();
  await ready();
  fireEvent.click(heart());
  await waitFor(() => expect(heart()).toHaveAttribute("aria-pressed", "true"));
  act(() =>
    state.client.setQueryData([...key, {}], {
      videos: [{ ...video, likeCount: 1, hasOfficialOwnerLike: false }],
    }),
  );
  await waitFor(() =>
    expect(within(heart()).getByText("1")).toBeInTheDocument(),
  );
  await act(async () => state.finish(new Response(null, { status: 204 })));
  await ready();
  expect(within(heart()).getByText("1")).toBeInTheDocument();
});
it("does not let a previous account's late mutation affect a new account", async () => {
  const state = setup();
  await ready();
  fireEvent.click(heart());
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.some(([url]) => url.endsWith("/like")),
    ).toBe(true),
  );
  const next = parseAuthenticatedIdentitySummary(
    wikiVideoAuthenticatedIdentity,
  );
  act(() => useAuthStore.getState().setIdentity(next));
  await ready();
  expect(heart()).toHaveAttribute("aria-pressed", "false");
  await act(async () => state.finish(new Response(null, { status: 204 })));
  expect(within(heart()).getByText("0")).toBeInTheDocument();
});
it("ignores an old mutation even when its original session key becomes current again", async () => {
  const state = setup();
  await ready();
  fireEvent.click(heart());
  await waitFor(() =>
    expect(
      state.fetcher.mock.calls.some(([url]) => url.endsWith("/like")),
    ).toBe(true),
  );
  act(() => useAuthStore.setState({ sessionVersion: 2 }));
  await ready();
  act(() => useAuthStore.setState({ sessionVersion: 1 }));
  await ready();
  await act(async () => state.finish(new Response(null, { status: 204 })));
  expect(within(heart()).getByText("0")).toBeInTheDocument();
});
it.each([
  ["ja", "いいね"],
  ["ko", "좋아요"],
] as const)("localizes the heart in %s", async (locale, label) => {
  setup({ locale });
  const button = await screen.findByRole("button", { name: `${label}: Video` });
  await waitFor(() => expect(button).toBeEnabled());
});

it("shares optimistic like state between the icon-only playback control and the card", async () => {
  const state = setup();
  await ready();
  const card = within(screen.getByRole("heading", { name: "Video" }).closest("li")!);
  const playback = render(
    <QueryClientProvider client={state.client}>
      <I18nProvider initialLocale="en">
        <WikiVideoPlaybackLike identity={identity} video={video} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  const compact = within(playback.container);
  await waitFor(() => expect(compact.getByRole("button", { name: "Like: Video" })).toBeEnabled());
  expect(compact.getByRole("button")).toHaveTextContent("");
  fireEvent.click(compact.getByRole("button"));
  await waitFor(() => expect(card.getByRole("button", { name: "Unlike: Video" })).toBeDisabled());
  expect(card.getByRole("button", { name: "Unlike: Video" })).toHaveTextContent("1");
  await waitFor(() => expect(state.fetcher.mock.calls.some(([url]) => url.endsWith("/like"))).toBe(true));
  await act(async () => state.finish(new Response(null, { status: 204 })));
  await waitFor(() => expect(compact.getByRole("button", { name: "Unlike: Video" })).toBeEnabled());
  fireEvent.click(card.getByRole("button", { name: "Unlike: Video" }));
  await waitFor(() => expect(compact.getByRole("button", { name: "Like: Video" })).toBeDisabled());
  await act(async () => state.finish(new Response(null, { status: 204 })));
  await waitFor(() => expect(compact.getByRole("button", { name: "Like: Video" })).toBeEnabled());
  expect(compact.getByRole("button")).toHaveTextContent("");
  expect(card.getByRole("button", { name: "Like: Video" })).toHaveTextContent("0");
});
