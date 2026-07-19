"use client";

import Image from "next/image";
import Link from "next/link";
import type { WikiProfileCardListBlock } from "@kpool/wiki";
import { buildWikiPath, toSafeWikiImageUrl } from "@kpool/wiki";

import { cardSurfaceStyle } from "../styles";

const profileCardStyle = {
  backgroundColor: "var(--wiki-card-background-muted, var(--surface-base))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

export function WikiRelatedProfiles({
  block,
  language,
}: {
  block: WikiProfileCardListBlock;
  language: string;
}) {
  const profiles = block.profiles ?? [];

  if (profiles.length === 0) {
    return (
      <section aria-label={block.title ?? "Related profiles"}>
        {block.title ? (
          <h3 className="text-lg font-semibold text-text-strong">{block.title}</h3>
        ) : null}
        <p className="mt-3 rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-5 text-base text-text-muted">
          関連プロフィールはありません
        </p>
      </section>
    );
  }

  return (
    <section aria-label={block.title ?? "Related profiles"}>
      {block.title ? (
        <h3 className="text-lg font-semibold text-text-strong">{block.title}</h3>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {profiles.map((profile) => {
          const safeImageUrl = profile.isHidden ? null : toSafeWikiImageUrl(profile.imageUrl);

          return (
            <Link
              className="group overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              href={buildWikiPath(profile.language || language, profile.slug)}
              key={profile.wikiIdentifier}
              style={profileCardStyle}
            >
              <div className="relative aspect-[2/3] overflow-hidden bg-surface-base">
                {safeImageUrl ? (
                  <Image
                    alt={profile.imageAltText || profile.name}
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    src={safeImageUrl}
                    unoptimized
                  />
                ) : (
                  <div aria-hidden="true" className="h-full w-full" style={cardSurfaceStyle} />
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-base font-semibold text-text-strong">{profile.name}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
