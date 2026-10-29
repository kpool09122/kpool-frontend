"use client";

import { useEffect, useId, useRef, useState } from "react";

export function useVideoActionNotice(message: string | undefined) {
  const root = useRef<HTMLDivElement>(null);
  const noticeId = useId();
  const [shownMessage, setShownMessage] = useState<string>();
  const notice = shownMessage === message ? message : undefined;

  useEffect(() => {
    if (!notice) return;
    const dismiss = () => setShownMessage(undefined);
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) dismiss();
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("click", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside, true);
    document.addEventListener("keydown", dismissOnEscape);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("click", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside, true);
      document.removeEventListener("keydown", dismissOnEscape);
      window.removeEventListener("blur", dismiss);
    };
  }, [notice]);

  return {
    root,
    noticeId,
    notice,
    showNotice: () => setShownMessage(message),
    dismissNotice: () => setShownMessage(undefined),
  };
}
