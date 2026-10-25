"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { Cross2Icon, ExternalLinkIcon, LoopIcon, ShuffleIcon } from "@radix-ui/react-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { createPlaybackStore, type PlaybackStore, type PlaybackSession } from "./playbackStore";
import { YouTubeQueuePlayer } from "./YouTubeQueuePlayer";
import { useFloatingPosition } from "./useFloatingPosition";

type Anchor = { owner: string; node: HTMLDivElement };
const PlaybackContext = createContext<{
  store: PlaybackStore;
  register: (owner: string, node: HTMLDivElement | null) => void;
  height: number;
} | null>(null);

export const useYouTubePlayback = () => useContext(PlaybackContext);

export function YouTubePlaybackProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPlaybackStore);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [height, setHeight] = useState(0);
  const register = useCallback((owner: string, node: HTMLDivElement | null) => {
    setAnchor((current) => node ? { owner, node } : current?.owner === owner ? null : current);
  }, []);
  return (
    <PlaybackContext.Provider value={{ store, register, height }}>
      {children}
      <PlaybackHost store={store} anchor={anchor} onHeight={setHeight} />
    </PlaybackContext.Provider>
  );
}

export function PlaybackOutlet({ owner }: { owner: string }) {
  const context = useYouTubePlayback();
  const register = context?.register;
  const ref = useCallback((node: HTMLDivElement | null) => register?.(owner, node), [owner, register]);
  if (!context) return null;
  return <ConnectedOutlet owner={owner} store={context.store} height={context.height} anchorRef={ref} />;
}

function ConnectedOutlet({ owner, store, height, anchorRef }: {
  owner: string; store: PlaybackStore; height: number;
  anchorRef: (node: HTMLDivElement | null) => void;
}) {
  const session = useStore(store, (state) => state.session);
  const floating = useStore(store, (state) => state.floating);
  if (session?.owner !== owner) return null;
  return <div ref={anchorRef} style={{ height: floating ? 0 : height || 240 }} />;
}

export function usePlaybackOwner(store: PlaybackStore, owner: string) {
  useEffect(() => () => store.getState().release(owner), [store, owner]);
}

const iconClass = "relative flex h-10 w-10 shrink-0 touch-manipulation cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary aria-pressed:text-brand-primary aria-pressed:after:absolute aria-pressed:after:bottom-0 aria-pressed:after:h-1 aria-pressed:after:w-1 aria-pressed:after:rounded-full aria-pressed:after:bg-brand-primary";

const resizeHandles = {
  n: "left-3 right-3 top-0 h-2 cursor-ns-resize",
  s: "bottom-0 left-3 right-3 h-2 cursor-ns-resize",
  e: "bottom-3 right-0 top-3 w-2 cursor-ew-resize",
  w: "bottom-3 left-0 top-3 w-2 cursor-ew-resize",
  ne: "right-0 top-0 h-3 w-3 cursor-nesw-resize",
  nw: "left-0 top-0 h-3 w-3 cursor-nwse-resize",
  se: "bottom-0 right-0 h-3 w-3 cursor-nwse-resize",
  sw: "bottom-0 left-0 h-3 w-3 cursor-nesw-resize",
};

function PlaybackHost({ store, anchor, onHeight }: {
  store: PlaybackStore; anchor: Anchor | null; onHeight: (height: number) => void;
}) {
  const session = useStore(store, (state) => state.session);
  const notice = useStore(store, (state) => state.notice);
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  if (!session) return notice?.floating ? (
    <div role="status" className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-stroke-subtle bg-surface-raised p-3 text-text-strong shadow-soft">
      {t[notice.kind]}{notice.title ? `: ${notice.title}` : ""}
      <button type="button" aria-label={t.close} onClick={() => store.getState().clearNotice()} className={iconClass}><Cross2Icon aria-hidden="true" /></button>
    </div>
  ) : null;
  return <PlayerSurface session={session} store={store} anchor={anchor?.owner === session.owner ? anchor.node : null} onHeight={onHeight} />;
}

