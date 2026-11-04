"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";

const subscribeToViewport = (listener: () => void) => {
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
};
const serverSnapshot = () => false;
const isLandscapeViewport = () => window.innerWidth > window.innerHeight;
const isMobileViewport = () => window.innerWidth < 640 || (
  window.innerHeight < 640 && window.matchMedia?.("(pointer: coarse)").matches === true
);

export function useFullscreenOrientation(fullscreen: boolean) {
  const mobile = useSyncExternalStore(subscribeToViewport, isMobileViewport, serverSnapshot);
  const viewportLandscape = useSyncExternalStore(subscribeToViewport, isLandscapeViewport, serverSnapshot);
  const [landscape, setLandscape] = useState(true);
  // Rotate the complete surface, including the embedded player's own controls.
  // A physical device rotation that already matches the choice needs no transform.
  const rotated = fullscreen && mobile && landscape !== viewportLandscape;
  const style: CSSProperties | undefined = rotated ? {
    inset: "auto", left: "50%", top: "50%", width: "100dvh", height: "100dvw",
    transform: "translate(-50%, -50%) rotate(90deg)",
  } : undefined;

  return { mobile, landscape, rotated, style, toggle: () => setLandscape(!landscape), reset: () => setLandscape(true) };
}
