"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { PlaybackOutlet, useVideoPlayback } from "@/components/VideoPlayback/VideoPlaybackProvider";
import { VideoQueueControls } from "@/components/VideoPlayback/VideoQueueControls";
import { adjacentPlaybackIndex, nextLoopMode, type LoopMode } from "@/components/VideoPlayback/playbackQueue";
import type { PlaybackSession, PlaybackTrack } from "@/components/VideoPlayback/playbackStore";
import { playlistItemKey, type Playlist } from "@/gateways/wiki/wikiPlaylists";
import type { PlaybackText } from "./playlistUi";
import { SavedPlaylistQueue } from "./SavedPlaylistQueue";

export function SavedPlaylistPlayback(props: {
  detail: Playlist; tracks: PlaybackTrack[]; principal: string; playbackText: PlaybackText; editor: EditorRenderer;
}) {
  const context = useVideoPlayback();
  if (!context) return props.editor();
  return <ConnectedPlaylistPlayback key={props.detail.playlistIdentifier} {...props} store={context.store} />;
}

type EditorRenderer = (session?: PlaybackSession, onSelect?: (identifier: string) => void) => ReactNode;

function ConnectedPlaylistPlayback({ detail, tracks, principal, playbackText, store, editor }: {
  detail: Playlist; tracks: PlaybackTrack[]; principal: string; playbackText: PlaybackText; editor: EditorRenderer;
  store: NonNullable<ReturnType<typeof useVideoPlayback>>["store"];
}) {
  const owner = `private-playlist:${principal}:${detail.playlistIdentifier}`;
  const session = useStore(store, (state) => state.session);
  const notice = useStore(store, (state) => state.notice);
  const [preferredRandom, setPreferredRandom] = useState(false);
  const [preferredLoop, setPreferredLoop] = useState<LoopMode>("off");
  const playback = session?.owner === owner ? session : null;
  const playing = playback !== null;
  const random = playback?.random ?? preferredRandom;
  const loop = playback?.loop ?? preferredLoop;
  const adjacentTrack = (offset: -1 | 1) => {
    if (!playback) return undefined;
    const index = adjacentPlaybackIndex(playback.queue, offset, loop);
    return index === undefined ? undefined : playback.tracks[index];
  };
  const previousTrack = adjacentTrack(-1);
  const nextTrack = adjacentTrack(1);
  const restoreFocus = useRef(false);
  useEffect(() => () => store.getState().release(owner), [store, owner]);
  const focusStartButton = useCallback((node: HTMLButtonElement | null) => {
    if (node && !playing && restoreFocus.current) {
      restoreFocus.current = false;
      node.focus();
    }
  }, [playing]);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-full">
          <VideoQueueControls
            labels={playbackText}
            showStartLabel={false}
            navigation={{
              onPrevious: playback && previousTrack
                ? () => store.getState().selectTrack(playback.id, previousTrack.identifier) : undefined,
              onNext: playback && nextTrack
                ? () => store.getState().selectTrack(playback.id, nextTrack.identifier) : undefined,
            }}
            empty={!detail.items.length}
            playing={playing}
            floating={false}
            loop={loop}
            random={random}
            startRef={focusStartButton}
            onStart={() => store.getState().start(
              owner,
              [...detail.items].sort((a, b) => a.position - b.position).map((item) => ({
                identifier: playlistItemKey(item), videoId: item.externalVideoId, provider: item.provider, title: item.title,
              })),
              "queue", loop, random,
            )}
            onToggleRandom={() => {
              setPreferredRandom(!random);
              if (playback) store.getState().setRandom(!random);
            }}
            onToggleLoop={() => {
              const next = nextLoopMode(loop);
              setPreferredLoop(next);
              if (playback) store.getState().setLoop(next);
            }}
            onStop={playback ? () => {
              restoreFocus.current = true;
              store.getState().stop();
            } : undefined}
          />
        </div>
      </div>
      {notice?.owner === owner && !notice.floating ? <p role="status">{playbackText[notice.kind]}</p> : null}
      <div className={playback ? "grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_15rem] xl:grid-cols-[minmax(0,1fr)_18rem]" : undefined}>
        <div className="min-w-0"><PlaybackOutlet owner={owner} preserveSpace /></div>
        {playback ? (
          <SavedPlaylistQueue
            session={playback}
            t={playbackText}
          >
            {editor(playback, (identifier) => store.getState().selectTrack(playback.id, identifier))}
          </SavedPlaylistQueue>
        ) : null}
      </div>
      {!playback ? editor(undefined, (identifier) => store.getState().start(
        owner, tracks, "queue", loop, random, identifier,
      )) : null}
    </div>
  );
}
