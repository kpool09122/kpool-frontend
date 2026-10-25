"use client";

import { useState, useSyncExternalStore, type RefObject } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
};
const serverSnapshot = () => false;
const supportsFullscreen = () => Boolean(
  document.fullscreenEnabled && document.documentElement.requestFullscreen,
);

export function usePlayerFullscreen(root: RefObject<HTMLElement | null>) {
  const supported = useSyncExternalStore(subscribe, supportsFullscreen, serverSnapshot);
  const fullscreen = useSyncExternalStore(
    subscribe,
    () => root.current !== null && document.fullscreenElement === root.current,
    serverSnapshot,
  );
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    setFailed(false);
    const operation = document.fullscreenElement === root.current
      ? document.exitFullscreen()
      : root.current?.requestFullscreen();
    return operation?.catch(() => setFailed(true));
  };

  return { supported, fullscreen, failed, toggle };
}
