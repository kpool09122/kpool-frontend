"use client";

import Image from "next/image";
import Link from "next/link";
import {
  getWikiDetailState,
  type WikiProfileCardListBlock,
} from "@kpool/wiki";

const profileCardStyle = {
  backgroundColor: "var(--wiki-card-background-muted, var(--surface-base))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

type RelatedProfile = {
  heroImage: {
    alt: string;
    src: string;
  };
  name: string;
  slug: string;
};

function getRelatedProfile(slug: string): RelatedProfile | null {
  const state = getWikiDetailState(slug);

  if (state.status !== "success") {
    return null;
  }

  return {
    heroImage: state.data.heroImage,
    name: state.data.basic.name,
    slug: state.data.slug,
  };
}

export function WikiRelatedProfiles({
  block,
}: {
  block: WikiProfileCardListBlock;
}) {
  const profiles = block.wikiIdentifiers
    .map((slug) => getRelatedProfile(slug.trim()))
    .filter((profile): profile is RelatedProfile => profile !== null);

  if (profiles.length === 0) {
    return null;
  }

  return (
    <section aria-label={block.title ?? "Related profiles"}>
      {block.title ? (
        <h3 className="text-base font-semibold text-text-strong">{block.title}</h3>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {profiles.map((profile) => (
          <Link
            className="group overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            href={`/wiki/${profile.slug}`}
            key={profile.slug}
            style={profileCardStyle}
          >
            <div className="relative aspect-[2/3] overflow-hidden bg-surface-base">
              <Image
                alt={profile.heroImage.alt}
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                src={profile.heroImage.src}
              />
            </div>
            <div className="px-4 py-3">
              <p className="text-sm font-semibold text-text-strong">{profile.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
