import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { WikiVideoCreateForm } from "./index";
const create = vi.hoisted(() => vi.fn());
vi.mock("@/gateways/wiki/wikiVideoCreate", async (original) => ({
  ...(await original<object>()),
  createWikiVideo: create,
}));
vi.mock("../YouTubeDurationPreview", () => ({
  YouTubeDurationPreview: ({
    videoId,
    onDuration,
    onError,
  }: {
    videoId: string;
    onDuration: (n: number) => void;
    onError: () => void;
  }) => (
    <div>
      <span>{videoId}</span>
      <button onClick={() => onDuration(123.9)}>Metadata ready</button>
      <button onClick={onError}>Player error</button>
    </div>
  ),
}));
const identity = {
  wikiIdentifier: "11111111-1111-4111-8111-111111111111",
  resourceType: "group" as const,
};
const mount = (onCreated?: () => void) =>
  render(
    <I18nProvider initialLocale="en">
      <WikiVideoCreateForm {...identity} onCreated={onCreated} />
    </I18nProvider>,
  );
const fill = () => {
  fireEvent.change(screen.getByLabelText("YouTube / TikTok URL"), {
    target: {
      value: "https://www.youtube.com/watch?v=Os_heh8vPfs&list=ignore&index=27",
    },
  });
  fireEvent.change(screen.getByLabelText("Video title"), {
    target: { value: "My video" },
  });
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
describe("single video form", () => {
  it("shows an invalid video URL error and prevents saving a forged TikTok host", () => {
    mount();
    fireEvent.change(screen.getByLabelText("YouTube / TikTok URL"), {
      target: { value: "https://www.tiktok.com.evil.example/@example/video/6718335390845095173" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid YouTube / TikTok URL");
    expect(screen.getByRole("button", { name: "Save video" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Add video" }));
    expect(create).not.toHaveBeenCalled();
  });
  it("waits for duration, sends one canonical video and locks duplicate submits", async () => {
    let resolve!: (v: { ok: boolean; status: number }) => void;
    create.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const onCreated = vi.fn();
    mount(onCreated);
    fill();
    expect(screen.getByRole("button", { name: "Save video" })).toBeDisabled();
    fireEvent.click(screen.getByText("Metadata ready"));
    fireEvent.click(screen.getByRole("button", { name: "Save video" }));
    fireEvent.submit(screen.getByRole("form", { name: "Add video" }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      ...identity,
      url: "https://www.youtube.com/watch?v=Os_heh8vPfs",
      thumbnailUrl: "https://i.ytimg.com/vi/Os_heh8vPfs/hqdefault.jpg",
      title: "My video",
      videoUsage: "music_video",
      durationSeconds: 124,
    });
    expect(screen.getByLabelText("YouTube / TikTok URL")).toBeDisabled();
    await act(async () => resolve({ ok: true, status: 204 }));
    expect(await screen.findByRole("status")).toHaveTextContent(/^Video saved\.$/);
    expect(screen.getByLabelText("YouTube / TikTok URL")).toHaveValue("");
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
  it("resets duration even for a changed URL for the same video and reports invalid URL/player failure", () => {
    mount();
    fill();
    fireEvent.click(screen.getByText("Metadata ready"));
    expect(screen.getByRole("button", { name: "Save video" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("YouTube / TikTok URL"), {
      target: { value: "https://youtu.be/Os_heh8vPfs" },
    });
    expect(screen.getByRole("button", { name: "Save video" })).toBeDisabled();
    fireEvent.click(screen.getByText("Player error"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load video duration",
    );
    fireEvent.change(screen.getByLabelText("YouTube / TikTok URL"), {
      target: { value: "https://evil.test" },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid YouTube / TikTok URL",
    );
    expect(screen.queryByText("Metadata ready")).not.toBeInTheDocument();
  });
  it.each(["https://www.tiktok.com/@scout2015/video/6718335390845095173", "https://vm.tiktok.com/AbCd123/", "https://vt.tiktok.com/AbCd123/"])("submits TikTok without preview and retains input for 502 retry: %s", async (url) => {
    create.mockResolvedValueOnce({ ok: false, status: 502 }).mockResolvedValueOnce({ ok: true, status: 204 });
    mount();
    fireEvent.change(screen.getByLabelText("YouTube / TikTok URL"), { target: { value: url } });
    fireEvent.change(screen.getByLabelText("Video title"), { target: { value: "TikTok title" } });
    expect(screen.queryByText("Metadata ready")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save video" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByLabelText("YouTube / TikTok URL")).toHaveValue(url);
    await waitFor(() => expect(screen.getByRole("button", { name: "Save video" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Save video" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Video saved");
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ url, durationSeconds: null, thumbnailUrl: null }));
  });
  it.each([
    [401, "Sign in again"],
    [403, "not allowed"],
    [409, "already registered"],
    [422, "Check the input"],
    [0, "Could not save"],
  ])("shows create failure %s and keeps the input", async (status, text) => {
    create.mockResolvedValue({ ok: false, status });
    mount();
    fill();
    fireEvent.click(screen.getByText("Metadata ready"));
    fireEvent.click(screen.getByRole("button", { name: "Save video" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(screen.getByLabelText("Video title")).toHaveValue("My video");
    await waitFor(() =>
      expect(screen.getByLabelText("YouTube / TikTok URL")).toBeEnabled(),
    );
    if (status === 401 || status === 403)
      expect(screen.getByRole("button", { name: "Save video" })).toBeDisabled();
  });
});
