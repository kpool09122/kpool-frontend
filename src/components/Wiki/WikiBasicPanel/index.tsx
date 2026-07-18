"use client";

import { useState } from "react";

import {
  getWikiResourceLabel,
  type WikiBasic,
  type WikiOfficialColor,
  type WikiMasterSearchItem,
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
import { dictionaries } from "../../../i18n/dictionaries";
import { normalizeLocale } from "../../../i18n/locales";
import { getLines, getString } from "../editing";
import { EditIcon } from "../icons";
import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import { WikiFormActions } from "../WikiFormActions";
import { WikiMasterSearchSelect } from "../WikiMasterSearchSelect";
import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

type WikiBasicPanelProps = {
  basic: WikiBasic;
  disabled?: boolean;
  isEditing: boolean;
  language?: string;
  profileLabel?: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (basic: WikiBasic) => void;
};

const basicInputClassName =
  "min-w-0 break-words rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2 [overflow-wrap:anywhere] [word-break:break-word]";
const basicTextareaClassName =
  "min-h-24 min-w-0 whitespace-pre-wrap break-words rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2 [overflow-wrap:anywhere] [word-break:break-word]";
const basicLabelClassName = "grid min-w-0 gap-2 text-sm font-semibold text-text-strong";

const getOptionalString = (formData: FormData, name: string): string | undefined =>
  getString(formData, name).trim() || undefined;

const getOptionalStringUpdate = (
  formData: FormData,
  name: string,
  currentValue: string | undefined,
): string | undefined =>
  formData.has(name) ? getOptionalString(formData, name) : currentValue;

const getLinesUpdate = (
  formData: FormData,
  name: string,
  currentValue: string[] | undefined,
): string[] | undefined =>
  formData.has(name) ? getLines(formData, name) : currentValue;

const colorCodePattern = /^#[0-9a-fA-F]{6}$/;

const toFormColorCode = (value: string | undefined): string =>
  value && colorCodePattern.test(value) ? value : "#000000";

const getOfficialColorsUpdate = (
  formData: FormData,
  currentValue: WikiOfficialColor[] | undefined,
): WikiOfficialColor[] | undefined => {
  if (!formData.has("officialColorCode") && !formData.has("officialColorLabel")) {
    return currentValue;
  }

  const colorCodes = formData.getAll("officialColorCode");
  const labels = formData.getAll("officialColorLabel");
  const colors = colorCodes.flatMap((colorCodeValue, index): WikiOfficialColor[] => {
    const colorCode = typeof colorCodeValue === "string" ? colorCodeValue.trim() : "";
    const labelValue = labels[index];
    const label = typeof labelValue === "string" ? labelValue.trim().slice(0, 16) : "";

    if (!colorCodePattern.test(colorCode) || !label) {
      return [];
    }

    return [{ colorCode, label }];
  });

  return colors.length > 0 ? colors.slice(0, 2) : undefined;
};

const getOptionalStringListUpdate = (
  formData: FormData,
  name: string,
  currentValue: string[] | undefined,
): string[] | undefined => {
  if (!formData.has(name)) {
    return currentValue;
  }

  const values = formData
    .getAll(name)
    .flatMap((value) => (typeof value === "string" && value.trim() ? [value.trim()] : []));

  return values.length > 0 ? values : undefined;
};

const getOptionalNumberUpdate = (
  formData: FormData,
  name: string,
  currentValue: number | undefined,
): number | undefined => {
  if (!formData.has(name)) {
    return currentValue;
  }

  const value = getString(formData, name).trim();

  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

function BasicTextInput({
  isAlwaysVisible = false,
  label,
  name,
  type = "text",
  value,
}: {
  isAlwaysVisible?: boolean;
  label: string;
  name: string;
  type?: string;
  value: number | string | null | undefined;
}) {
  if (!isAlwaysVisible && (value === undefined || value === "")) {
    return null;
  }

  return (
    <label className={basicLabelClassName}>
      {label}
      <input
        className={basicInputClassName}
        defaultValue={value ?? ""}
        name={name}
        type={type}
      />
    </label>
  );
}

function BasicLinesInput({
  isAlwaysVisible = false,
  label,
  name,
  values,
}: {
  isAlwaysVisible?: boolean;
  label: string;
  name: string;
  values: string[] | undefined;
}) {
  if (!isAlwaysVisible && !values?.length) {
    return null;
  }

  return (
    <label className={`${basicLabelClassName} md:col-span-2`}>
      {label}
      <textarea
        className={basicTextareaClassName}
        defaultValue={(values ?? []).join("\n")}
        name={name}
      />
    </label>
  );
}

function OfficialColorsInput({
  isAlwaysVisible = false,
  label,
  values,
}: {
  isAlwaysVisible?: boolean;
  label: string;
  values: WikiOfficialColor[] | undefined;
}) {
  if (!isAlwaysVisible && !values?.length) {
    return null;
  }

  const colorSlots = [0, 1].map((index) => values?.[index]);

  return (
    <fieldset className="md:col-span-2 grid min-w-0 gap-3 rounded-2xl border border-stroke-subtle bg-surface-raised p-4">
      <legend className="px-1 text-sm font-semibold text-text-strong">{label}</legend>
      <p className="text-sm font-semibold text-text-strong">{label}</p>
      <span className="text-xs text-text-muted">最大2色まで、カラーコードと16文字以内のラベルを設定できます。</span>
      <div className="grid gap-3 md:grid-cols-2">
        {colorSlots.map((color, index) => (
          <div className="grid min-w-0 gap-2 rounded-xl border border-stroke-subtle p-3" key={index}>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
              Color {index + 1}
            </span>
            <label className="grid gap-1 text-xs font-semibold text-text-strong">
              {`${label} color ${index + 1}`}
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-9 w-9 rounded-full border border-stroke-subtle"
                  style={{ backgroundColor: toFormColorCode(color?.colorCode) }}
                />
                <input
                  aria-label={`${label} color ${index + 1}`}
                  className={`${basicInputClassName} h-10 flex-1 p-1`}
                  defaultValue={toFormColorCode(color?.colorCode)}
                  name="officialColorCode"
                  pattern="^#[0-9a-fA-F]{6}$"
                  type="color"
                />
              </div>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-text-strong">
              {`${label} label ${index + 1}`}
              <input
                aria-label={`${label} label ${index + 1}`}
                className={basicInputClassName}
                defaultValue={color?.label ?? ""}
                maxLength={16}
                name="officialColorLabel"
                placeholder="例: Solar Gold"
                type="text"
              />
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

type BasicSelectOption = {
  label: string;
  value: string;
};

function BasicSelectInput({
  emptyLabel,
  isAlwaysVisible = false,
  label,
  name,
  options,
  value,
}: {
  emptyLabel: string;
  isAlwaysVisible?: boolean;
  label: string;
  name: string;
  options: BasicSelectOption[];
  value: string | null | undefined;
}) {
  if (!isAlwaysVisible && (value === undefined || value === "")) {
    return null;
  }

  return (
    <label className={basicLabelClassName}>
      {label}
      <select className={basicInputClassName} defaultValue={value ?? ""} name={name}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BasicMultiSelectInput({
  isAlwaysVisible = false,
  label,
  name,
  options,
  values,
}: {
  isAlwaysVisible?: boolean;
  label: string;
  name: string;
  options: BasicSelectOption[];
  values: string[] | undefined;
}) {
  if (!isAlwaysVisible && !values?.length) {
    return null;
  }

  return (
    <div className="md:col-span-2">
      <input name={name} type="hidden" value="" />
      <label className={basicLabelClassName}>
        {label}
        <select
          className={basicInputClassName}
          defaultValue={values ?? []}
          multiple
          name={name}
          size={Math.min(6, options.length)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const toSelectOptions = <T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): BasicSelectOption[] => values.map((value) => ({ value, label: labels[value] ?? value }));

export function WikiBasicPanel({
  basic,
  disabled = false,
  isEditing,
  language = "en",
  profileLabel = `${getWikiResourceLabel(basic.resourceType as WikiResourceType)} profile`,
  onEdit,
  onCancel,
  onSave,
}: WikiBasicPanelProps) {
  const resourceType = basic.resourceType as WikiResourceType;
  const isAgency = resourceType === "agency";
  const isGroup = resourceType === "group";
  const isSong = resourceType === "song";
  const isTalent = resourceType === "talent";
  const dictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const enumLabels = dictionary.wiki.enumLabels;
  const heroT = dictionary.wiki.heroCard;
  const fieldLabels = dictionary.wiki.basicFieldLabels;
  const resolvedProfileLabel = profileLabel === "Basic profile" ? heroT.basicProfile : profileLabel;
  const groupTypeOptions = toSelectOptions(wikiGroupTypes, enumLabels.groupType);
  const statusOptions = isAgency
    ? toSelectOptions(wikiAgencyStatuses, enumLabels.agencyStatus)
    : isGroup
      ? toSelectOptions(wikiGroupStatuses, enumLabels.groupStatus)
      : null;
  const generationOptions = toSelectOptions(wikiGenerations, enumLabels.generation);
  const songTypeOptions = toSelectOptions(wikiSongTypes, enumLabels.songType);
  const songGenreOptions = toSelectOptions(wikiSongGenres, enumLabels.songGenre);
  const mbtiOptions = toSelectOptions(wikiMbtiTypes, enumLabels.mbti);
  const zodiacSignOptions = toSelectOptions(wikiZodiacSigns, enumLabels.zodiacSign);
  const englishLevelOptions = toSelectOptions(wikiEnglishLevels, enumLabels.englishLevel);
  const bloodTypeOptions = toSelectOptions(wikiBloodTypes, enumLabels.bloodType);
  const showsAgencySearch = isGroup || isSong || isTalent || Boolean(basic.agency ?? basic.agencyName);
  const showsGroupsSearch = isTalent || isSong || Boolean(basic.groups?.length);
  const showsTalentsSearch = isSong || Boolean(basic.talents?.length);
  const toSearchItem = (relation: { wikiIdentifier: string; name: string; slug?: string; normalizedName?: string }): WikiMasterSearchItem => ({
    id: relation.wikiIdentifier,
    wikiIdentifier: relation.wikiIdentifier,
    name: relation.name,
    slug: relation.slug ?? relation.normalizedName ?? relation.name,
    resourceType: "group",
  });
  const toBasicRelation = (item: WikiMasterSearchItem) => ({
    wikiIdentifier: item.wikiIdentifier,
    slug: item.slug,
    language,
    name: item.name,
  });
  const [selectedAgency, setSelectedAgency] = useState<WikiMasterSearchItem[]>(() =>
    basic.agency
      ? [{ ...toSearchItem(basic.agency), resourceType: "agency" }]
      : basic.agencyName
        ? [
            {
              id: basic.agencyIdentifier ?? "",
              wikiIdentifier: basic.agencyIdentifier ?? "",
              name: basic.agencyName,
              slug: basic.agencyName,
              resourceType: "agency",
            },
          ]
      : [],
  );
  const [selectedGroups, setSelectedGroups] = useState<WikiMasterSearchItem[]>(() =>
    (basic.groups ?? []).map((group) => ({ ...toSearchItem(group), resourceType: "group" })),
  );
  const [selectedTalents, setSelectedTalents] = useState<WikiMasterSearchItem[]>(() =>
    (basic.talents ?? []).map((talent) => ({ ...toSearchItem(talent), resourceType: "talent" })),
  );

  if (isEditing) {
    return (
      <form
        className="rounded-[1.75rem] border border-stroke-subtle p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          onSave({
            ...basic,
            name: basic.name,
            agency: selectedAgency[0]
              ? {
                  wikiIdentifier: selectedAgency[0].wikiIdentifier,
                  slug: selectedAgency[0].slug,
                  language,
                  name: selectedAgency[0].name,
                }
              : null,
            agencyIdentifier: selectedAgency[0]?.wikiIdentifier ?? null,
            groups: selectedGroups.map(toBasicRelation),
            groupIdentifiers: selectedGroups.map((group) => group.wikiIdentifier),
            talents: selectedTalents.map(toBasicRelation),
            talentIdentifiers: selectedTalents.map((talent) => talent.wikiIdentifier),
            agencyName: selectedAgency[0]?.name ?? null,
            albumName: getOptionalStringUpdate(formData, "albumName", basic.albumName),
            arranger: getOptionalStringUpdate(formData, "arranger", basic.arranger),
            birthday: getOptionalStringUpdate(formData, "birthday", basic.birthday),
            bloodType: getOptionalStringUpdate(formData, "bloodType", basic.bloodType),
            ceo: getOptionalStringUpdate(formData, "ceo", basic.ceo),
            composer: getOptionalStringUpdate(formData, "composer", basic.composer),
            debutDate: getOptionalStringUpdate(formData, "debutDate", basic.debutDate),
            englishLevel: getOptionalStringUpdate(formData, "englishLevel", basic.englishLevel),
            fandomName: getOptionalStringUpdate(formData, "fandomName", basic.fandomName),
            generation: getOptionalStringUpdate(formData, "generation", basic.generation),
            genres: getOptionalStringListUpdate(formData, "genres", basic.genres),
            groupType: getOptionalStringUpdate(formData, "groupType", basic.groupType),
            height: getOptionalNumberUpdate(formData, "height", basic.height),
            lyricist: getOptionalStringUpdate(formData, "lyricist", basic.lyricist),
            mbti: getOptionalStringUpdate(formData, "mbti", basic.mbti),
            officialColors: getOfficialColorsUpdate(formData, basic.officialColors),
            officialWebsite: getOptionalStringUpdate(
              formData,
              "officialWebsite",
              basic.officialWebsite,
            ),
            position: getOptionalStringUpdate(formData, "position", basic.position),
            realName: getOptionalStringUpdate(formData, "realName", basic.realName),
            releaseDate: getOptionalStringUpdate(formData, "releaseDate", basic.releaseDate),
            representativeSymbol: getOptionalStringUpdate(
              formData,
              "representativeSymbol",
              basic.representativeSymbol,
            ),
            socialLinks: getLinesUpdate(formData, "socialLinks", basic.socialLinks),
            songType: getOptionalStringUpdate(formData, "songType", basic.songType),
            status: getOptionalStringUpdate(formData, "status", basic.status),
            zodiacSign: getOptionalStringUpdate(formData, "zodiacSign", basic.zodiacSign),
          });
        }}
        style={cardSurfaceMutedStyle}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
          Basic
        </p>
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isGroup}
            label={fieldLabels.groupType}
            name="groupType"
            options={groupTypeOptions}
            value={basic.groupType}
          />
          {statusOptions ? (
            <BasicSelectInput
              emptyLabel={enumLabels.empty}
              isAlwaysVisible={isAgency || isGroup}
              label={fieldLabels.status}
              name="status"
              options={statusOptions}
              value={basic.status}
            />
          ) : (
            <BasicTextInput label={fieldLabels.status} name="status" value={basic.status} />
          )}
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isGroup}
            label={fieldLabels.generation}
            name="generation"
            options={generationOptions}
            value={basic.generation}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup}
            label={fieldLabels.debutDate}
            name="debutDate"
            type="date"
            value={basic.debutDate}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup || isTalent}
            label={fieldLabels.fandomName}
            name="fandomName"
            value={basic.fandomName}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup || isTalent}
            label={fieldLabels.representativeSymbol}
            name="representativeSymbol"
            value={basic.representativeSymbol}
          />
          <BasicTextInput isAlwaysVisible={isAgency} label={fieldLabels.ceo} name="ceo" value={basic.ceo} />
          <BasicTextInput
            isAlwaysVisible={isAgency}
            label={fieldLabels.officialWebsite}
            name="officialWebsite"
            value={basic.officialWebsite}
          />
          <BasicLinesInput
            isAlwaysVisible={isAgency}
            label={fieldLabels.socialLinks}
            name="socialLinks"
            values={basic.socialLinks}
          />
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isSong}
            label={fieldLabels.songType}
            name="songType"
            options={songTypeOptions}
            value={basic.songType}
          />
          <BasicMultiSelectInput
            isAlwaysVisible={isSong}
            label={fieldLabels.genres}
            name="genres"
            options={songGenreOptions}
            values={basic.genres}
          />
          {showsAgencySearch ? (
            <WikiMasterSearchSelect
              language={language}
              label={fieldLabels.agency}
              mode="single"
              onChange={setSelectedAgency}
              resourceType="agency"
              selectedItems={selectedAgency}
            />
          ) : null}
          {showsGroupsSearch ? (
            <WikiMasterSearchSelect
              language={language}
              label={fieldLabels.groups}
              mode="multiple"
              onChange={setSelectedGroups}
              resourceType="group"
              selectedItems={selectedGroups}
            />
          ) : null}
          {showsTalentsSearch ? (
            <WikiMasterSearchSelect
              language={language}
              label={fieldLabels.talents}
              mode="multiple"
              onChange={setSelectedTalents}
              resourceType="talent"
              selectedItems={selectedTalents}
            />
          ) : null}
          <BasicTextInput
            isAlwaysVisible={isSong}
            label={fieldLabels.releaseDate}
            name="releaseDate"
            type="date"
            value={basic.releaseDate}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label={fieldLabels.album}
            name="albumName"
            value={basic.albumName}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label={fieldLabels.lyricist}
            name="lyricist"
            value={basic.lyricist}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label={fieldLabels.composer}
            name="composer"
            value={basic.composer}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label={fieldLabels.arranger}
            name="arranger"
            value={basic.arranger}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label={fieldLabels.realName}
            name="realName"
            value={basic.realName}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label={fieldLabels.birthday}
            name="birthday"
            type="date"
            value={basic.birthday}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label={fieldLabels.position}
            name="position"
            value={basic.position}
          />
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isTalent}
            label={fieldLabels.mbti}
            name="mbti"
            options={mbtiOptions}
            value={basic.mbti}
          />
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isTalent}
            label={fieldLabels.zodiacSign}
            name="zodiacSign"
            options={zodiacSignOptions}
            value={basic.zodiacSign}
          />
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isTalent}
            label={fieldLabels.englishLevel}
            name="englishLevel"
            options={englishLevelOptions}
            value={basic.englishLevel}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label={fieldLabels.height}
            name="height"
            type="number"
            value={basic.height}
          />
          <BasicSelectInput
            emptyLabel={enumLabels.empty}
            isAlwaysVisible={isTalent}
            label={fieldLabels.bloodType}
            name="bloodType"
            options={bloodTypeOptions}
            value={basic.bloodType}
          />
          <OfficialColorsInput
            isAlwaysVisible={isGroup}
            label={fieldLabels.officialColors}
            values={basic.officialColors}
          />
        </div>
        <WikiFormActions onCancel={onCancel} />
      </form>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-stroke-subtle p-6" style={cardSurfaceMutedStyle}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
            {heroT.basic}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {resolvedProfileLabel}
          </p>
        </div>
        <button
          aria-label={heroT.editBasic}
          className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30 disabled:cursor-not-allowed disabled:text-text-muted"
          disabled={disabled}
          onClick={onEdit}
          style={cardSurfaceStyle}
          type="button"
        >
          <EditIcon />
        </button>
      </div>
      <WikiBasicFieldsList
        basic={basic}
        className="mt-6 grid gap-4 md:grid-cols-2"
        itemClassName="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3"
        itemStyle={cardSurfaceStyle}
        language={language}
      />
    </div>
  );
}
