import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HorizontalCarousel } from "./HorizontalCarousel";

afterEach(cleanup);
it("moves the viewport with buttons and keyboard and disables controls at either edge", () => {
  render(<HorizontalCarousel title="Videos" previousLabel="Previous" nextLabel="Next"><li>One</li><li>Two</li></HorizontalCarousel>);
  const list = screen.getByRole("list", { name: "Videos" });
  const scrollBy = vi.fn();
  Object.defineProperties(list, {
    clientWidth: { value: 600 },
    scrollWidth: { value: 1800 },
    scrollLeft: { value: 0, writable: true },
    scrollBy: { value: scrollBy },
  });
  fireEvent.scroll(list);
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(scrollBy).toHaveBeenCalledWith({ left: 600, behavior: "smooth" });
  list.scrollLeft = 600;
  fireEvent.scroll(list);
  expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  fireEvent.keyDown(list, { key: "ArrowLeft" });
  expect(scrollBy).toHaveBeenLastCalledWith({ left: -600, behavior: "smooth" });
  list.scrollLeft = 1200;
  fireEvent.scroll(list);
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});
