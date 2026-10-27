import type { ReactNode } from "react";
import { createStore } from "zustand/vanilla";
import { advancePlayback, playbackOrder, type LoopMode, type PlaybackQueue } from "./playbackQueue";

export type PlaybackTrack = { identifier: string; videoId: string; provider?: "youtube" | "tiktok"; title: string; controls?: ReactNode };
export type PlaybackSession = {
  id: number;
  owner: string;
  kind: "queue" | "single";
  tracks: PlaybackTrack[];
  queue: PlaybackQueue;
  loop: LoopMode;
  random: boolean;
};
type Notice = {
  owner: string;
  floating: boolean;
  kind: "skipped" | "unavailable" | "outsideQueue";
  title?: string;
};
type PlaybackState = {
  session: PlaybackSession | null;
  floating: boolean;
  generation: number;
  notice: Notice | null;
  start: (owner: string, tracks: PlaybackTrack[], kind: PlaybackSession["kind"], loop?: LoopMode, random?: boolean, initialIdentifier?: string) => void;
  stop: () => void;
  detach: () => void;
  restore: (owner: string) => void;
  release: (owner: string) => void;
  setLoop: (mode: LoopMode) => void;
  setRandom: (enabled: boolean) => void;
  advance: (sessionId: number, failed?: boolean, videoId?: string, provider?: "youtube" | "tiktok", sequence?: number) => void;
  selectTrack: (sessionId: number, identifier: string) => void;
  synchronize: (sessionId: number, videoId: string, provider?: "youtube" | "tiktok", sequence?: number) => void;
  unavailable: (sessionId: number) => void;
  clearNotice: () => void;
};

function atVideo(session: PlaybackSession, videoId?: string, provider?: PlaybackTrack["provider"]): PlaybackQueue {
  const current = session.queue;
  const matches = (track: PlaybackTrack) => track.videoId === videoId && (provider === undefined || (track.provider ?? "youtube") === provider);
  if (matches(session.tracks[current.order[current.position]])) return current;
  const position = current.order.findIndex((index) => matches(session.tracks[index]));
  return position < 0 ? current : { ...current, position };
}

export function createPlaybackStore() {
  return createStore<PlaybackState>((set, get) => ({
    session: null,
    floating: false,
    generation: 0,
    notice: null,
    start: (owner, tracks, kind, loop = "off", random = false, initialIdentifier) => {
      if (!tracks.length) return;
      const initialIndex = tracks.findIndex((track) => track.identifier === initialIdentifier);
      const indices = tracks.map((_, index) => index);
      const order = random && initialIndex >= 0
        ? [initialIndex, ...playbackOrder(indices.filter((index) => index !== initialIndex), true)]
        : playbackOrder(indices, random);
      const position = initialIndex >= 0 ? order.indexOf(initialIndex) : 0;
      const state = get();
      const id = state.generation + 1;
      set({
        generation: id,
        floating: state.session !== null && state.floating,
        notice: null,
        session: {
          id, owner, kind, tracks, loop, random,
          queue: { mode: "continuous", order, position, playerIndex: order[position], sequence: 0, failed: [] },
        },
      });
    },
    stop: () => set({ session: null, floating: false, notice: null }),
    detach: () => { if (get().session) set({ floating: true }); },
    restore: (owner) => {
      const state = get();
      if (!state.floating || state.session?.owner !== owner) return;
      set({
        floating: false,
        notice: state.notice?.owner === owner ? { ...state.notice, floating: false } : state.notice,
      });
    },
    release: (owner) => {
      if (get().session?.owner === owner && !get().floating) get().stop();
    },
    setLoop: (loop) => {
      const session = get().session;
      if (session) set({ session: { ...session, loop } });
    },
    setRandom: (random) => {
      const session = get().session;
      if (!session) return;
      const queue = session.queue;
      const remaining = queue.order.slice(queue.position + 1).sort((a, b) => a - b);
      set({ session: { ...session, random, queue: {
        ...queue,
        order: [...queue.order.slice(0, queue.position + 1), ...playbackOrder(remaining, random)],
      } } });
    },
    advance: (sessionId, failed = false, videoId, provider, sequence) => {
      const state = get();
      const session = state.session;
      if (!session || session.id !== sessionId) return;
      if (sequence !== undefined && sequence !== session.queue.sequence) return;
      const active = session.tracks[session.queue.order[session.queue.position]];
      if (provider && ((active.provider ?? "youtube") !== provider || (videoId !== undefined && active.videoId !== videoId))) return;
      const current = atVideo(session, videoId, provider);
      const queue = session.kind === "single" ? null : advancePlayback(current, {
        loop: session.loop, random: session.random, failed,
      });
      set({
        session: queue ? { ...session, queue } : null,
        floating: queue !== null && state.floating,
        notice: failed ? {
          owner: session.owner, floating: state.floating, kind: "skipped",
          title: session.tracks[current.order[current.position]].title,
        } : state.notice,
      });
    },
    selectTrack: (sessionId, identifier) => {
      const session = get().session;
      if (!session || session.id !== sessionId || session.kind !== "queue") return;
      const { queue, tracks } = session;
      const position = queue.order.findIndex((index) => tracks[index].identifier === identifier);
      if (position < 0) return;
      const playerIndex = queue.order[position];
      set({
        notice: null,
        session: { ...session, queue: {
          ...queue,
          position,
          playerIndex,
          sequence: queue.sequence + 1,
          failed: queue.failed.filter((index) => index !== playerIndex),
        } },
      });
    },
    synchronize: (sessionId, videoId, provider, sequence) => {
      const state = get();
      const session = state.session;
      if (!session || session.id !== sessionId) return;
      if (sequence !== undefined && sequence !== session.queue.sequence) return;
      if (provider && (session.tracks[session.queue.playerIndex].provider ?? "youtube") !== provider) return;
      const queue = atVideo(session, videoId, provider);
      if (session.tracks[queue.order[queue.position]].videoId !== videoId) {
        set({ session: null, floating: false, notice: {
          owner: session.owner, floating: state.floating, kind: "outsideQueue",
        } });
      } else if (queue !== session.queue) set({ session: { ...session, queue } });
    },
    unavailable: (sessionId) => {
      const state = get();
      if (state.session?.id !== sessionId) return;
      set({ session: null, floating: false, notice: {
        owner: state.session.owner, floating: state.floating, kind: "unavailable",
      } });
    },
    clearNotice: () => set({ notice: null }),
  }));
}
export type PlaybackStore = ReturnType<typeof createPlaybackStore>;
