"use client";

import { ReloadIcon } from "@radix-ui/react-icons";
import { type Ref } from "react";
import { type WikiBasic, type WikiDetail } from "@kpool/wiki";

import { WikiProfileCardDetails } from "../WikiProfileCardDetails";
import { WikiBasicPanel } from "../WikiBasicPanel";
import { WikiImageSourceLink } from "../WikiImageSourceLink";
import { WikiHeroPanel } from "../WikiHeroPanel";
import { EditIcon } from "../icons";
import { cardSurfaceStyle } from "../styles";
import { dictionaries } from "../../../i18n/dictionaries";
import { normalizeLocale } from "../../../i18n/locales";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiHeroBasicFlipCardProps = {
  heroImage: WikiDetail["heroImage"];
  basic: WikiBasic;
  searchContextRef?: Ref<{ getBasic: () => WikiBasic }>;
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
  searchContextRef,
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
  const contentDictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const t = dictionary.wiki.heroCard;
  const resolvedProfileLabel = profileLabel ?? contentDictionary.wiki.heroCard.basicProfile;

  return (
    <div className="grid gap-4">
      <input
        checked={isFlipped}
        className="sr-only"
        data-testid="wiki-edit-flip-input"
        id={flipCardId}
        onChange={(event) => {
          if (!isBasicEditing) onFlipChange(event.currentTarget.checked);
        }}
        type="checkbox"
      />
      <div
        aria-label={t.flipEditCard}
        className="block"
        data-testid="wiki-edit-flip-trigger"
        role="group"
      >
        <div className={`mx-auto max-w-[min(100%,48rem)] [perspective:1400px] ${heroImage.isPlaceholder ? "w-full" : "w-fit"}`}>
          <div
            className={`relative rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] ${
              isFlipped ? "[transform:rotateY(180deg)]" : ""
            }`}
            data-testid="wiki-edit-flip-card"
          >
            <div className="relative [backface-visibility:hidden]" inert={isFlipped}>
              <WikiHeroPanel
                heroImage={heroImage}
                onOpenImageLibrary={disabled ? undefined : onOpenImageLibrary}
              />
              <label
                aria-label={t.flipEditCardToBasic}
                className={`absolute inset-x-0 bottom-0 z-20 h-[min(35%,6rem)] rounded-b-[1.75rem] ${
                  isFlipped ? "pointer-events-none" : "cursor-pointer"
                }`}
                data-testid="wiki-edit-flip-front-toggle"
                htmlFor={flipCardId}
              />
            </div>

            <div
              className={`absolute inset-0 z-20 overflow-y-auto rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                isFlipped ? "pointer-events-auto" : "pointer-events-none"
              }`}
              inert={!isFlipped}
              onClick={() => {
                if (!isBasicEditing) {
                  onFlipChange(false);
                }
              }}
              style={cardSurfaceStyle}
            >
              {isBasicEditing ? (
                <div
                  className="pr-1"
                  onClick={(event) => event.stopPropagation()}
                >
                  <WikiBasicPanel
                    searchContextRef={searchContextRef}
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
                <WikiProfileCardDetails
                  basic={basic}
                  language={language}
                  title={resolvedProfileLabel}
                  action={
                    <button
                      aria-label={t.editBasic}
                      className="rounded-full p-2 text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:text-text-muted"
                      disabled={disabled}
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditBasic();
                      }}
                      type="button"
                    >
                      <EditIcon />
                    </button>
                  }
                />
              )}
              {!isBasicEditing && heroImage.sourceUrl && !heroImage.isHidden ? (
                <div className="pt-4" onClick={(event) => event.stopPropagation()}>
                  <WikiImageSourceLink className="text-start" image={heroImage} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-xs text-text-muted transition hover:bg-brand-highlight/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-60"
          disabled={isBasicEditing}
          onClick={() => onFlipChange(!isFlipped)}
          type="button"
        >
          <ReloadIcon aria-hidden="true" />
          {isFlipped ? t.publicShowPhoto : t.publicShowBasic}
        </button>
      </div>
    </div>
  );
}
