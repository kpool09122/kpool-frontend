import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PopularVideosSection } from "./PopularVideosSection";
import type { PopularVideo } from "@/gateways/wiki/popularVideos";

const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("@/components/VideoPlayback/VideoPlaybackProvider", () => ({
  useVideoPlayback: () => ({ store: { getState: () => ({ start: mocks.start }) } }),
  usePlaybackOwner: vi.fn(),
  PlaybackOutlet: () => null,
  VideoPlaybackProvider: ({ children }: { children: React.ReactNode }) => children,
}));
const video: PopularVideo = {
  videoLinkIdentifier: "01965bb2-bcc9-7c6f-8b90-89f7f217f101",
  provider: "youtube", externalVideoId: "abcdefghijk",
  url: "https://www.youtube.com/watch?v=abcdefghijk", title: "Aurora live",
  thumbnailUrl: null, durationSeconds: 120, likeCount: 42, language: "ja", slug: "gr-aurora",
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("links the title to the source wiki video tab and starts thumbnail playback", () => {
  render(<PopularVideosSection locale="ja" state={{ status: "success", videos: [video] }} />);
  expect(screen.getByRole("region", { name: "ピックアップ動画" })).toBeInTheDocument();
  expect(screen.getByText("2:00")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Aurora live" })).toHaveAttribute("href", "/ja/wiki/gr-aurora?tab=video");
  fireEvent.click(screen.getByRole("button", { name: "再生: Aurora live" }));
  expect(mocks.start).toHaveBeenCalledWith("home-popular-videos:ja", [{
    identifier: video.videoLinkIdentifier, provider: "youtube", videoId: "abcdefghijk", title: "Aurora live",
  }], "single");
});
it("can play a TikTok video with unknown duration and no thumbnail", () => {
  render(<PopularVideosSection locale="en" state={{ status: "success", videos: [{ ...video, provider: "tiktok", externalVideoId: "6718335390845095173", thumbnailUrl: null, durationSeconds: null }] }} />);
  fireEvent.click(screen.getByRole("button", { name: "Play: Aurora live" }));
  expect(mocks.start).toHaveBeenCalledWith("home-popular-videos:en", [expect.objectContaining({ provider: "tiktok", videoId: "6718335390845095173" })], "single");
});
it("distinguishes an empty ranking from an API failure", () => {
  const view = render(<PopularVideosSection locale="ko" state={{ status: "success", videos: [] }} />);
  expect(screen.getByText("아직 영상이 없습니다.")).toBeInTheDocument();
  view.rerender(<PopularVideosSection locale="ko" state={{ status: "error" }} />);
  expect(screen.getByText(/영상을 불러올 수 없습니다/)).toBeInTheDocument();
  expect(screen.queryByText("아직 영상이 없습니다.")).not.toBeInTheDocument();
});

it("keeps the source wiki language when the home language differs", () => {
  render(<PopularVideosSection locale="ja" state={{ status: "success", videos: [{ ...video, language: "ko", slug: "gr-twice" }] }} />);
  expect(screen.getByRole("link", { name: "Aurora live" })).toHaveAttribute("href", "/ko/wiki/gr-twice?tab=video");
});
