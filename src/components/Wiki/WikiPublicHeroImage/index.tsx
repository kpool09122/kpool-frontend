"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { WikiImageDeletionRequestDialog } from "../WikiImageDeletionRequestDialog";
import { type WikiBasic, type WikiDetail } from "@kpool/wiki";

import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import {
  cardSurfaceMutedStyle,
  cardSurfaceStyle,
  transparentFrameStyle,
} from "../styles";
import { EditIcon } from "../icons";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiPublicHeroImageProps = {
  basic: WikiBasic;
  heroImage: WikiDetail["heroImage"];
  editHref?: string;
  flipCardId: string;
  language?: string;
  profileLabel?: string;
  translationSetIdentifier?: string;
};

export function WikiPublicHeroImage({
  basic,
  editHref,
  heroImage,
  flipCardId,
  language = "ja",
  profileLabel,
  translationSetIdentifier,
}: WikiPublicHeroImageProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.heroCard;
  const resolvedProfileLabel = profileLabel ?? t.basicProfile;
  const [isFlipped, setIsFlipped] = useState(false);
  const [isDeletionRequestOpen, setIsDeletionRequestOpen] = useState(false);
  const isHeroImageHidden = heroImage.isHidden === true;
  const canRequestDeletion = Boolean(heroImage.imageIdentifier && translationSetIdentifier && !isHeroImageHidden);

  return (
    <section className="lg:rounded-[2rem]" style={transparentFrameStyle}>
      <div className="grid gap-5 lg:hidden">
        <div className="space-y-4">
          <input
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
            <div className="relative h-[34rem] [perspective:1400px]">
              <div
                className={`relative h-full rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] ${
                  isFlipped ? "[transform:rotateY(180deg)]" : ""
                }`}
                data-testid="wiki-flip-card"
              >
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised [backface-visibility:hidden]"
                  style={cardSurfaceStyle}
                >
                  <div className="relative h-full w-full">
                    <Image
                      alt={heroImage.alt}
                      className="object-cover"
                      fill
                      sizes="100vw"
                      src={heroImage.src}
                      unoptimized
                    />
                  </div>
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
                  className={`absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    isFlipped ? "pointer-events-auto" : "pointer-events-none"
                  }`}
                  onClick={() => setIsFlipped(false)}
                  style={cardSurfaceStyle}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                        {t.basic}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        {resolvedProfileLabel}
                      </p>
                    </div>
                    {editHref ? (
                      <Link
                        aria-label={t.editBasic}
                        className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
                        href={editHref}
                        onClick={(event) => event.stopPropagation()}
                        style={cardSurfaceStyle}
                      >
                        <EditIcon />
                      </Link>
                    ) : null}
                  </div>
                  <div
                    className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <WikiBasicFieldsList
                      basic={basic}
                      className="grid gap-4"
                      itemClassName="rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-3"
                      itemStyle={cardSurfaceMutedStyle}
                      language={language}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-text-muted">
            <span className={isFlipped ? "hidden" : ""}>
              {t.publicCoverHint}
            </span>
            <span className={isFlipped ? "inline" : "hidden"}>
              {t.publicBasicHint}
            </span>
          </p>

          {canRequestDeletion && translationSetIdentifier ? (
            <div className="text-center">
              <button
                className="text-xs font-semibold text-text-muted underline underline-offset-4 transition hover:text-text-strong"
                onClick={() => setIsDeletionRequestOpen(true)}
                type="button"
              >
                {t.requestImageDeletion}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="hidden gap-6 py-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-full flex-col">
          <div
            className="min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-stroke-subtle"
            style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
          >
            <div className="relative h-full min-h-[30rem]">
              <Image
                alt={heroImage.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                src={heroImage.src}
                unoptimized
              />
            </div>
          </div>

          {canRequestDeletion && translationSetIdentifier ? (
            <div className="mt-3 text-center">
              <button
                className="text-xs font-semibold text-text-muted underline underline-offset-4 transition hover:text-text-strong"
                onClick={() => setIsDeletionRequestOpen(true)}
                type="button"
              >
                {t.requestImageDeletion}
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="rounded-[1.75rem] border border-stroke-subtle bg-surface-base p-6"
          style={cardSurfaceMutedStyle}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                Basic
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                {resolvedProfileLabel}
              </p>
            </div>
            {editHref ? (
              <Link
                aria-label={t.editBasic}
                className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
                href={editHref}
                style={cardSurfaceStyle}
              >
                <EditIcon />
              </Link>
            ) : null}
          </div>
          <WikiBasicFieldsList
            basic={basic}
            className="mt-6 grid gap-4 sm:grid-cols-2"
            itemClassName="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3"
            itemStyle={cardSurfaceStyle}
            language={language}
          />
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
