"use client";

import { PlayIcon, ShuffleIcon, StopIcon, TrackNextIcon, TrackPreviousIcon } from "@radix-ui/react-icons";
import type { Ref } from "react";
import type { LoopMode } from "./playbackQueue";
import { LoopPlaybackButton } from "./LoopPlaybackButton";

type Labels = { start: string; stop: string; random: string; loop: string; loopOne: string; previous: string; next: string };
const transportClassName = "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-40";
const toggleClassName =
  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary aria-pressed:after:absolute aria-pressed:after:bottom-1 aria-pressed:after:h-1 aria-pressed:after:w-1 aria-pressed:after:rounded-full aria-pressed:after:bg-brand-primary disabled:cursor-not-allowed disabled:opacity-40";

export function VideoQueueControls({
  labels, empty, playing, floating, loop, random, startRef, showStartLabel = true,
  onStart, onStop, onToggleLoop, onToggleRandom, navigation,
}: {
  labels: Labels;
  empty: boolean;
  playing: boolean;
  floating: boolean;
  loop: LoopMode;
  random: boolean;
  startRef?: Ref<HTMLButtonElement>;
  showStartLabel?: boolean;
  navigation?: { onPrevious?: () => void; onNext?: () => void };
  onStart: () => void;
  onStop?: () => void;
  onToggleLoop: () => void;
  onToggleRandom: () => void;
}) {
  const showingStop = playing && !!onStop;
  const playbackLabel = showingStop ? labels.stop : labels.start;
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-5">
      {!floating ? (
        <button type="button" aria-label={labels.random} title={labels.random}
          aria-pressed={random} disabled={empty} onClick={onToggleRandom} className={toggleClassName}>
          <ShuffleIcon aria-hidden="true" className="h-6 w-6" />
        </button>
      ) : null}
      <div className="inline-flex shrink-0 items-center gap-2">
        {navigation ? (
          <button type="button" aria-label={labels.previous} title={labels.previous}
            disabled={!navigation.onPrevious} onClick={navigation.onPrevious} className={transportClassName}>
            <TrackPreviousIcon aria-hidden="true" className="h-6 w-6" />
          </button>
        ) : null}
        <button type="button" ref={startRef} aria-pressed={playing} disabled={!showingStop && (empty || playing)}
          title={showStartLabel ? undefined : playbackLabel}
          className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary aria-pressed:text-brand-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:aria-pressed:opacity-100"
          onClick={showingStop ? onStop : onStart}>
          {showingStop ? <StopIcon aria-hidden="true" className="h-6 w-6" /> : <PlayIcon aria-hidden="true" className="h-6 w-6" />}
          <span className={showStartLabel ? undefined : "sr-only"}>{playbackLabel}</span>
        </button>
        {navigation ? (
          <button type="button" aria-label={labels.next} title={labels.next}
            disabled={!navigation.onNext} onClick={navigation.onNext} className={transportClassName}>
            <TrackNextIcon aria-hidden="true" className="h-6 w-6" />
          </button>
        ) : null}
      </div>
      {onStop && !floating && !showingStop ? (
        <button type="button" aria-label={labels.stop} title={labels.stop}
          className={transportClassName}
          onClick={onStop}>
          <StopIcon aria-hidden="true" className="h-5 w-5" />
        </button>
      ) : null}
      {!floating ? (
        <LoopPlaybackButton mode={loop} labels={labels} disabled={empty} onClick={onToggleLoop} className={toggleClassName} />
      ) : null}
    </div>
  );
}
