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
import { useAuthStore } from "@/gateways/auth/authStore";
import { Cross2Icon, EnterFullScreenIcon, ExitFullScreenIcon, ExternalLinkIcon, ShuffleIcon, TrackNextIcon, TrackPreviousIcon } from "@radix-ui/react-icons";
import { adjacentPlaybackIndex, nextLoopMode } from "./playbackQueue";
import { LoopPlaybackButton } from "./LoopPlaybackButton";
import { useI18n } from "@/i18n/I18nProvider";
import { createPlaybackStore, type PlaybackStore, type PlaybackSession } from "./playbackStore";
import { TikTokPlayer } from "./TikTokPlayer";
import { YouTubeQueuePlayer } from "./YouTubeQueuePlayer";
import { useFloatingPosition } from "./useFloatingPosition";
import { usePlayerFullscreen } from "./usePlayerFullscreen";
import { useFullscreenControls } from "./useFullscreenControls";
import { MiniPlayerPlaceholder } from "./MiniPlayerPlaceholder";

type Anchor = { owner: string; node: HTMLDivElement };
const PlaybackContext = createContext<{
  store: PlaybackStore;
  register: (owner: string, node: HTMLDivElement | null) => void;
  height: number;
} | null>(null);

export const useVideoPlayback = () => useContext(PlaybackContext);

export function VideoPlaybackProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPlaybackStore);
  useEffect(() => useAuthStore.subscribe((next, previous) => {
    const scope = (state: typeof next) => [state.status, state.identity?.identityIdentifier, state.identity?.accountIdentifier, state.identity?.accountPrincipalIdentifier, state.sessionVersion].join(":");
    const state = store.getState();
    if (scope(next) !== scope(previous) && (state.session?.owner.startsWith("private-playlist:") || state.notice?.owner.startsWith("private-playlist:"))) state.stop();
  }), [store]);
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

export function PlaybackOutlet({ owner, preserveSpace = false }: { owner: string; preserveSpace?: boolean }) {
  const context = useVideoPlayback();
  const register = context?.register;
  const ref = useCallback((node: HTMLDivElement | null) => register?.(owner, node), [owner, register]);
  if (!context) return null;
  return <ConnectedOutlet owner={owner} store={context.store} height={context.height} anchorRef={ref} preserveSpace={preserveSpace} />;
}

