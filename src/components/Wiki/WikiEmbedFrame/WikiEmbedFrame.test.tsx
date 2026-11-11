import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { WikiEmbedBlock } from "@kpool/wiki";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiEmbedFrame } from "./index";

function embed(provider: WikiEmbedBlock["provider"], embedId: string, caption: string | null = null) {
  return (
    <I18nProvider initialLocale="en">
      <WikiEmbedFrame block={{ blockIdentifier: embedId, blockType: "embed", displayOrder: 0, provider, embedId, caption }} />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  ["https://open.spotify.com/intl-ja/track/308Ir17KlNdlrbVLHWhlLe", "track/308Ir17KlNdlrbVLHWhlLe", 152],
  ["playlist/37i9dQZF1DWYlCv3D85m6m", "playlist/37i9dQZF1DWYlCv3D85m6m", 352],
])("uses a player height that fits Spotify content %s", (value, path, height) => {
  render(embed("spotify", value, "Spotify example"));

  const player = screen.getByTitle("Spotify embed: Spotify example");
  expect(player).toHaveAttribute("src", `https://open.spotify.com/embed/${path}`);
  expect(player.parentElement).toHaveStyle({ height: `${height}px` });
  expect(player.parentElement).not.toHaveClass("aspect-video");
  expect(player.closest("figure")).not.toHaveClass("border");
  expect(player.parentElement?.nextElementSibling?.tagName).toBe("FIGCAPTION");
  expect(player.parentElement?.nextElementSibling).toHaveTextContent("Spotify example");
});

it("lets X size the post and keeps a direct link when the widget cannot display it", async () => {
  const createTweet = vi.fn(async (postId: string, target: HTMLElement) => {
    if (postId === "123") return undefined;

    const iframe = document.createElement("iframe");
    iframe.title = "X post";
    iframe.style.height = "610px";
    target.append(iframe);
    return iframe;
  });
  vi.stubGlobal("twttr", { widgets: { createTweet } });

  const { rerender } = render(embed("x", "https://x.com/NASAWebb/status/1546621080298835970", "Webb telescope"));
  const post = await screen.findByTitle("X post");
  expect(createTweet).toHaveBeenCalledWith("1546621080298835970", post.parentElement, { dnt: true });
  const figure = post.closest("figure");
  expect(figure).not.toHaveClass("border");
  expect(figure?.lastElementChild).toBe(figure?.querySelector("figcaption"));
  expect(figure?.lastElementChild).toHaveTextContent("Webb telescope");
  expect(screen.queryByRole("link", { name: "Open post on X" })).not.toBeInTheDocument();

  await act(async () => rerender(embed("x", "123")));
  expect(screen.queryByTitle("X post")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open post on X" })).toHaveAttribute("href", "https://x.com/i/web/status/123");
});
