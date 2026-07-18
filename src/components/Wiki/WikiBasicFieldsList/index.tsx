import Link from "next/link";
import {
  getWikiBasicFields,
  type WikiBasic,
  type WikiOfficialColor,
  type WikiResourceType,
  wikiAgencyStatuses,
  wikiBloodTypes,
  wikiEnglishLevels,
  wikiGenerations,
  wikiGroupStatuses,
  wikiGroupTypes,
  wikiMbtiTypes,
  wikiSongGenres,
  wikiSongTypes,
  wikiZodiacSigns,
} from "@kpool/wiki";
import { type CSSProperties } from "react";

import { dictionaries } from "../../../i18n/dictionaries";
import { normalizeLocale } from "../../../i18n/locales";

type WikiBasicFieldsListProps = {
  basic: WikiBasic;
  className: string;
  itemClassName: string;
  itemStyle: CSSProperties;
  language?: string;
};

type EnumLabelMap = Record<string, string>;
type BasicFieldLabelKey = keyof (typeof dictionaries)["ja"]["wiki"]["basicFieldLabels"];

const colorCodePattern = /^#[0-9a-fA-F]{6}$/;

const getColorSwatchStyle = (color: WikiOfficialColor): CSSProperties =>
  colorCodePattern.test(color.colorCode) ? { backgroundColor: color.colorCode } : {};

const basicFieldLabelKeys: Record<string, BasicFieldLabelKey> = {
  "Group Type": "groupType",
  Status: "status",
  Generation: "generation",
  "Debut Date": "debutDate",
  "Fandom Name": "fandomName",
  "Representative Symbol": "representativeSymbol",
  CEO: "ceo",
  "Official Website": "officialWebsite",
  "Social Links": "socialLinks",
  "Song Type": "songType",
  Genres: "genres",
  Agency: "agency",
  Groups: "groups",
  Talents: "talents",
  "Release Date": "releaseDate",
  Album: "album",
  Lyricist: "lyricist",
  Composer: "composer",
  Arranger: "arranger",
  "Real Name": "realName",
  Birthday: "birthday",
  Position: "position",
  MBTI: "mbti",
  "Zodiac Sign": "zodiacSign",
  "English Level": "englishLevel",
  Height: "height",
  "Blood Type": "bloodType",
  "Official Colors": "officialColors",
};

const createEnumValueFormatter = (basic: WikiBasic, language = "en") => {
  const dictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const enumLabels = dictionary.wiki.enumLabels;
  const resourceType = basic.resourceType as WikiResourceType;
  const labelMaps: Record<string, EnumLabelMap | undefined> = {
    "Blood Type": enumLabels.bloodType,
    "English Level": enumLabels.englishLevel,
    Generation: enumLabels.generation,
    "Group Type": enumLabels.groupType,
    MBTI: enumLabels.mbti,
    Genres: enumLabels.songGenre,
    "Song Type": enumLabels.songType,
    Status:
      resourceType === "agency"
        ? enumLabels.agencyStatus
        : resourceType === "group"
          ? enumLabels.groupStatus
          : undefined,
    "Zodiac Sign": enumLabels.zodiacSign,
  };
  const knownRawValues: Record<string, readonly string[] | undefined> = {
    "Blood Type": wikiBloodTypes,
    "English Level": wikiEnglishLevels,
    Generation: wikiGenerations,
    "Group Type": wikiGroupTypes,
    MBTI: wikiMbtiTypes,
    Genres: wikiSongGenres,
    "Song Type": wikiSongTypes,
    Status:
      resourceType === "agency"
        ? wikiAgencyStatuses
        : resourceType === "group"
          ? wikiGroupStatuses
          : undefined,
    "Zodiac Sign": wikiZodiacSigns,
  };

  return (fieldLabel: string, value: string) => {
    const labels = labelMaps[fieldLabel];
    const rawValues = knownRawValues[fieldLabel];

    if (!labels || !rawValues) {
      return value;
    }

    return value
      .split(",")
      .map((part) => part.trim())
      .map((rawValue) => (rawValues.includes(rawValue) ? labels[rawValue] ?? rawValue : rawValue))
      .join(", ");
  };
};

const basicFieldTextWrapClassName =
  "min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]";

export function WikiBasicFieldsList({
  basic,
  className,
  itemClassName,
  itemStyle,
  language = "en",
}: WikiBasicFieldsListProps) {
  const fields = getWikiBasicFields(basic);
  const dictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const fieldLabels = dictionary.wiki.basicFieldLabels;
  const formatEnumValue = createEnumValueFormatter(basic, language);
  const formatFieldLabel = (label: string) => {
    const labelKey = basicFieldLabelKeys[label];

    return labelKey ? fieldLabels[labelKey] : label;
  };

  return (
    <dl className={className}>
      {fields.map((field) => (
        <div className={`${basicFieldTextWrapClassName} ${itemClassName}`} key={field.label} style={itemStyle}>
          <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            {formatFieldLabel(field.label)}
          </dt>
          <dd className={`${basicFieldTextWrapClassName} mt-1 text-sm leading-6 text-text-strong`}>
            {field.colors ? (
              <span className="flex flex-wrap gap-2">
                {field.colors.map((color, index) => (
                  <span
                    className="inline-flex min-w-0 items-center gap-2 rounded-full border border-stroke-subtle bg-surface-base px-2.5 py-1"
                    key={`${color.colorCode}-${color.label}-${index}`}
                  >
                    <span
                      aria-label={`${color.label} color swatch`}
                      className="h-4 w-4 shrink-0 rounded-full border border-stroke-subtle"
                      role="img"
                      style={getColorSwatchStyle(color)}
                    />
                    <span className={basicFieldTextWrapClassName}>{color.label}</span>
                  </span>
                ))}
              </span>
            ) : field.links ? (
              <span className={`${basicFieldTextWrapClassName} flex flex-wrap gap-x-2 gap-y-1`}>
                {field.links.map((link, index) => (
                  <span className={basicFieldTextWrapClassName} key={`${link.href}-${index}`}>
                    {index > 0 ? <span className="mr-2 text-text-muted">,</span> : null}
                    <Link
                      className={`${basicFieldTextWrapClassName} font-semibold text-brand-primary underline-offset-4 hover:underline`}
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </span>
                ))}
              </span>
            ) : (
              <span className={basicFieldTextWrapClassName}>{formatEnumValue(field.label, field.value)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
