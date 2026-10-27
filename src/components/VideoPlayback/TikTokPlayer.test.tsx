import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TikTokPlayer } from "./TikTokPlayer";
afterEach(() => { cleanup(); vi.useRealTimers(); });
const mount = (advanceOnError = true) => {
  const ended = vi.fn(), error = vi.fn();
  const view = render(<I18nProvider initialLocale="en"><TikTokPlayer videoId="6718335390845095173" title="TikTok" advanceOnError={advanceOnError} onEnded={ended} onError={error} /></I18nProvider>);
  const frame = screen.getByTitle("TikTok") as HTMLIFrameElement;
  const send = (type: string, value?: unknown, origin = "https://www.tiktok.com", source: MessageEventSource | null = frame.contentWindow) => act(() => { window.dispatchEvent(new MessageEvent("message", { origin, source, data: { "x-tiktok-player": true, type, value } })); });
  return { ...view, frame, send, ended, error };
};
it("validates origin, source and state; ends once only after playback starts", () => {
  const { frame, send, ended, error } = mount();
  expect(frame.src).toContain("/player/v1/6718335390845095173?loop=0");
  send("onStateChange", 1, "https://evil.example"); send("onStateChange", 0);
  send("onStateChange", 1, "https://www.tiktok.com", window); send("onStateChange", 0);
  expect(ended).not.toHaveBeenCalled();
  send("onStateChange", "1"); send("onStateChange", 0);
  expect(ended).not.toHaveBeenCalled();
  send("onPlayerReady"); send("onStateChange", 1); send("onStateChange", 0); send("onStateChange", 0);
  expect(ended).toHaveBeenCalledTimes(1); expect(error).not.toHaveBeenCalled();
});
it("keeps autoplay rejection recoverable through native player controls", () => {
  const { send, error, ended } = mount();
  send("onPlayerReady");
  send("onPlayerError", { errorCode: 3002, errorType: "AUTOPLAY_ERROR" });
  expect(screen.getByRole("status")).toHaveTextContent("Use the play button inside the player");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(error).not.toHaveBeenCalled();
  send("onStateChange", 1); send("onStateChange", 0);
  expect(ended).toHaveBeenCalledTimes(1);
});
it("reports a timeout without retry controls and ignores a removed frame", () => {
  vi.useFakeTimers();
  const { frame, send, unmount, ended, error } = mount();
  act(() => vi.advanceTimersByTime(20000));
  expect(screen.getByRole("status")).toHaveTextContent("Could not load this TikTok video. Please choose another video.");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  unmount(); send("onStateChange", 1); send("onStateChange", 0);
  expect(frame.isConnected).toBe(false);
  expect(ended).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});
it("waits for detailed errors after legacy code 1", () => {
  const { send, frame, ended, error } = mount(false);
  send("onError", 1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByTitle("TikTok")).toBe(frame);
  expect(error).not.toHaveBeenCalled();
  send("onPlayerError", { errorCode: 1001, errorType: "INVALID_VIDEO" });
  expect(screen.getByRole("status")).toHaveTextContent("TikTok restrictions");
  expect(ended).not.toHaveBeenCalled();
});
it.each([2, 3, 4])("reports terminal legacy media error %s once", (code) => {
  const { send, ended, error } = mount();
  send("onError", code);
  send("onError", code);
  expect(error).toHaveBeenCalledTimes(1);
  expect(ended).not.toHaveBeenCalled();
});

it.each([1001, 1002])("explains TikTok restriction %s without retry controls", (errorCode) => {
  const { frame, send, error } = mount(false);
  send("onPlayerError", { errorCode, errorType: "INVALID_VIDEO" });
  expect(screen.getByRole("status")).toHaveTextContent("TikTok restrictions prevent this video from playing here. Please choose another video.");
  expect(screen.getByTitle("TikTok")).toBe(frame);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(error).not.toHaveBeenCalled();
});
it("still skips unavailable videos in a queue", () => {
  const { send, error } = mount();
  send("onPlayerError", { errorCode: 1001, errorType: "INVALID_VIDEO" });
  expect(error).toHaveBeenCalledTimes(1);
});

it("confirms preview only after playing, without requesting autoplay", () => {
  const playing = vi.fn();
  const error = vi.fn();
  render(<I18nProvider initialLocale="en"><TikTokPlayer videoId="6740558728342359297" title="Preview" autoplay={false} onPlaying={playing} onEnded={() => {}} onError={error} /></I18nProvider>);
  const frame = screen.getByTitle("Preview") as HTMLIFrameElement;
  const command = vi.spyOn(frame.contentWindow!, "postMessage");
  const send = (type: string, value?: unknown) => act(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://www.tiktok.com", source: frame.contentWindow, data: { "x-tiktok-player": true, type, value } })));
  expect(frame.src).toContain("autoplay=0");
  send("onPlayerReady");
  expect(playing).not.toHaveBeenCalled();
  expect(command).toHaveBeenCalledExactlyOnceWith({ "x-tiktok-player": true, type: "unMute" }, "https://www.tiktok.com");
  send("onStateChange", 3);
  expect(playing).not.toHaveBeenCalled();
  send("onStateChange", 1);
  expect(playing).toHaveBeenCalledTimes(1);
  send("onPlayerError", { errorCode: 1001, errorType: "INVALID_VIDEO" });
  expect(error).toHaveBeenCalledTimes(1);
});

it("requests sound before starting autoplay and leaves later volume choices to the viewer", () => {
  const { frame, send } = mount();
  const command = vi.spyOn(frame.contentWindow!, "postMessage");
  expect(frame.src).toContain("muted=0");
  send("onPlayerReady");
  expect(command).toHaveBeenNthCalledWith(1, { "x-tiktok-player": true, type: "unMute" }, "https://www.tiktok.com");
  expect(command).toHaveBeenNthCalledWith(2, { "x-tiktok-player": true, type: "play" }, "https://www.tiktok.com");
  send("onMute", true);
  send("onStateChange", 1);
  expect(command).toHaveBeenCalledTimes(2);
});
