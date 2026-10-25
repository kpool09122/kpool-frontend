import type { ReactNode } from "react";
import { createStore } from "zustand/vanilla";
import { advancePlayback, playbackOrder, type PlaybackQueue } from "./playbackQueue";

export type PlaybackTrack = { identifier: string; videoId: string; title: string; controls?: ReactNode };
export type PlaybackSession = {
  id: number;
  owner: string;
  kind: "queue" | "single";
  tracks: PlaybackTrack[];
  queue: PlaybackQueue;
  loop: boolean;
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
  start: (owner: string, tracks: PlaybackTrack[], kind: PlaybackSession["kind"], loop?: boolean, random?: boolean) => void;
  stop: () => void;
  detach: () => void;
  release: (owner: string) => void;
  setLoop: (enabled: boolean) => void;
  setRandom: (enabled: boolean) => void;
  advance: (sessionId: number, failed?: boolean, videoId?: string) => void;
  synchronize: (sessionId: number, videoId: string) => void;
  unavailable: (sessionId: number) => void;
  clearNotice: () => void;
};

function atVideo(session: PlaybackSession, videoId?: string): PlaybackQueue {
  const current = session.queue;
  if (session.tracks[current.order[current.position]].videoId === videoId) return current;
  const position = current.order.findIndex((index) => session.tracks[index].videoId === videoId);
  return position < 0 ? current : { ...current, position };
}

export function createPlaybackStore() {
  return createStore<PlaybackState>((set, get) => ({
    session: null,
    floating: false,
    generation: 0,
    notice: null,
    start: (owner, tracks, kind, loop = false, random = false) => {
      if (!tracks.length) return;
      const order = playbackOrder(tracks.map((_, index) => index), random);
      const state = get();
      const id = state.generation + 1;
      set({
        generation: id,
        floating: state.session !== null && state.floating,
        notice: null,
        session: {
          id, owner, kind, tracks, loop, random,
          queue: { mode: "continuous", order, position: 0, playerIndex: order[0], sequence: 0, failed: [] },
        },
      });
    },
    stop: () => set({ session: null, floating: false, notice: null }),
    detach: () => { if (get().session) set({ floating: true }); },
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
    advance: (sessionId, failed = false, videoId) => {
      const state = get();
      const session = state.session;
      if (!session || session.id !== sessionId) return;
      const current = atVideo(session, videoId);
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
    synchronize: (sessionId, videoId) => {
      const state = get();
      const session = state.session;
      if (!session || session.id !== sessionId) return;
      const queue = atVideo(session, videoId);
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
