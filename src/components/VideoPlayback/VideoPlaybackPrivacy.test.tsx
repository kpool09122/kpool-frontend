import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  VideoPlaybackProvider,
  useVideoPlayback,
} from "./VideoPlaybackProvider";
import { useAuthStore } from "@/gateways/auth/authStore";
import type { PlaybackStore } from "./playbackStore";
import { useEffect } from "react";
import { dictionaries } from "@/i18n/dictionaries";
import type { AuthenticatedIdentitySummary } from "@/gateways/identity/identityApi";
import { miniPlayerStorageKey } from "./playbackPersistence";
vi.mock("@/i18n/I18nProvider", () => ({
  useI18n: () => ({ dictionary: dictionaries.en }),
}));
vi.mock("./YouTubeQueuePlayer", () => ({ YouTubeQueuePlayer: () => null }));
let store: PlaybackStore;
const originalRefreshIdentity = useAuthStore.getState().refreshIdentity;
function Capture() {
  const context = useVideoPlayback()!;
  useEffect(() => {
    store = context.store;
  }, [context]);
  return null;
}
beforeEach(() =>
  useAuthStore.setState({
    status: "authenticated",
    identity: null,
    sessionVersion: 1,
  }),
);
afterEach(() => {
  cleanup();
  useAuthStore.setState({ refreshIdentity: originalRefreshIdentity });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([true, false])("checks identity and resolves private playback on a public page (same identity: %s)", async (sameIdentity) => {
  const identity = {
    identityIdentifier: "identity", accountIdentifier: "account", accountPrincipalIdentifier: "principal",
  } as AuthenticatedIdentitySummary;
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
  useAuthStore.setState({ status: "authenticated", identity });
  const tree = <VideoPlaybackProvider><Capture /><main>Home page</main></VideoPlaybackProvider>;
  const view = render(tree);
  act(() => {
    store.getState().start("private-playlist:owner:list", [{ identifier: "one", videoId: "abcdefghijk", title: "Private video" }], "queue");
    store.getState().detach();
  });
  view.unmount();
  expect(values.has(miniPlayerStorageKey)).toBe(true);
  useAuthStore.setState({ status: "loading", identity: null });
  let completeCheck: (() => void) | undefined;
  const refresh = vi.fn<typeof originalRefreshIdentity>(() => new Promise((resolve) => {
    completeCheck = () => {
      const checked = sameIdentity ? identity : null;
      useAuthStore.getState().setIdentity(checked);
      resolve(checked);
    };
  }));
  useAuthStore.setState({ refreshIdentity: refresh });
  render(tree);
  expect(screen.getByText("Home page")).toBeInTheDocument();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("region", { name: "Mini player" })).toBeNull();
  await act(async () => { completeCheck!(); });
  await waitFor(() => expect(store.getState().session !== null).toBe(sameIdentity));
  expect(screen.queryByRole("region", { name: "Mini player" }) !== null).toBe(sameIdentity);
  expect(values.has(miniPlayerStorageKey)).toBe(sameIdentity);
});
it.each(["youtube", "tiktok"] as const)("stops floating private %s queues synchronously on logout but preserves public queues", (provider) => {
  render(
    <VideoPlaybackProvider>
      <Capture />
    </VideoPlaybackProvider>,
  );
  act(() => {
    store
      .getState()
      .start(
        "private-playlist:owner",
        [{ identifier: "one", provider, videoId: provider === "tiktok" ? "6718335390845095173" : "abcdefghijk", title: "Private" }],
        "queue",
      );
    store.getState().detach();
  });
  act(() => useAuthStore.getState().clearIdentity());
  expect(store.getState().session).toBeNull();
  act(() =>
    store
      .getState()
      .start(
        "public",
        [{ identifier: "one", videoId: "abcdefghijk", title: "Public" }],
        "queue",
      ),
  );
  act(() => useAuthStore.getState().clearIdentity());
  expect(store.getState().session?.owner).toBe("public");
});
