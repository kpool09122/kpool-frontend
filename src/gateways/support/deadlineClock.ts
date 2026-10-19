/** A stable snapshot of the browser clock, ticking only until the deadline. */
export function createDeadlineClock(deadline: number | null) {
  let now = 0;
  return {
    getSnapshot: () => now,
    getServerSnapshot: () => 0,
    subscribe: (notify: () => void) => {
      now = Date.now();
      notify();
      if (deadline === null || !Number.isFinite(deadline) || now >= deadline) return () => {};
      const timer = setInterval(() => {
        now = Date.now();
        notify();
        if (now >= deadline) clearInterval(timer);
      }, 1000);
      return () => clearInterval(timer);
    },
  };
}
