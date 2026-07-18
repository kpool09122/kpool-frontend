import Link from "next/link";
import {
  getWikiBasicFields,
  type WikiBasic,
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

const createEnumValueFormatter = (basic: WikiBasic, language = "ja") => {
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
  language,
}: WikiBasicFieldsListProps) {
  const fields = getWikiBasicFields(basic);
  const formatEnumValue = createEnumValueFormatter(basic, language);

  return (
    <dl className={className}>
      {fields.map((field) => (
        <div className={`${basicFieldTextWrapClassName} ${itemClassName}`} key={field.label} style={itemStyle}>
          <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            {field.label}
          </dt>
          <dd className={`${basicFieldTextWrapClassName} mt-1 text-sm leading-6 text-text-strong`}>
            {field.links ? (
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
