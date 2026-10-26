"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useEffect, useId, useRef, useState } from "react";
import { button, type PlaylistState, type Text } from "./playlistUi";

export function PlaylistActions({ state, t }: { state: PlaylistState; t: Text }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const disabled = !state.detail || state.busy || state.committed;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div ref={root} className="relative shrink-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className={`${button} flex h-10 w-10 items-center justify-center p-0`}
        aria-label={t.actions} aria-expanded={open && !disabled} aria-controls={id}
        disabled={disabled} onClick={() => setOpen(!open)}>
        <DotsHorizontalIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      {open && !disabled ? (
        <div id={id} className="absolute right-0 top-full z-20 mt-2 min-w-max rounded-lg border border-stroke-subtle bg-surface-base p-1 shadow-lg">
          <button type="button"
            className="rounded-md px-3 py-2 text-sm font-semibold text-status-danger hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
              if (window.confirm(t.confirmDelete)) void state.remove();
            }}>{t.delete}</button>
        </div>
      ) : null}
    </div>
  );
}
