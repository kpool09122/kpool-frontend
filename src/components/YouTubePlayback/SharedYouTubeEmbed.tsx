"use client";

import Image from "next/image";
import { useId } from "react";
import { useStore } from "zustand";
import { PlayIcon } from "@radix-ui/react-icons";
import { useI18n } from "@/i18n/I18nProvider";
import { PlaybackOutlet, usePlaybackOwner, useYouTubePlayback } from "./YouTubePlaybackProvider";

export function SharedYouTubeEmbed({ videoId, title, identifier }: {
  videoId: string; title: string; identifier: string;
}) {
  const { store } = useYouTubePlayback()!;
  const owner = useId();
  usePlaybackOwner(store, owner);
  const session = useStore(store, (state) => state.session);
  const notice = useStore(store, (state) => state.notice);
  const { dictionary } = useI18n();
  const t = dictionary.wiki.videos;
  if (session?.owner === owner) return <PlaybackOutlet owner={owner} />;
  return <>
    <button
      type="button"
      aria-label={`${t.play}: ${title}`}
      onClick={() => store.getState().start(owner, [{ identifier, title, videoId }], "single")}
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-surface-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
    >
      <Image src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" fill unoptimized className="object-cover" referrerPolicy="no-referrer" sizes="(max-width: 640px) 100vw, 640px" />
      <span className="relative rounded-full bg-surface-raised/90 p-4 text-brand-primary"><PlayIcon aria-hidden="true" className="h-8 w-8" /></span>
    </button>
    {notice?.owner === owner && !notice.floating ? <p role="status" className="p-3 text-text-muted">{t.continuous[notice.kind]}{notice.title ? `: ${notice.title}` : ""}</p> : null}
  </>;
}
