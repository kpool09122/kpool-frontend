"use client";

import Image from "next/image";
import { ImageIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { getVideoThumbnailUrl, getYouTubeVideoId } from "@kpool/wiki";

export function PlaylistVideoThumbnail({ url, thumbnailUrl }: {
  url: string;
  thumbnailUrl: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const videoId = getYouTubeVideoId(url);
  const thumbnail = getVideoThumbnailUrl(thumbnailUrl) ??
    (videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null);
  return (
    <div className="flex h-9 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-surface-muted" aria-hidden="true">
      {thumbnail && !imageFailed ? (
        <Image
          src={thumbnail}
          alt=""
          width={64}
          height={36}
          unoptimized
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : <ImageIcon className="h-4 w-4 text-text-muted" />}
    </div>
  );
}
