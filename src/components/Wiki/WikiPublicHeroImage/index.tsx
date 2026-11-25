"use client";

import { ReloadIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import type { MouseEventHandler } from "react";
import { useState } from "react";
import { WikiImageDeletionRequestDialog } from "../WikiImageDeletionRequestDialog";
import { type WikiBasic, type WikiDetail } from "@kpool/wiki";

import { WikiImageSourceLink } from "../WikiImageSourceLink";
import { WikiHeroPanel } from "../WikiHeroPanel";
import { WikiProfileExpandButton } from "../WikiProfileExpandButton";
import { WikiProfileCardDetails } from "../WikiProfileCardDetails";
import {
  cardSurfaceStyle,
  transparentFrameStyle,
} from "../styles";
import { EditIcon } from "../icons";
import { dictionaries } from "../../../i18n/dictionaries";
import { normalizeLocale } from "../../../i18n/locales";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiPublicHeroImageProps = {
  basic: WikiBasic;
  heroImage: WikiDetail["heroImage"];
  editHref?: string;
  onEdit?: MouseEventHandler<HTMLAnchorElement>;
  flipCardId: string;
  language?: string;
  profileLabel?: string;
  translationSetIdentifier?: string;
};

export function WikiPublicHeroImage({
  basic,
  editHref,
  onEdit,
  heroImage,
  flipCardId,
  language = "ja",
  profileLabel,
  translationSetIdentifier,
}: WikiPublicHeroImageProps) {
  const { dictionary } = useI18n();
  const contentDictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const t = dictionary.wiki.heroCard;
  const resolvedProfileLabel = profileLabel ?? contentDictionary.wiki.heroCard.basicProfile;
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDeletionRequestOpen, setIsDeletionRequestOpen] = useState(false);
  const isHeroImageHidden = heroImage.isHidden === true;
  const canRequestDeletion = Boolean(heroImage.imageIdentifier && translationSetIdentifier && !isHeroImageHidden);

  return (
    <section style={transparentFrameStyle}>
      <div className="space-y-4">
        <input
          checked={isFlipped}
          className="sr-only"
          data-testid="wiki-flip-input"
          id={flipCardId}
          onChange={(event) => setIsFlipped(event.currentTarget.checked)}
          type="checkbox"
        />
        <div
          aria-label={t.flipPublicCard}
          className="block"
          data-testid="wiki-flip-trigger"
          role="group"
        >
          <div className={`mx-auto max-w-[min(100%,48rem)] [perspective:1400px] ${heroImage.isPlaceholder ? "w-full" : "w-fit"}`}>
            <div
              className={`relative rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] ${
                isFlipped ? "[transform:rotateY(180deg)]" : ""
              }`}
              data-testid="wiki-flip-card"
            >
              <div className="pointer-events-none [backface-visibility:hidden]" inert={isFlipped}>
                <WikiHeroPanel heroImage={heroImage} />
              </div>
              <label
                aria-label={t.flipPublicCardToBasic}
                className={`absolute inset-0 z-30 rounded-[2rem] ${
                  isFlipped ? "pointer-events-none" : "cursor-pointer"
                }`}
                data-testid="wiki-flip-front-toggle"
                htmlFor={flipCardId}
              />

              <div
                className={`absolute inset-0 z-20 overflow-y-auto rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                  isFlipped ? "pointer-events-auto" : "pointer-events-none"
                }`}
                inert={!isFlipped}
                onClick={() => setIsFlipped(false)}
                style={cardSurfaceStyle}
              >
                <WikiProfileCardDetails
                  basic={basic}
                  language={language}
                  title={resolvedProfileLabel}
                  action={
                    <div className="flex shrink-0 items-center gap-1">
                      <WikiProfileExpandButton basic={basic} language={language} title={resolvedProfileLabel} />
                      {editHref ? (
                        <Link
                          aria-label={t.editBasic}
                          className="rounded-full p-2 text-text-strong transition hover:bg-brand-highlight/30"
                          href={editHref}
                          onClick={(event) => { event.stopPropagation(); onEdit?.(event); }}
                        >
                          <EditIcon />
                        </Link>
                      ) : null}
                    </div>
                  }
                />
                <div className="grid justify-items-start gap-2 pt-4 text-start" onClick={(event) => event.stopPropagation()}>
                  <WikiImageSourceLink className="text-start" image={heroImage} />
                  {canRequestDeletion ? (
                    <button
                      className="text-xs text-text-muted underline underline-offset-4 hover:text-text-strong"
                      onClick={() => setIsDeletionRequestOpen(true)}
                      type="button"
                    >
                      {t.requestImageDeletion}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center">
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs text-text-muted transition hover:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            onClick={() => setIsFlipped((flipped) => !flipped)}
            type="button"
          >
            <ReloadIcon aria-hidden="true" />
            {isFlipped ? t.publicShowPhoto : t.publicShowBasic}
          </button>
        </div>

      </div>
      {canRequestDeletion && translationSetIdentifier && isDeletionRequestOpen ? (
        <WikiImageDeletionRequestDialog
          heroImage={heroImage}
          onClose={() => setIsDeletionRequestOpen(false)}
          translationSetIdentifier={translationSetIdentifier}
        />
      ) : null}
    </section>
  );
}
