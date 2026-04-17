"use client";

import Image from "next/image";
import { useState } from "react";
import { type WikiBasic, type WikiDetail } from "@kpool/wiki";

import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import {
  cardSurfaceMutedStyle,
  cardSurfaceStyle,
  heroOverlayStyle,
  transparentFrameStyle,
} from "../styles";
import { EditIcon } from "../icons";

type WikiPublicHeroBasicSectionProps = {
  basic: WikiBasic;
  heroImage: WikiDetail["heroImage"];
  flipCardId: string;
};

export function WikiPublicHeroBasicSection({
  basic,
  heroImage,
  flipCardId,
}: WikiPublicHeroBasicSectionProps) {
  const [isFlipped, setIsFlipped] = useState(false);

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
            aria-label="Flip wiki card"
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
                    />
                  </div>
                  <div className="absolute inset-0" style={heroOverlayStyle} />
                  <div className="absolute inset-x-0 bottom-0 px-5 py-6 text-white">
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.28em]"
                      style={{ color: "var(--wiki-hero-accent, var(--brand-highlight))" }}
                    >
                      Tap The Card
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                      Flip to reveal the basic profile
                    </p>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-white/78">
                      The card turns like a physical profile card and exposes
                      the group basics on the reverse side.
                    </p>
                  </div>
                </div>
                <label
                  aria-label="Flip wiki card to basic details"
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
                        Basic
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        Group profile
                      </p>
                    </div>
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
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-text-muted">
            <span className={isFlipped ? "hidden" : ""}>
              Tap anywhere on the card to flip to the basic details.
            </span>
            <span className={isFlipped ? "inline" : "hidden"}>
              Tap the card again to return to the cover image.
            </span>
          </p>
        </div>
      </div>

      <div className="hidden gap-6 py-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div
          className="h-full overflow-hidden rounded-[1.75rem] border border-stroke-subtle"
          style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
        >
          <div className="relative h-full min-h-[30rem]">
            <Image
              alt={heroImage.alt}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              src={heroImage.src}
            />
          </div>
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
                Group profile
              </p>
            </div>
            <button
              aria-label="Edit basic"
              type="button"
              className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
              style={cardSurfaceStyle}
            >
              <EditIcon />
            </button>
          </div>
          <WikiBasicFieldsList
            basic={basic}
            className="mt-6 grid gap-4 sm:grid-cols-2"
            itemClassName="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3"
            itemStyle={cardSurfaceStyle}
          />
        </div>
      </div>
    </section>
  );
}
