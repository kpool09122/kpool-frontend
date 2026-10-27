import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import { TikTokPlayer } from "./TikTokPlayer";
afterEach(() => { cleanup(); vi.useRealTimers(); });
const mount = () => {
  const ended = vi.fn(), error = vi.fn();
  const view = render(<I18nProvider initialLocale="en"><TikTokPlayer videoId="6718335390845095173" title="TikTok" onEnded={ended} onError={error} /></I18nProvider>);
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
it("offers resume without skipping on autoplay rejection, but skips unavailable videos", () => {
  const { send, ended, error } = mount();
  send("onPlayerReady"); send("onPlayerError", { errorCode: 3002, errorType: "AUTOPLAY_ERROR" });
  fireEvent.click(screen.getByRole("button", { name: /resume/i }));
  expect(error).not.toHaveBeenCalled(); expect(ended).not.toHaveBeenCalled();
  send("onPlayerError", { errorCode: 1001, errorType: "INVALID_VIDEO" });
  expect(error).toHaveBeenCalledTimes(1);
});
it("retries with a new iframe and rejects messages from the old iframe and malformed payloads", () => {
  vi.useFakeTimers();
  const { frame, send, ended, error } = mount();
  act(() => { window.dispatchEvent(new MessageEvent("message", { origin: "https://www.tiktok.com", source: frame.contentWindow, data: { type: "onStateChange", value: 1 } })); });
  send("onStateChange", 0);
  expect(ended).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(20000));
  fireEvent.click(screen.getByRole("button", { name: /resume/i }));
  const replacement = screen.getByTitle("TikTok");
  expect(replacement).not.toBe(frame);
  send("onStateChange", 1); send("onStateChange", 0);
  expect(ended).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
});
it("offers retry and skip after ready timeout and ignores a removed frame", () => {
  vi.useFakeTimers();
  const { send, frame, unmount, error, ended } = mount();
  act(() => vi.advanceTimersByTime(20000));
  expect(screen.getByRole("button", { name: /resume/i })).toBeEnabled();
  expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  unmount(); send("onStateChange", 1); send("onStateChange", 0);
  expect(frame.isConnected).toBe(false); expect(error).not.toHaveBeenCalled(); expect(ended).not.toHaveBeenCalled();
});
