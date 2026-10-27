"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const hideDelay = 3000;

export function useFullscreenControls(fullscreen: boolean) {
  const [hidden, setHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef(false);
  const focused = useRef(false);
  const scheduleHide = useCallback(() => {
    clearTimeout(timer.current);
    if (fullscreen && !hovering.current && !focused.current) {
      timer.current = setTimeout(() => setHidden(true), hideDelay);
    }
  }, [fullscreen]);
  const reveal = useCallback(() => {
    setHidden(false);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      clearTimeout(timer.current);
      hovering.current = false;
      focused.current = false;
      setHidden(false);
    };
  }, [scheduleHide]);

  return {
    visible: !fullscreen || !hidden,
    reveal,
    barProps: {
      onPointerEnter: (event: React.PointerEvent) => {
        if (event.pointerType === "touch") return;
        hovering.current = true;
        reveal();
      },
      onPointerLeave: () => { hovering.current = false; scheduleHide(); },
      onFocusCapture: (event: React.FocusEvent) => {
        focused.current = event.target.matches(":focus-visible");
        reveal();
      },
      onBlurCapture: (event: React.FocusEvent) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focused.current = false;
        scheduleHide();
      },
    },
  };
}
