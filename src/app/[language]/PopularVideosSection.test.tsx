import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PopularVideosSection } from "./PopularVideosSection";
import type { PopularVideo } from "@/gateways/wiki/popularVideos";

vi.mock("embla-carousel-react", () => ({ default: () => [null, undefined] }));
vi.mock("@/components/VideoPlayback/YouTubePlayer", () => ({
  YouTubePlayer: ({ title, videoId }: { title: string; videoId: string }) => <iframe title={title} src={`https://www.youtube-nocookie.com/embed/${videoId}`} />,
}));
vi.mock("@/components/VideoPlayback/TikTokPlayer", () => ({
  TikTokPlayer: ({ title, videoId }: { title: string; videoId: string }) => <iframe title={title} src={`https://www.tiktok.com/player/v1/${videoId}`} />,
}));
const video: PopularVideo = {
  videoLinkIdentifier: "01965bb2-bcc9-7c6f-8b90-89f7f217f101",
  provider: "youtube", externalVideoId: "abcdefghijk",
  url: "https://www.youtube.com/watch?v=abcdefghijk", title: "Aurora live",
  thumbnailUrl: null, durationSeconds: 120, likeCount: 42, language: "ja", slug: "gr-aurora",
};
afterEach(cleanup);
it("plays inside the selected card and links the title to the source wiki video tab", () => {
  render(<PopularVideosSection locale="ja" state={{ status: "success", videos: [video] }} />);
  expect(screen.getByRole("region", { name: "ピックアップ動画" })).toBeInTheDocument();
  expect(screen.getByText("2:00")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Aurora live" })).toHaveAttribute("href", "/ja/wiki/gr-aurora?tab=video");
  expect(screen.queryByTitle("Aurora live")).not.toBeInTheDocument();
  const card = screen.getByRole("article");
  fireEvent.click(within(card).getByRole("button", { name: "再生: Aurora live" }));
  expect(within(card).getByTitle("Aurora live")).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/abcdefghijk");
});
it("plays a TikTok video in its original card", () => {
  render(<PopularVideosSection locale="en" state={{ status: "success", videos: [{ ...video, provider: "tiktok", externalVideoId: "6718335390845095173", durationSeconds: null }] }} />);
  fireEvent.click(screen.getByRole("button", { name: "Play: Aurora live" }));
  expect(within(screen.getByRole("article")).getByTitle("Aurora live")).toHaveAttribute("src", "https://www.tiktok.com/player/v1/6718335390845095173");
});
it("replaces the previous inline player when another card is played", () => {
  render(<PopularVideosSection locale="ja" state={{ status: "success", videos: [video, { ...video, videoLinkIdentifier: "01965bb2-bcc9-7c6f-8b90-89f7f217f102", title: "Second video" }] }} />);
  fireEvent.click(screen.getByRole("button", { name: "再生: Aurora live" }));
  fireEvent.click(screen.getByRole("button", { name: "再生: Second video" }));
  expect(screen.queryByTitle("Aurora live")).not.toBeInTheDocument();
  expect(screen.getByTitle("Second video")).toBeInTheDocument();
});
it("distinguishes an empty ranking from an API failure", () => {
  const view = render(<PopularVideosSection locale="ko" state={{ status: "success", videos: [] }} />);
  expect(screen.getByText("아직 영상이 없습니다.")).toBeInTheDocument();
  view.rerender(<PopularVideosSection locale="ko" state={{ status: "error" }} />);
  expect(screen.getByText(/영상을 불러올 수 없습니다/)).toBeInTheDocument();
});
it("keeps the source wiki language when the home language differs", () => {
  render(<PopularVideosSection locale="ja" state={{ status: "success", videos: [{ ...video, language: "ko", slug: "gr-twice" }] }} />);
  expect(screen.getByRole("link", { name: "Aurora live" })).toHaveAttribute("href", "/ko/wiki/gr-twice?tab=video");
});
