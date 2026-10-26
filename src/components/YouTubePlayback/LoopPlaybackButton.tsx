"use client";

import { LoopIcon } from "@radix-ui/react-icons";
import type { LoopMode } from "./playbackQueue";

export function LoopPlaybackButton({ mode, labels, disabled, onClick, className, iconClassName = "h-6 w-6" }: {
  mode: LoopMode;
  labels: { loop: string; loopOne: string };
  disabled?: boolean;
  onClick: () => void;
  className: string;
  iconClassName?: string;
}) {
  const label = mode === "one" ? labels.loopOne : labels.loop;
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={mode !== "off"}
      data-loop-mode={mode} disabled={disabled} onClick={onClick} className={className}>
      <span aria-hidden="true" className={`relative ${iconClassName}`}>
        <LoopIcon className="h-full w-full" />
        {mode === "one" ? <span className="absolute inset-0 grid place-items-center text-[9px] font-bold leading-none">1</span> : null}
      </span>
    </button>
  );
}
