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
import { afterEach, expect, it, vi } from "vitest";
import { WikiVideoPanel } from "./index";
import { WikiVideoPlaybackLike } from "./WikiVideoLikeControl";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { WikiVideo } from "@/gateways/wiki/wikiVideos";
const id = "00000000-0000-4000-8000-000000000001";
const video: WikiVideo = {
  provider: "youtube",
  externalVideoId: "abcdefghijk",
  videoLinkIdentifier: id,
  likeCount: 4,
  hasOfficialOwnerLike: true,
  url: "https://youtu.be/abcdefghijk",
  title: "Short video",
  thumbnailUrl: null,
  publishedAt: null,
  durationSeconds: 30,
  creatorPrincipalIdentifier: id,
  creatorIdentityName: "Fan",
  videoUsage: "short",
};
const identity = {
  language: "en",
  resourceType: "talent" as const,
  slug: "tl-test",
};
import type { VideoWatchRequestStatus } from "@/gateways/wiki/wikiVideoWatchRequests";
const available: VideoWatchRequestStatus = {
  videoLinkIdentifier: id,
  sent: false,
  canSend: true,
  reason: null,
  lastSentAt: null,
  nextSendAt: null,
  remainingRequests: 3,
  unlikeRestrictedUntil: null,
  deleteRestrictedUntil: null,
};
const setup = (
  options: {
    video?: Partial<WikiVideo>;
    state?: Partial<typeof available>;
    compact?: boolean;
    failSend?: boolean;
    failDelete?: boolean;
    guest?: boolean;
    denied?: boolean;
    sendResponse?: Promise<Response>;
    locale?: "ja" | "en" | "ko";
  } = {},
) => {
  useAuthStore.setState({
    status: options.guest ? "guest" : "authenticated",
    identity: null,
    sessionVersion: 1,
  });
  document.cookie = "XSRF-TOKEN=*** path=/";
  let sent = false;
  let liked = true;
  let snapshot = options.state;
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.includes("delete-access"))
      return Response.json({ canDelete: true, principalIdentifier: id });
    if (url.includes("like-access"))
      return Response.json({
        canLike: true,
        canUnlike: true,
        principalIdentifier: id,
      });
    if (url.includes("/likes?"))
      return Response.json({ likedVideoLinkIdentifiers: liked ? [id] : [] });
    if (url.endsWith("/watch-requests") && init?.method === "POST") {
      if (options.failSend) return Response.json({}, { status: 409 });
      sent = true;
      if (options.sendResponse) return options.sendResponse;
      return new Response(null, { status: 204 });
    }
    if (
      url.endsWith(`/videos/${id}`) &&
      init?.method === "DELETE" &&
      options.failDelete
    )
      return Response.json({}, { status: 409 });
    if (url.endsWith("/like")) {
      liked = init?.method === "POST";
      return new Response(null, { status: 204 });
    }
    if (url.includes("watch-requests?"))
      return options.denied
        ? Response.json({}, { status: 403 })
        : Response.json({
            videoWatchRequests: [
              {
                ...available,
                ...snapshot,
                ...(sent
                  ? {
                      sent: true,
                      canSend: false,
                      reason: "resend_not_available",
                      remainingRequests: 2,
                      unlikeRestrictedUntil: "2099-01-01",
                      deleteRestrictedUntil: "2099-01-01",
                    }
                  : {}),
              },
            ],
          });
    return Response.json({
      videos: [{ ...video, hasOfficialOwnerLike: liked, ...options.video }],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <I18nProvider initialLocale={options.locale ?? "en"}>
        {options.compact ? (
          <WikiVideoPlaybackLike
            identity={identity}
            video={{ ...video, ...options.video }}
          />
        ) : (
          <WikiVideoPanel wikiTitle="Momo" {...identity} />
        )}
      </I18nProvider>
    </QueryClientProvider>,
  );
  return {
    fetcher,
    client,
    updateSnapshot: (state: Partial<VideoWatchRequestStatus>) => {
      snapshot = state;
    },
  };
};
afterEach(() => {
  cleanup();
  useAuthStore.setState({ status: "guest", identity: null, sessionVersion: 0 });
  vi.unstubAllGlobals();
});
it("disables requests for a video already watched by its official owner", async () => {
  const { fetcher } = setup({ state: { canSend: false, reason: "already_watched", sent: true } });
  const button = await screen.findByRole("button", { name: "Watched by the official owner" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(fetcher.mock.calls.some(([url, init]) => url.endsWith("/watch-requests") && init?.method === "POST")).toBe(false);
});
it("shows the owner's liked status to the left of the ordinary like count", async () => {
  setup({ locale: "ja" });
  const ownerLike = await screen.findByText("本人がいいね済み");
  const ordinaryLike = await screen.findByRole("button", { name: "いいねを解除: Short video" });
  expect(ordinaryLike).toHaveTextContent("4");
  expect(ownerLike.compareDocumentPosition(ordinaryLike) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(ordinaryLike).not.toHaveTextContent("本人がいいね済み");
});

it("omits the owner's liked status when the owner has not liked the video", async () => {
  setup({ locale: "ja", video: { hasOfficialOwnerLike: false } });
  await screen.findByRole("button", { name: "いいねを解除: Short video" });
  expect(screen.queryByText("本人がいいね済み")).not.toBeInTheDocument();
});

it.each([29, 30])(
  "sends %i-second liked manual video, refreshes authoritative quota/restrictions and separates official likes",
  async (durationSeconds) => {
    const { fetcher } = setup({ video: { durationSeconds } });
    const send = await screen.findByRole("button", {
      name: /Send watch request/,
    });
    await waitFor(() => expect(send).toBeEnabled());
    expect(screen.queryByText(/Requests remaining/)).not.toBeInTheDocument();
    fireEvent.click(send);
    fireEvent.click(send);
    await screen.findByText("Request sent");
    expect(
      fetcher.mock.calls.filter(
        ([url, init]) =>
          url.endsWith("/watch-requests") && init?.method === "POST",
      ),
    ).toHaveLength(1);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith("/like")),
    ).toHaveLength(0);
    expect(screen.getByText("Liked by the official owner")).toBeInTheDocument();
    const heart = screen.getByRole("button", { name: "Unlike: Short video" });
    const remove = screen.getByRole("button", { name: "Delete video: Short video" });
    const unlikeMessage = "You cannot unlike for 7 days after sending a request.";
    const deleteMessage = "An active watch request prevents deletion.";
    expect(heart).toBeEnabled();
    expect(remove).toBeEnabled();
    expect(screen.queryByText(unlikeMessage)).not.toBeInTheDocument();
    expect(screen.queryByText(deleteMessage)).not.toBeInTheDocument();
    fireEvent.click(heart);
    expect(heart).toHaveAccessibleDescription(unlikeMessage);
    expect(screen.getByText(unlikeMessage)).toBeInTheDocument();
    fireEvent.keyDown(heart, { key: "Escape" });
    expect(screen.queryByText(unlikeMessage)).not.toBeInTheDocument();
    fireEvent.click(remove);
    expect(remove).toHaveAccessibleDescription(deleteMessage);
    expect(screen.getByText(deleteMessage)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(document.body);
    expect(screen.queryByText(deleteMessage)).not.toBeInTheDocument();
    fireEvent.click(remove);
    fireEvent.keyDown(remove, { key: "Escape" });
    expect(screen.queryByText(deleteMessage)).not.toBeInTheDocument();
    expect(fetcher.mock.calls.some(([url]) => url.endsWith("/like"))).toBe(false);
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  },
);
it.each([31, null])(
  "cannot send duration %s even if a stale server snapshot allows sending",
  async (durationSeconds) => {
    const { fetcher } = setup({ video: { durationSeconds } });
    const send = await screen.findByRole("button", {
      name: /Send watch request/,
    });
    expect(send).toBeEnabled();
    expect(screen.queryByText(/A known duration/)).not.toBeInTheDocument();
    fireEvent.click(send);
    expect(send).toHaveAccessibleDescription("A known duration of 30 seconds or less is required.");
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  },
);
it.each(["like_required", "weekly_limit_reached", "resend_not_available"])(
  "explains server denial %s only after a click without sending",
  async (reason) => {
    const { fetcher } = setup({
      state: {
        canSend: false,
        reason: reason as VideoWatchRequestStatus["reason"],
        remainingRequests: reason === "weekly_limit_reached" ? 0 : 3,
        nextSendAt: "2099-01-01",
      },
    });
    const send = await screen.findByRole("button", {
      name: /Send watch request/,
    });
    const message = reason === "weekly_limit_reached"
      ? "You have already sent three watch requests to Momo in the last 7 days. You cannot send any more yet."
      : reason === "like_required"
        ? "Like this video first."
        : "Wait before sending again for this video.";
    expect(send).toBeEnabled();
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(screen.queryByText(/Requests remaining/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next request available/)).not.toBeInTheDocument();
    fireEvent.click(send);
    expect(send).toHaveAccessibleDescription(new RegExp(message));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByText(/Next request available/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(message));
    expect(screen.getByText(message)).toBeInTheDocument();
    fireEvent.keyDown(send, { key: "Escape" });
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.click(send);
    fireEvent.click(document.body);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.click(send);
    fireEvent.focusIn(document.body);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.click(send);
    fireEvent.blur(window);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(send).not.toHaveAttribute("aria-describedby");
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  },
);
it("does not expose sending on ineligible wiki or automatic video", async () => {
  setup({ state: { canSend: false, reason: "target_not_eligible" } });
  await screen.findByRole("heading", { name: "Short video" });
  await waitFor(() =>
    expect(
      screen.queryByText("Loading watch requests…"),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: /Send watch request/ }),
  ).not.toBeInTheDocument();
});
it("shows send failure without an optimistic sent state", async () => {
  setup({ failSend: true });
  const send = await screen.findByRole("button", {
    name: /Send watch request/,
  });
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.click(send);
  await screen.findByText(/Could not send/);
  expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
});
it.each([true, false])("mini-player shows an owner-like icon only when liked (%s)", async (hasOfficialOwnerLike) => {
  setup({ compact: true, locale: "ja", video: { hasOfficialOwnerLike } });
  const heart = await screen.findByRole("button", { name: "いいねを解除: Short video" });
  const ownerLike = screen.queryByRole("img", { name: "本人がいいね済み" });
  if (hasOfficialOwnerLike) {
    expect(ownerLike).toBeInTheDocument();
    expect(ownerLike!.compareDocumentPosition(heart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ownerLike).toHaveTextContent("");
  } else {
    expect(ownerLike).not.toBeInTheDocument();
  }
  expect(screen.queryByText("本人がいいね済み")).not.toBeInTheDocument();
  expect(heart).toHaveTextContent("");
});

it("mini-player has no send control and respects personal unlike restriction", async () => {
  const { fetcher } = setup({
    compact: true,
    state: { sent: true, canSend: false, unlikeRestrictedUntil: "2099-01-01" },
  });
  const heart = await screen.findByRole("button", {
    name: /Unlike: Short video/,
  });
  await waitFor(() => expect(heart).toBeEnabled());
  const message = "You cannot unlike for 7 days after sending a request.";
  expect(screen.queryByText(message)).not.toBeInTheDocument();
  fireEvent.click(heart);
  expect(heart).toHaveAccessibleDescription(message);
  expect(fetcher.mock.calls.some(([url]) => url.endsWith("/like"))).toBe(false);
  expect(
    screen.queryByRole("button", { name: /Send watch request/ }),
  ).not.toBeInTheDocument();
});

it.each([
  { guest: true },
  { denied: true },
  { video: { videoUsage: "youtube_auto_recent_popular" as const } },
])(
  "never enables send for guest, denied or automatic targets (%j)",
  async (options) => {
    const { fetcher } = setup(options);
    await screen.findByRole("heading", { name: "Short video" });
    if (options.denied)
      await screen.findByText(/Could not load watch requests/);
    expect(
      screen.queryByRole("button", { name: /Send watch request/ }),
    ).not.toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(
        ([url, init]) =>
          url.endsWith("/watch-requests") && init?.method === "POST",
      ),
    ).toHaveLength(0);
  },
);
it("unlocks only after refreshed authoritative seven-day state, never by the browser clock", async () => {
  const { client, updateSnapshot } = setup({
    state: {
      sent: true,
      canSend: false,
      reason: "resend_not_available",
      unlikeRestrictedUntil: "2000-01-01",
      deleteRestrictedUntil: "2000-01-01",
    },
  });
  const heart = await screen.findByRole("button", {
    name: /Unlike: Short video/,
  });
  const sentButton = await screen.findByRole("button", { name: "Request sent" });
  fireEvent.click(sentButton);
  expect(screen.getByText("Wait before sending again for this video.")).toBeInTheDocument();
  expect(heart).toBeEnabled();
  fireEvent.click(heart);
  expect(screen.getByText("You cannot unlike for 7 days after sending a request.")).toBeInTheDocument();
  updateSnapshot({
    sent: false,
    canSend: true,
    reason: null,
    remainingRequests: 3,
    unlikeRestrictedUntil: null,
    deleteRestrictedUntil: null,
  });
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["wiki-video-watch-requests"] });
  });
  await waitFor(() => expect(heart).toBeEnabled());
  expect(screen.queryByText("Wait before sending again for this video.")).not.toBeInTheDocument();
  expect(screen.queryByText("You cannot unlike for 7 days after sending a request.")).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Send watch request" }),
  ).toBeEnabled();
});

