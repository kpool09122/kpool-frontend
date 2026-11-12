"use client";

import { useI18n } from "@/i18n/I18nProvider";

import { WikiProfileImage } from "../WikiProfileImage";
import Link from "next/link";
import type { WikiProfileCardListBlock } from "@kpool/wiki";
import { buildWikiPath, toSafeWikiImageUrl } from "@kpool/wiki";

import { cardSurfaceStyle } from "../styles";
import { profileCardAspectClasses, profileCardGridClasses } from "./layout";

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
  const { dictionary } = useI18n();
  const profiles = block.profiles ?? [];
  const cardShape = block.cardShape ?? "portrait";

  if (profiles.length === 0) {
    return (
      <section aria-label={block.title ?? dictionary.wiki.ui.relatedSearch}>
        {block.title ? (
          <h3 className="wiki-title text-lg font-semibold">{block.title}</h3>
        ) : null}
        <p className="mt-3 rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-5 text-base text-text-muted">
          {dictionary.wiki.ui.relatedEmpty}
        </p>
      </section>
    );
  }

  return (
    <section aria-label={block.title ?? dictionary.wiki.ui.relatedSearch}>
      {block.title ? (
        <h3 className="wiki-title text-lg font-semibold">{block.title}</h3>
      ) : null}
      <div className={`mt-3 grid gap-3 ${profileCardGridClasses[cardShape]} ${cardShape === "landscape" ? "" : "xl:grid-cols-5"}`}>
        {profiles.map((profile) => {
          const safeImageUrl = profile.isHidden ? null : toSafeWikiImageUrl(profile.imageUrl);

          return (
            <Link
              className="group overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              data-wiki-link-placement="related_profile"
              data-wiki-id={profile.wikiIdentifier}
              data-wiki-resource-type={profile.resourceType}
              href={buildWikiPath(profile.language || language, profile.slug)}
              key={profile.wikiIdentifier}
              style={profileCardStyle}
            >
              <div className={`relative overflow-hidden bg-surface-base ${profileCardAspectClasses[cardShape]}`}>
                {safeImageUrl ? (
                  <WikiProfileImage
                    alt={profile.imageAltText || profile.name}
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    sizes={cardShape === "landscape"
                      ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      : "(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"}
                    src={safeImageUrl}
                  />
                ) : (
                  <div aria-hidden="true" className="h-full w-full" style={cardSurfaceStyle} />
                )}
              </div>
              <div className="px-4 py-3">
                <p className="wiki-title text-base font-semibold">{profile.name}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
