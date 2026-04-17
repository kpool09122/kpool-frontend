"use client";

import { type WikiBasic, type WikiDetail } from "@kpool/wiki";

import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import { WikiBasicPanel } from "../WikiBasicPanel";
import { WikiHeroPanel } from "../WikiHeroPanel";
import { EditIcon } from "../icons";
import { cardSurfaceStyle } from "../styles";

type WikiHeroBasicFlipCardProps = {
  heroImage: WikiDetail["heroImage"];
  basic: WikiBasic;
  isFlipped: boolean;
  flipCardId: string;
  isHeroEditing: boolean;
  isBasicEditing: boolean;
  onFlipChange: (isFlipped: boolean) => void;
  onEditHero: () => void;
  onEditBasic: () => void;
  onCancel: () => void;
  onSaveHero: (heroImage: WikiDetail["heroImage"]) => void;
  onSaveBasic: (basic: WikiBasic) => void;
};

export function WikiHeroBasicFlipCard({
  heroImage,
  basic,
  isFlipped,
  flipCardId,
  isHeroEditing,
  isBasicEditing,
  onFlipChange,
  onEditHero,
  onEditBasic,
  onCancel,
  onSaveHero,
  onSaveBasic,
}: WikiHeroBasicFlipCardProps) {
  return (
    <div className="grid gap-4 lg:hidden">
      <input
        checked={isFlipped}
        className="sr-only"
        data-testid="wiki-edit-flip-input"
        id={flipCardId}
        onChange={(event) => onFlipChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <div
        aria-label="Flip wiki edit card"
        className="block"
        data-testid="wiki-edit-flip-trigger"
        role="group"
      >
        <div className="relative h-[34rem] [perspective:1400px]">
          <div
            className={`relative h-full rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] ${
              isFlipped ? "[transform:rotateY(180deg)]" : ""
            }`}
            data-testid="wiki-edit-flip-card"
          >
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] [backface-visibility:hidden]">
              <WikiHeroPanel
                heroImage={heroImage}
                isEditing={isHeroEditing}
                onCancel={onCancel}
                onEdit={onEditHero}
                onSave={onSaveHero}
              />
            </div>
            {!isHeroEditing ? (
              <label
                aria-label="Flip wiki edit card to basic details"
                className={`absolute inset-0 z-20 rounded-[1.75rem] ${
                  isFlipped ? "pointer-events-none" : "cursor-pointer"
                }`}
                data-testid="wiki-edit-flip-front-toggle"
                htmlFor={flipCardId}
              />
            ) : null}

            <div
              className={`absolute inset-0 z-20 flex h-full flex-col overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                isFlipped ? "pointer-events-auto" : "pointer-events-none"
              }`}
              onClick={() => {
                if (!isBasicEditing) {
                  onFlipChange(false);
                }
              }}
              style={cardSurfaceStyle}
            >
              {isBasicEditing ? (
                <div
                  className="min-h-0 flex-1 overflow-y-auto pr-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <WikiBasicPanel
                    basic={basic}
                    isEditing={isBasicEditing}
                    onCancel={onCancel}
                    onEdit={onEditBasic}
                    onSave={onSaveBasic}
                  />
                </div>
              ) : (
                <>
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
                      className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditBasic();
                      }}
                      style={cardSurfaceStyle}
                      type="button"
                    >
                      <EditIcon />
                    </button>
                  </div>
                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                    <WikiBasicFieldsList
                      basic={basic}
                      className="grid gap-4"
                      itemClassName="rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-3"
                      itemStyle={cardSurfaceStyle}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-text-muted">
        <span className={isFlipped ? "hidden" : ""}>
          Tap the card to flip to the basic details.
        </span>
        <span className={isFlipped ? "inline" : "hidden"}>
          Tap outside the form area to return to the cover image.
        </span>
      </p>
    </div>
  );
}