it("keeps the heart state and watch request button visible while refreshing after a like change", async () => {
  const { fetcher } = setup();
  const heart = await screen.findByRole("button", { name: "Unlike: Short video" });
  await waitFor(() => expect(heart).toBeEnabled());
  const watchButton = await screen.findByRole("button", { name: "Send watch request" });
  const originalFetch = fetcher.getMockImplementation()!;
  let finish!: () => void;
  const refreshing = new Promise<void>((resolve) => { finish = resolve; });
  let personalRefreshStarted = false;
  let watchRefreshStarted = false;
  fetcher.mockImplementation(async (url: string, init?: RequestInit) => {
    const response = await originalFetch(url, init);
    if (url.includes("/likes?")) {
      personalRefreshStarted = true;
      await refreshing;
    }
    if (url.includes("watch-requests?")) {
      watchRefreshStarted = true;
      await refreshing;
    }
    return response;
  });
  fireEvent.click(heart);
  await waitFor(() => {
    expect(personalRefreshStarted).toBe(true);
    expect(watchRefreshStarted).toBe(true);
  });
  expect(screen.getByRole("button", { name: "Like: Short video" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Like: Short video" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Send watch request" })).toBe(watchButton);
  expect(watchButton).toBeDisabled();
  expect(watchButton).toHaveAttribute("aria-busy", "false");
  await act(async () => { finish(); });
  await waitFor(() => expect(screen.getByRole("button", { name: "Like: Short video" })).toBeEnabled());
  expect(screen.getByRole("button", { name: "Like: Short video" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Send watch request" })).toBeEnabled();
});

it("uses authoritative owner-like flag/count after unlike rather than decrementing ordinary likes", async () => {
  setup();
  const heart = await screen.findByRole("button", {
    name: "Unlike: Short video",
  });
  await waitFor(() => expect(heart).toBeEnabled());
  fireEvent.click(heart);
  const add = await screen.findByRole("button", { name: "Like: Short video" });
  await waitFor(() => expect(add).toBeEnabled());
  expect(add).toHaveTextContent("4");
  expect(
    screen.queryByText("Liked by the official owner"),
  ).not.toBeInTheDocument();
});
it("aborts a pending send on session change and ignores late completion", async () => {
  let finish!: (response: Response) => void;
  const response = new Promise<Response>((resolve) => {
    finish = resolve;
  });
  const { fetcher } = setup({ sendResponse: response });
  const send = await screen.findByRole("button", {
    name: "Send watch request",
  });
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.click(send);
  await waitFor(() =>
    expect(
      fetcher.mock.calls.some(
        ([url, init]) =>
          url.endsWith("/watch-requests") && init?.method === "POST",
      ),
    ).toBe(true),
  );
  const call = fetcher.mock.calls.find(
    ([url, init]) => url.endsWith("/watch-requests") && init?.method === "POST",
  )!;
  await act(async () => {
    useAuthStore.setState({
      status: "guest",
      identity: null,
      sessionVersion: 2,
    });
  });
  expect(call[1]?.signal?.aborted).toBe(true);
  const reads = fetcher.mock.calls.length;
  await act(async () => {
    finish(new Response(null, { status: 204 }));
  });
  expect(fetcher.mock.calls).toHaveLength(reads);
  expect(screen.queryByText("Request sent")).not.toBeInTheDocument();
});
it("shares pending sends across filter remounts without duplicate POST", async () => {
  let finish!: (response: Response) => void;
  const { fetcher } = setup({
    sendResponse: new Promise<Response>((resolve) => {
      finish = resolve;
    }),
  });
  const send = await screen.findByRole("button", {
    name: "Send watch request",
  });
  await waitFor(() => expect(send).toBeEnabled());
  fireEvent.click(send);
  await screen.findByRole("button", { name: "Sending…" });
  fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
  const pending = await screen.findByRole("button", { name: "Sending…" });
  expect(pending).toBeDisabled();
  expect(pending).toHaveAttribute("aria-busy", "true");
  fireEvent.click(pending);
  await act(async () => {
    finish(new Response(null, { status: 204 }));
  });
  await screen.findByText("Request sent");
  expect(
    fetcher.mock.calls.filter(
      ([url, init]) =>
        url.endsWith("/watch-requests") && init?.method === "POST",
    ),
  ).toHaveLength(1);
});
it.each([
  ["ja", "これみて！"],
  ["ko", "이거 봐!"],
] as const)("localizes request control in %s", async (locale, label) => {
  setup({ locale });
  expect(await screen.findByRole("button", { name: label })).toBeEnabled();
});

it("explains a server-rejected deletion when a request became active after the last snapshot", async () => {
  setup({ failDelete: true });
  const button = await screen.findByRole("button", {
    name: "Delete video: Short video",
  });
  fireEvent.click(button);
  fireEvent.click(screen.getByRole("button", { name: /^Delete$/ }));
  await screen.findByText("An active watch request prevents deletion.");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it.each([
  ["ja", "これみて！", "Momoには直近7日間で3件送信済みのため、これ以上送信できません。"],
  ["en", "Send watch request", "You have already sent three watch requests to Momo in the last 7 days. You cannot send any more yet."],
  ["ko", "이거 봐!", "Momo에게 최근 7일간 이미 3개의 시청 요청을 보내 더 이상 보낼 수 없습니다."],
] as const)("names the wiki and explains the reached quota in %s", async (locale, label, message) => {
  const { fetcher } = setup({
    locale,
    state: { canSend: false, reason: "weekly_limit_reached", remainingRequests: 0 },
  });
  const send = await screen.findByRole("button", { name: label });
  expect(screen.queryByText(message)).not.toBeInTheDocument();
  fireEvent.click(send);
  expect(send).toHaveAccessibleDescription(message);
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});
