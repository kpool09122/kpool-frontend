import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HorizontalCarousel } from "./HorizontalCarousel";

const embla = vi.hoisted(() => ({
  ref: vi.fn(),
  api: { canScrollPrev: vi.fn(() => true), canScrollNext: vi.fn(() => true), scrollSnapList: vi.fn(() => [0, 1]), selectedScrollSnap: vi.fn(() => 0), scrollTo: vi.fn(), plugins: vi.fn(() => ({ autoplay: { reset: vi.fn() } })), scrollPrev: vi.fn(), scrollNext: vi.fn(), on: vi.fn(), off: vi.fn() },
  hook: vi.fn(),
}));
vi.mock("embla-carousel-react", () => ({ default: (...args: unknown[]) => {
  embla.hook(...args);
  return [embla.ref, embla.api];
} }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderCarousel() {
  return render(<HorizontalCarousel title="Videos" paginationLabel="Positions" slideLabel={(position) => `Go to ${position}`}><article>One</article><article>Two</article></HorizontalCarousel>);
}

it("keeps keyboard navigation without arrow controls", () => {
  renderCarousel();
  fireEvent.keyDown(screen.getByRole("list"), { key: "ArrowRight" });
  expect(embla.api.scrollNext).toHaveBeenCalledOnce();
  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getAllByRole("button")).toHaveLength(2);
});

it("jumps to a dot position and updates the active dot when the carousel moves", () => {
  embla.api.selectedScrollSnap.mockReturnValue(0);
  renderCarousel();
  expect(screen.getByRole("button", { name: "Go to 1" })).toHaveAttribute("aria-current", "true");
  fireEvent.click(screen.getByRole("button", { name: "Go to 2" }));
  expect(embla.api.scrollTo).toHaveBeenCalledWith(1);
  act(() => {
    embla.api.selectedScrollSnap.mockReturnValue(1);
    for (const [event, notify] of embla.api.on.mock.calls) {
      if (event === "select") notify();
    }
  });
  expect(screen.getByRole("button", { name: "Go to 2" })).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("button", { name: "Go to 1" })).not.toHaveAttribute("aria-current");
});

it("uses the reverse slide direction while keeping card text left-to-right", () => {
  render(<HorizontalCarousel title="Wikis" paginationLabel="Positions" slideLabel={(position) => `Go to ${position}`} direction="rtl"><article>Wiki</article></HorizontalCarousel>);
  expect(embla.hook.mock.lastCall?.[0]).toMatchObject({ direction: "rtl" });
  expect(screen.getByRole("list")).toHaveAttribute("dir", "rtl");
  expect(screen.getByRole("listitem")).toHaveAttribute("dir", "ltr");
});
