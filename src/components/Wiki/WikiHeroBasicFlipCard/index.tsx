"use client";

import { type WikiBasic, type WikiDetail } from "@kpool/wiki";

import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import { WikiBasicPanel } from "../WikiBasicPanel";
import { WikiHeroPanel } from "../WikiHeroPanel";
import { EditIcon } from "../icons";
import { cardSurfaceStyle } from "../styles";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiHeroBasicFlipCardProps = {
  heroImage: WikiDetail["heroImage"];
  basic: WikiBasic;
  disabled?: boolean;
  isFlipped: boolean;
  flipCardId: string;
  isBasicEditing: boolean;
  language?: string;
  profileLabel?: string;
  onFlipChange: (isFlipped: boolean) => void;
  onOpenImageLibrary?: () => void;
  onEditBasic: () => void;
  onCancel: () => void;
  onSaveBasic: (basic: WikiBasic) => void;
};

export function WikiHeroBasicFlipCard({
  heroImage,
  basic,
  disabled = false,
  isFlipped,
  flipCardId,
  isBasicEditing,
  language = "ja",
  profileLabel,
  onFlipChange,
  onOpenImageLibrary,
  onEditBasic,
  onCancel,
  onSaveBasic,
}: WikiHeroBasicFlipCardProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.heroCard;
  const resolvedProfileLabel = profileLabel ?? t.basicProfile;

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
        aria-label={t.flipEditCard}
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
                onOpenImageLibrary={disabled ? undefined : onOpenImageLibrary}
              />
            </div>
            <label
              aria-label={t.flipEditCardToBasic}
              className={`absolute bottom-0 left-0 right-0 z-20 h-24 rounded-b-[1.75rem] ${
                isFlipped ? "pointer-events-none" : "cursor-pointer"
              }`}
              data-testid="wiki-edit-flip-front-toggle"
              htmlFor={flipCardId}
            />

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
                    disabled={disabled}
                    isEditing={isBasicEditing}
                    language={language}
                    onCancel={onCancel}
                    onEdit={onEditBasic}
                    profileLabel={resolvedProfileLabel}
                    onSave={onSaveBasic}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                        {t.basic}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                        {resolvedProfileLabel}
                      </p>
                    </div>
                    <button
                      aria-label={t.editBasic}
                      className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:text-text-muted"
                      disabled={disabled}
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
                      language={language}
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
          {t.editCoverHint}
        </span>
        <span className={isFlipped ? "inline" : "hidden"}>
          {t.editBasicHint}
        </span>
      </p>
    </div>
  );
}