function ConnectedOutlet({ owner, store, height, anchorRef, preserveSpace }: {
  owner: string; store: PlaybackStore; height: number; preserveSpace: boolean;
  anchorRef: (node: HTMLDivElement | null) => void;
}) {
  const session = useStore(store, (state) => state.session);
  const floating = useStore(store, (state) => state.floating);
  if (session?.owner !== owner) return null;
  return (
    <div ref={anchorRef} style={floating && !preserveSpace ? undefined : { height: height || 240 }}>
      {floating ? <MiniPlayerPlaceholder fill={preserveSpace} onRestore={() => store.getState().restore(owner)} /> : null}
    </div>
  );
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
  const wasFloating = useRef(floating);
  useEffect(() => {
    if (wasFloating.current && !floating) root.current?.focus({ preventScroll: true });
    wasFloating.current = floating;
  }, [floating]);
  const { fullscreen, failed: fullscreenFailed, toggle: toggleFullscreen } = usePlayerFullscreen(root);
  const controls = useFullscreenControls(fullscreen);
  const fullscreenBarClass = `absolute inset-x-0 z-20 bg-black/50 px-3 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none [&_button]:text-white/85 [&_button:hover]:text-white ${controls.visible ? "opacity-100" : "pointer-events-none opacity-0"}`;
  const moveHintId = useId();
  const [inlineStyle, setInlineStyle] = useState<CSSProperties>({});
  const movable = floating && !fullscreen;
  const { style: floatingStyle, dragProps, keyboardProps } = useFloatingPosition(root, movable);
  const { queue, tracks } = session;
  const active = tracks[queue.order[queue.position]];
  const requested = tracks[queue.playerIndex];
  const previousIndex = adjacentPlaybackIndex(queue, -1, session.loop);
  const nextIndex = adjacentPlaybackIndex(queue, 1, session.loop);
  // Keep the player in this shared host; the page outlet only supplies its
  // coordinates and reserves space for the inline presentation.
  useLayoutEffect(() => {
    if (floating || fullscreen || !anchor) return;
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
  }, [anchor, floating, fullscreen, onHeight]);
  const queueControls = (
    <>
      <button type="button" aria-label={t.random} title={t.random} aria-pressed={session.random} className={iconClass} onClick={() => store.getState().setRandom(!session.random)}><ShuffleIcon aria-hidden="true" className="h-5 w-5" /></button>
      <button type="button" aria-label={t.previous} title={t.previous}
        className={`${iconClass} disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={previousIndex === undefined}
        onClick={() => {
          if (previousIndex !== undefined) store.getState().selectTrack(session.id, tracks[previousIndex].identifier);
        }}>
        <TrackPreviousIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      <button type="button" aria-label={t.next} title={t.next}
        className={`${iconClass} disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={nextIndex === undefined}
        onClick={() => {
          if (nextIndex !== undefined) store.getState().selectTrack(session.id, tracks[nextIndex].identifier);
        }}>
        <TrackNextIcon aria-hidden="true" className="h-5 w-5" />
      </button>
      <LoopPlaybackButton mode={session.loop} labels={t} className={iconClass} iconClassName="h-5 w-5"
        onClick={() => store.getState().setLoop(nextLoopMode(session.loop))} />
    </>
  );
  return (
    <section
      ref={root}
      tabIndex={movable ? 0 : -1}
      {...(movable ? { ...dragProps, ...keyboardProps } : {})}
      {...(fullscreen ? {
        onPointerMove: controls.reveal,
        onPointerDown: controls.reveal,
        onKeyDown: controls.reveal,
      } : {})}
      aria-label={floating ? t.miniPlayer : t.nowPlaying}
      aria-describedby={movable ? moveHintId : undefined}
      style={fullscreen ? { position: "fixed", inset: 0, width: "100%", height: "100dvh" } : floating ? floatingStyle : inlineStyle}
      className={fullscreen
        ? "z-50 overflow-hidden overscroll-none bg-black text-white"
        : floating
        ? "z-50 max-h-[calc(100dvh-2rem)] touch-none cursor-grab select-none overflow-auto rounded-2xl border border-stroke-subtle bg-surface-raised p-3 text-text-strong shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary active:cursor-grabbing"
        : "z-10 space-y-3 text-text-strong"}
    >
      {movable ? <span id={moveHintId} className="sr-only">{t.moveHint}</span> : null}
      <div
        {...(fullscreen ? controls.barProps : {})}
        inert={fullscreen && !controls.visible}
        aria-hidden={fullscreen && !controls.visible ? true : undefined}
        data-fullscreen-bar={fullscreen ? "top" : undefined}
        className={`flex shrink-0 items-center gap-1${floating && !fullscreen ? " pb-2" : ""}${fullscreen ? ` ${fullscreenBarClass} top-0 flex-wrap pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]` : ""}`}>
        <p role="status" title={active.title} className={fullscreen ? "w-full min-w-0 truncate font-semibold sm:w-auto sm:flex-1" : "min-w-0 flex-1 truncate font-semibold"}>
          {active.title}{session.kind === "queue" ? ` (${queue.position + 1}/${queue.order.length})` : ""}
        </p>
        {fullscreen && session.kind === "queue" ? queueControls : null}
        {floating || fullscreen ? active.controls : null}
        <button type="button" aria-label={fullscreen ? t.exitFullscreen : t.enterFullscreen} title={fullscreen ? t.exitFullscreen : t.enterFullscreen} aria-pressed={fullscreen} className={iconClass} onClick={() => void toggleFullscreen()}>
          {fullscreen ? <ExitFullScreenIcon aria-hidden="true" className="h-5 w-5" /> : <EnterFullScreenIcon aria-hidden="true" className="h-5 w-5" />}
        </button>
        {!floating && !fullscreen ? (
          <button type="button" aria-label={t.detach} title={t.detach} className={iconClass} onClick={() => store.getState().detach()}><ExternalLinkIcon aria-hidden="true" className="h-5 w-5" /></button>
        ) : (
          <button type="button" aria-label={t.stop} title={t.stop} className={iconClass} onClick={() => store.getState().stop()}><Cross2Icon aria-hidden="true" className="h-5 w-5" /></button>
        )}
      </div>
      {fullscreenFailed ? <p role="status" className={fullscreen ? "absolute inset-x-0 bottom-24 z-30 bg-black/60 p-3" : undefined}>{t.fullscreenFailed}</p> : null}
      <div data-player-interactive className={`touch-auto cursor-auto${fullscreen ? " absolute inset-0" : ""}`}>
        {requested.provider === "tiktok" ? <TikTokPlayer
          key={`${session.id}:tiktok:${queue.sequence}`}
          videoId={requested.videoId} title={active.title} expanded={fullscreen}
          advanceOnError={session.kind === "queue"}
          onEnded={() => store.getState().advance(session.id, false, requested.videoId, "tiktok", queue.sequence)}
          onError={() => store.getState().advance(session.id, true, requested.videoId, "tiktok", queue.sequence)}
        /> : <YouTubeQueuePlayer
          key={`${session.id}:youtube`}
          expanded={fullscreen}
          playbackKey={queue.sequence}
          videoId={requested.videoId}
          title={active.title}
          onVideoChange={(id) => store.getState().synchronize(session.id, id, "youtube", queue.sequence)}
          onEnded={(id) => store.getState().advance(session.id, false, id, "youtube", queue.sequence)}
          onError={() => store.getState().advance(session.id, true, requested.videoId, "youtube", queue.sequence)}
          onUnavailable={() => store.getState().unavailable(session.id)}
        />}
      </div>
      {fullscreen && !controls.visible ? (
        <button type="button" aria-label={t.showControls}
          className="absolute inset-0 z-10 cursor-default bg-transparent focus-visible:outline-2 focus-visible:outline-white"
          onClick={controls.reveal} onFocus={controls.reveal} />
      ) : null}
      {floating && !fullscreen && session.kind === "queue" ? (
        <div className="flex shrink-0 items-center justify-center gap-4 pt-2">
          {queueControls}
        </div>
      ) : null}
      {floating && notice?.owner === session.owner ? <p role="status" className={fullscreen ? "absolute inset-x-0 bottom-24 z-30 bg-black/60 p-3" : undefined}>{t[notice.kind]}{notice.title ? `: ${notice.title}` : ""}</p> : null}
      {movable ? Object.entries(resizeHandles).map(([edge, className]) => (
        <div key={edge} aria-hidden="true" data-player-resize={edge} className={`absolute z-20 touch-none ${className}`} />
      )) : null}
    </section>
  );
}
