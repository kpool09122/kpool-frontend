import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { YouTubeDurationPreview } from "./index";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("YouTube duration preview", () => {
  it("removes a failed API script so retry can load the network resource again", () => {
    vi.stubGlobal("YT", undefined);
    const view = render(
      <YouTubeDurationPreview
        videoId="Os_heh8vPfs"
        onDuration={vi.fn()}
        onError={vi.fn()}
      />,
    );
    const script = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    )!;
    act(() => script.dispatchEvent(new Event("error")));
    expect(script.isConnected).toBe(false);
    view.unmount();
    render(
      <YouTubeDurationPreview
        videoId="Os_heh8vPfs"
        onDuration={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(
      document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      ),
    ).not.toBe(script);
  });
  it("ignores zero until metadata is available, uses privacy host, and destroys stale players", async () => {
    vi.useFakeTimers();
    const duration = vi.fn().mockReturnValue(0),
      destroy = vi.fn(),
      onDuration = vi.fn(),
      onError = vi.fn();
    let options: { events: { onReady: () => void; onError: () => void } };
    const Player = vi.fn(function (_node: HTMLElement, opts: typeof options) {
      options = opts;
      return { getDuration: duration, destroy };
    });
    vi.stubGlobal("YT", { Player });
    const view = render(
      <YouTubeDurationPreview
        videoId="Os_heh8vPfs"
        onDuration={onDuration}
        onError={onError}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(Player).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        videoId: "Os_heh8vPfs",
        host: "https://www.youtube-nocookie.com",
        playerVars: expect.objectContaining({ origin: window.location.origin }),
      }),
    );
    act(() => options.events.onReady());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(onDuration).not.toHaveBeenCalled();
    duration.mockReturnValue(120.5);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onDuration).toHaveBeenCalledWith(120.5);
    view.unmount();
    expect(destroy).toHaveBeenCalledOnce();
    act(() => options.events.onError());
    expect(onError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("times out without accepting metadata zero and cleans pending API waits on unmount", async () => {
    vi.useFakeTimers();
    const onError = vi.fn(),
      onDuration = vi.fn();
    vi.stubGlobal("YT", undefined);
    const view = render(
      <YouTubeDurationPreview
        videoId="Os_heh8vPfs"
        onDuration={onDuration}
        onError={onError}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60001);
    });
    expect(onError).toHaveBeenCalledOnce();
    expect(onDuration).not.toHaveBeenCalled();
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
