"use client";

import { LoopIcon, PlayIcon, ShuffleIcon, StopIcon } from "@radix-ui/react-icons";
import type { Ref } from "react";

type Labels = { start: string; stop: string; random: string; loop: string };
const toggleClassName =
  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary aria-pressed:after:absolute aria-pressed:after:bottom-1 aria-pressed:after:h-1 aria-pressed:after:w-1 aria-pressed:after:rounded-full aria-pressed:after:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-40";

export function YouTubeQueueControls({
  labels, empty, playing, floating, loop, random, startRef,
  onStart, onStop, onToggleLoop, onToggleRandom,
}: {
  labels: Labels;
  empty: boolean;
  playing: boolean;
  floating: boolean;
  loop: boolean;
  random: boolean;
  startRef?: Ref<HTMLButtonElement>;
  onStart: () => void;
  onStop?: () => void;
  onToggleLoop: () => void;
  onToggleRandom: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-5">
      {!floating ? (
        <button type="button" aria-label={labels.random} title={labels.random}
          aria-pressed={random} disabled={empty} onClick={onToggleRandom} className={toggleClassName}>
          <ShuffleIcon aria-hidden="true" className="h-6 w-6" />
        </button>
      ) : null}
      <button type="button" ref={startRef} aria-pressed={playing} disabled={empty || playing}
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:aria-pressed:opacity-100"
        onClick={onStart}>
        <PlayIcon aria-hidden="true" className="h-6 w-6" />
        {labels.start}
      </button>
      {onStop && !floating ? (
        <button type="button" aria-label={labels.stop} title={labels.stop}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
          onClick={onStop}>
          <StopIcon aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
      {!floating ? (
        <button type="button" aria-label={labels.loop} title={labels.loop}
          aria-pressed={loop} disabled={empty} onClick={onToggleLoop} className={toggleClassName}>
          <LoopIcon aria-hidden="true" className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
}
