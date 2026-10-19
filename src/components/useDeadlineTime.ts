"use client";

import { useMemo, useSyncExternalStore } from "react";
import { createDeadlineClock } from "@/gateways/support/deadlineClock";

export function useDeadlineTime(deadline: number | null) {
  const clock = useMemo(() => createDeadlineClock(deadline), [deadline]);
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getServerSnapshot);
}
