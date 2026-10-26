"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

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
  const nativeFullscreen = useSyncExternalStore(
    subscribe,
    () => root.current !== null && document.fullscreenElement === root.current,
    serverSnapshot,
  );
  const [pageFullscreen, setPageFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!pageFullscreen) return;
    const elements = [document.documentElement, document.body];
    const overflows = elements.map((element) => element.style.overflow);
    elements.forEach((element) => { element.style.overflow = "hidden"; });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPageFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      elements.forEach((element, index) => { element.style.overflow = overflows[index]; });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pageFullscreen]);

  const toggle = () => {
    setFailed(false);
    if (pageFullscreen || !supported) {
      setPageFullscreen((current) => !current);
      return;
    }
    const operation = document.fullscreenElement === root.current
      ? document.exitFullscreen()
      : root.current?.requestFullscreen();
    return operation?.catch(() => setFailed(true));
  };

  return { fullscreen: nativeFullscreen || pageFullscreen, failed, toggle };
}
