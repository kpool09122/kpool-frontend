import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/I18nProvider";
import * as dateTime from "@/utils/dateTime";
import { LocalizedDateTime } from "./LocalizedDateTime";

const value = "2026-11-05T04:27:01+00:00";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("displays browser local time while preserving the UTC datetime attribute", () => {
  vi.spyOn(dateTime, "getBrowserTimeZone").mockReturnValue("Asia/Tokyo");
  render(<I18nProvider initialLocale="ja"><LocalizedDateTime value={value} /></I18nProvider>);
  expect(screen.getByText("2026/11/05 13:27")).toHaveAttribute("datetime", value);
});

it("updates when the browser time zone changes without changing the display language", () => {
  const zone = vi.spyOn(dateTime, "getBrowserTimeZone").mockReturnValue("Asia/Tokyo");
  render(<LocalizedDateTime value={value} locale="en" template="Updated {date}" />);
  expect(screen.getByText("Updated Nov 5, 2026, 13:27")).toBeInTheDocument();
  zone.mockReturnValue("America/Los_Angeles");
  fireEvent.focus(window);
  expect(screen.getByText("Updated Nov 4, 2026, 20:27")).toBeInTheDocument();
});

it("hydrates server markup without a mismatch when server and browser zones differ", async () => {
  vi.spyOn(dateTime, "getBrowserTimeZone").mockReturnValue("Asia/Tokyo");
  const element = <LocalizedDateTime value={value} locale="ja" />;
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  expect(container.textContent).toBe("2026/11/05 4:27");
  document.body.append(container);
  const onRecoverableError = vi.fn();
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => { root = hydrateRoot(container, element, { onRecoverableError }); });
  expect(container.textContent).toBe("2026/11/05 13:27");
  expect(onRecoverableError).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
  container.remove();
});
