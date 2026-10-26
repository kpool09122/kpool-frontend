"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { PlaybackOutlet, useYouTubePlayback } from "@/components/YouTubePlayback/YouTubePlaybackProvider";
import { YouTubeQueueControls } from "@/components/YouTubePlayback/YouTubeQueueControls";
import type { PlaybackSession, PlaybackTrack } from "@/components/YouTubePlayback/playbackStore";
import { playlistItemKey, type Playlist } from "@/gateways/wiki/wikiPlaylists";
import type { PlaybackText } from "./playlistUi";
import { SavedPlaylistQueue } from "./SavedPlaylistQueue";

export function SavedPlaylistPlayback(props: {
  detail: Playlist; tracks: PlaybackTrack[]; principal: string; playbackText: PlaybackText; editor: EditorRenderer;
}) {
  const context = useYouTubePlayback();
  if (!context) return props.editor();
  return <ConnectedPlaylistPlayback key={props.detail.playlistIdentifier} {...props} store={context.store} />;
}

type EditorRenderer = (session?: PlaybackSession, onSelect?: (identifier: string) => void) => ReactNode;

function ConnectedPlaylistPlayback({ detail, tracks, principal, playbackText, store, editor }: {
  detail: Playlist; tracks: PlaybackTrack[]; principal: string; playbackText: PlaybackText; editor: EditorRenderer;
  store: NonNullable<ReturnType<typeof useYouTubePlayback>>["store"];
}) {
  const owner = `private-playlist:${principal}:${detail.playlistIdentifier}`;
  const session = useStore(store, (state) => state.session);
  const notice = useStore(store, (state) => state.notice);
  const [preferredRandom, setPreferredRandom] = useState(false);
  const [preferredLoop, setPreferredLoop] = useState(false);
  const playback = session?.owner === owner ? session : null;
  const random = playback?.random ?? preferredRandom;
  const loop = playback?.loop ?? preferredLoop;
  const startButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => () => store.getState().release(owner), [store, owner]);
  useEffect(() => {
    if (restoreFocus.current && !playback) {
      restoreFocus.current = false;
      startButton.current?.focus();
    }
  }, [playback]);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-full">
          <YouTubeQueueControls
            labels={playbackText}
            empty={!detail.items.length}
            playing={!!playback}
            floating={false}
            loop={loop}
            random={random}
            startRef={startButton}
            onStart={() => store.getState().start(
              owner,
              [...detail.items].sort((a, b) => a.position - b.position).map((item) => ({
                identifier: playlistItemKey(item), videoId: item.externalVideoId, title: item.title,
              })),
              "queue", loop, random,
            )}
            onToggleRandom={() => {
              setPreferredRandom(!random);
              if (playback) store.getState().setRandom(!random);
            }}
            onToggleLoop={() => {
              setPreferredLoop(!loop);
              if (playback) store.getState().setLoop(!loop);
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
