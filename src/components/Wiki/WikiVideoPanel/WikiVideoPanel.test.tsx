import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WikiVideoPanel } from "./index";
import { I18nProvider } from "@/i18n/I18nProvider";
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
  vi.unstubAllGlobals();
});
describe("WikiVideoPanel", () => {
  it("applies duration bounds only on search and distinguishes empty results", async () => {
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(Response.json({ videos: url.includes("minDurationSeconds") ? [] : [video] })),
    );
    vi.stubGlobal("fetch", fetcher);
    render(wrap(client()));
    await screen.findByText(video.title);
    fireEvent.change(screen.getByRole("slider", { name: "Minimum duration (minutes)" }), { target: { value: "10" } });
    fireEvent.change(screen.getByRole("slider", { name: "Maximum duration (minutes)" }), { target: { value: "20" } });
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Apply filter" }));
    await screen.findByText("No videos match this duration range.");
    const url = new URL(fetcher.mock.calls[1][0], "http://localhost");
    expect(url.searchParams.get("minDurationSeconds")).toBe("600");
    expect(url.searchParams.get("maxDurationSeconds")).toBe("1200");
    expect(screen.queryByText(video.title)).not.toBeInTheDocument();
  });

  it("treats 40+ as unbounded and prevents inverted ranges", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ videos: [video] }));
    vi.stubGlobal("fetch", fetcher);
    render(wrap(client()));
    await screen.findByText(video.title);
    const minimum = screen.getByRole("slider", { name: "Minimum duration (minutes)" });
    const maximum = screen.getByRole("slider", { name: "Maximum duration (minutes)" });
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      Response.json({ videos: [{ ...video, durationSeconds: null }] }),
    ));
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
      vi
        .fn()
        .mockResolvedValue(
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
