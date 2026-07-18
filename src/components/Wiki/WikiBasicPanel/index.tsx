"use client";

import { useState } from "react";

import {
  getWikiResourceLabel,
  type WikiBasic,
  type WikiMasterSearchItem,
  type WikiResourceType,
} from "@kpool/wiki";
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

export function WikiBasicPanel({
  basic,
  disabled = false,
  isEditing,
  language = "ja",
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
            genres: getLinesUpdate(formData, "genres", basic.genres),
            groupType: getOptionalStringUpdate(formData, "groupType", basic.groupType),
            height: getOptionalNumberUpdate(formData, "height", basic.height),
            lyricist: getOptionalStringUpdate(formData, "lyricist", basic.lyricist),
            mbti: getOptionalStringUpdate(formData, "mbti", basic.mbti),
            officialColors: getLinesUpdate(
              formData,
              "officialColors",
              basic.officialColors,
            ),
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
          <BasicTextInput
            isAlwaysVisible={isGroup}
            label="Group Type"
            name="groupType"
            value={basic.groupType}
          />
          <BasicTextInput
            isAlwaysVisible={isAgency || isGroup}
            label="Status"
            name="status"
            value={basic.status}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup}
            label="Generation"
            name="generation"
            value={basic.generation}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup}
            label="Debut Date"
            name="debutDate"
            type="date"
            value={basic.debutDate}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup || isTalent}
            label="Fandom Name"
            name="fandomName"
            value={basic.fandomName}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup || isTalent}
            label="Representative Symbol"
            name="representativeSymbol"
            value={basic.representativeSymbol}
          />
          <BasicTextInput isAlwaysVisible={isAgency} label="CEO" name="ceo" value={basic.ceo} />
          <BasicTextInput
            isAlwaysVisible={isAgency}
            label="Official Website"
            name="officialWebsite"
            value={basic.officialWebsite}
          />
          <BasicLinesInput
            isAlwaysVisible={isAgency}
            label="Social Links"
            name="socialLinks"
            values={basic.socialLinks}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Song Type"
            name="songType"
            value={basic.songType}
          />
          <BasicLinesInput
            isAlwaysVisible={isSong}
            label="Genres"
            name="genres"
            values={basic.genres}
          />
          {showsAgencySearch ? (
            <WikiMasterSearchSelect
              language={language}
              label="Agency"
              mode="single"
              onChange={setSelectedAgency}
              resourceType="agency"
              selectedItems={selectedAgency}
            />
          ) : null}
          {showsGroupsSearch ? (
            <WikiMasterSearchSelect
              language={language}
              label="Groups"
              mode="multiple"
              onChange={setSelectedGroups}
              resourceType="group"
              selectedItems={selectedGroups}
            />
          ) : null}
          {showsTalentsSearch ? (
            <WikiMasterSearchSelect
              language={language}
              label="Talents"
              mode="multiple"
              onChange={setSelectedTalents}
              resourceType="talent"
              selectedItems={selectedTalents}
            />
          ) : null}
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Release Date"
            name="releaseDate"
            type="date"
            value={basic.releaseDate}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Album"
            name="albumName"
            value={basic.albumName}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Lyricist"
            name="lyricist"
            value={basic.lyricist}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Composer"
            name="composer"
            value={basic.composer}
          />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Arranger"
            name="arranger"
            value={basic.arranger}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="Real Name"
            name="realName"
            value={basic.realName}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="Birthday"
            name="birthday"
            type="date"
            value={basic.birthday}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="Position"
            name="position"
            value={basic.position}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="MBTI"
            name="mbti"
            value={basic.mbti}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="Zodiac Sign"
            name="zodiacSign"
            value={basic.zodiacSign}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="English Level"
            name="englishLevel"
            value={basic.englishLevel}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="Height"
            name="height"
            type="number"
            value={basic.height}
          />
          <BasicTextInput
            isAlwaysVisible={isTalent}
            label="Blood Type"
            name="bloodType"
            value={basic.bloodType}
          />
          <BasicLinesInput
            isAlwaysVisible={isGroup}
            label="Official Colors"
            name="officialColors"
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
            Basic
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            {profileLabel}
          </p>
        </div>
        <button
          aria-label="Edit basic"
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
      />
    </div>
  );
}
