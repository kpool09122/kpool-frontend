import { useEffect } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiEmbedFrame } from "@/components/Wiki/WikiEmbedFrame";
import { VideoPlaybackProvider, useVideoPlayback } from "./VideoPlaybackProvider";
import type { PlaybackStore } from "./playbackStore";
vi.mock("./YouTubeQueuePlayer", () => ({ YouTubeQueuePlayer: () => <div data-testid="youtube-player" /> }));
afterEach(cleanup);
let store: PlaybackStore;
function Capture() { const context = useVideoPlayback()!; useEffect(() => { store = context.store; }, [context]); return null; }
it("TikTok body embeds take over the shared single session, detach and yield to YouTube", () => {
  render(<I18nProvider initialLocale="en"><VideoPlaybackProvider><Capture />
    <WikiEmbedFrame block={{ blockIdentifier: "tiktok", blockType: "embed", displayOrder: 0, provider: "tiktok", embedId: "https://www.tiktok.com/@scout2015/video/6718335390845095173", caption: "Body TikTok" }} />
    <WikiEmbedFrame block={{ blockIdentifier: "youtube", blockType: "embed", displayOrder: 0, provider: "youtube", embedId: "abcdefghijk", caption: "Body YouTube" }} />
  </VideoPlaybackProvider></I18nProvider>);
  expect(screen.queryByTitle("Body TikTok")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Play: Body TikTok" }));
  expect(store.getState().session).toMatchObject({ kind: "single", tracks: [{ provider: "tiktok", videoId: "6718335390845095173" }] });
  const frame = screen.getAllByTitle("Body TikTok").find((node) => node.tagName === "IFRAME")!;
  act(() => store.getState().detach());
  expect(screen.getAllByTitle("Body TikTok").find((node) => node.tagName === "IFRAME")!).toBe(frame);
  fireEvent.click(screen.getByRole("button", { name: "Play: Body YouTube" }));
  expect(frame.isConnected).toBe(false);
  expect(screen.getByTestId("youtube-player")).toBeInTheDocument();
  expect(store.getState().session?.tracks[0].provider).toBe("youtube");
});
