import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeadlineClock } from "./deadlineClock";

afterEach(() => vi.useRealTimers());

describe("deadline clock", () => {
  it("keeps snapshots stable between ticks and stops at the deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const clock = createDeadlineClock(12_000);
    const notify = vi.fn();
    const unsubscribe = clock.subscribe(notify);
    expect(clock.getServerSnapshot()).toBe(0);
    expect(clock.getSnapshot()).toBe(10_000);
    vi.advanceTimersByTime(500);
    expect(clock.getSnapshot()).toBe(10_000);
    vi.advanceTimersByTime(1500);
    expect(clock.getSnapshot()).toBe(12_000);
    expect(vi.getTimerCount()).toBe(0);
    expect(notify).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it("cancels ticking when the subscriber leaves", () => {
    vi.useFakeTimers();
    const clock = createDeadlineClock(Date.now() + 60_000);
    const notify = vi.fn();
    const unsubscribe = clock.subscribe(notify);
    unsubscribe();
    vi.advanceTimersByTime(60_000);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([null, 0, Number.NaN])("does not start a timer without a future deadline: %s", (deadline) => {
    vi.useFakeTimers();
    const clock = createDeadlineClock(deadline);
    const unsubscribe = clock.subscribe(vi.fn());
    expect(clock.getSnapshot()).toBe(Date.now());
    expect(vi.getTimerCount()).toBe(0);
    unsubscribe();
  });
});