function PlayerSurface({ session, store, anchor, onHeight }: {
  session: PlaybackSession; store: PlaybackStore; anchor: HTMLDivElement | null; onHeight: (height: number) => void;
}) {
  const floating = useStore(store, (state) => state.floating);
  const notice = useStore(store, (state) => state.notice);
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos.continuous;
  const root = useRef<HTMLElement>(null);
  const moveHintId = useId();
  const [inlineStyle, setInlineStyle] = useState<CSSProperties>({});
  const { style: floatingStyle, dragProps, keyboardProps } = useFloatingPosition(root, floating);
  const { queue, tracks } = session;
  const active = tracks[queue.order[queue.position]];
  const requested = tracks[queue.playerIndex];
  // Keep the player in this shared host; the page outlet only supplies its
  // coordinates and reserves space for the inline presentation.
  useLayoutEffect(() => {
    if (floating || !anchor) return;
    const measure = () => {
      const rect = anchor.getBoundingClientRect();
      setInlineStyle({ position: "absolute", top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width || 320 });
      onHeight(root.current?.getBoundingClientRect().height || 240);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(anchor);
    observer?.observe(document.body);
    if (root.current) observer?.observe(root.current);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchor, floating, onHeight]);
  return (
    <section
      ref={root}
      {...(floating ? { ...dragProps, ...keyboardProps, tabIndex: 0 } : {})}
      aria-label={floating ? t.miniPlayer : t.nowPlaying}
      aria-describedby={floating ? moveHintId : undefined}
      style={floating ? floatingStyle : inlineStyle}
      className={floating
        ? "z-50 max-h-[calc(100dvh-2rem)] touch-none cursor-grab select-none overflow-auto rounded-2xl border border-stroke-subtle bg-surface-raised p-3 text-text-strong shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary active:cursor-grabbing"
        : "z-10 space-y-3 text-text-strong"}
    >
      {floating ? <span id={moveHintId} className="sr-only">{t.moveHint}</span> : null}
      <div className={`flex items-center gap-1${floating ? " pb-2" : ""}`}>
        <p role="status" title={active.title} className="min-w-0 flex-1 truncate font-semibold">
          {active.title}{session.kind === "queue" ? ` (${queue.position + 1}/${queue.order.length})` : ""}
        </p>
        {floating && session.kind === "queue" ? <>
          <button type="button" aria-label={t.random} title={t.random} aria-pressed={session.random} className={iconClass} onClick={() => store.getState().setRandom(!session.random)}><ShuffleIcon aria-hidden="true" className="h-5 w-5" /></button>
          <button type="button" aria-label={t.loop} title={t.loop} aria-pressed={session.loop} className={iconClass} onClick={() => store.getState().setLoop(!session.loop)}><LoopIcon aria-hidden="true" className="h-5 w-5" /></button>
        </> : null}
        {!floating ? (
          <button type="button" aria-label={t.detach} title={t.detach} className={iconClass} onClick={() => store.getState().detach()}><ExternalLinkIcon aria-hidden="true" className="h-5 w-5" /></button>
        ) : (
          <button type="button" aria-label={t.stop} title={t.stop} className={iconClass} onClick={() => store.getState().stop()}><Cross2Icon aria-hidden="true" className="h-5 w-5" /></button>
        )}
      </div>
      <div data-player-interactive className="touch-auto cursor-auto">
        <YouTubeQueuePlayer
          key={session.id}
          playbackKey={queue.sequence}
          videoId={requested.videoId}
          title={active.title}
          onVideoChange={(id) => store.getState().synchronize(session.id, id)}
          onEnded={(id) => store.getState().advance(session.id, false, id)}
          onError={() => store.getState().advance(session.id, true)}
          onUnavailable={() => store.getState().unavailable(session.id)}
        />
      </div>
      {floating && notice?.owner === session.owner ? <p role="status">{t[notice.kind]}{notice.title ? `: ${notice.title}` : ""}</p> : null}
      {floating ? Object.entries(resizeHandles).map(([edge, className]) => (
        <div key={edge} aria-hidden="true" data-player-resize={edge} className={`absolute z-20 touch-none ${className}`} />
      )) : null}
    </section>
  );
}
