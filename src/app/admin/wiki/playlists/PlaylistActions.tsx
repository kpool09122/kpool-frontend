"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useId } from "react";
import { button, type PlaylistState, type Text } from "./playlistUi";

export function PlaylistActions({ state, t }: { state: PlaylistState; t: Text }) {
  const id = useId();
  const disabled = !state.detail || state.busy || state.committed;
  return (
    <div className="shrink-0">
      <button type="button" className={`${button} flex h-10 w-10 items-center justify-center p-0`}
        aria-label={t.actions} popoverTarget={id} disabled={disabled}>
        <DotsHorizontalIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      {!disabled ? (
        <div id={id} popover="auto"
          className="fixed inset-auto m-0 mt-2 min-w-max rounded-lg border border-stroke-subtle bg-surface-base p-1 shadow-lg [position-anchor:auto] [top:anchor(bottom)] [right:anchor(right)] [position-try-fallbacks:flip-block]">
          <button type="button" popoverTarget={id} popoverTargetAction="hide"
            className="rounded-md px-3 py-2 text-sm font-semibold text-status-danger hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => {
              if (window.confirm(t.confirmDelete)) void state.remove();
            }}>{t.delete}</button>
        </div>
      ) : null}
    </div>
  );
}
