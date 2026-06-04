"use client";

import Link from "next/link";

import {
  buildWikiPath,
  getWikiResourceLabel,
  type WikiBasic,
  type WikiResourceType,
} from "@kpool/wiki";
import { getLines, getString } from "../editing";
import { EditIcon } from "../icons";
import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import { WikiFormActions } from "../WikiFormActions";
import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

type WikiBasicPanelProps = {
  basic: WikiBasic;
  disabled?: boolean;
  isEditing: boolean;
  profileLabel?: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (basic: WikiBasic) => void;
};

const basicInputClassName =
  "rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2";
const basicTextareaClassName =
  "min-h-24 rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2";
const basicLabelClassName = "grid gap-2 text-sm font-semibold text-text-strong";

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

const getAgencyNameUpdate = (
  formData: FormData,
  currentValue: string | null | undefined,
): string | null | undefined =>
  formData.has("agencyName") ? getString(formData, "agencyName") || null : currentValue;

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

function BasicRelationLinks({
  label,
  relations,
}: {
  label: string;
  relations: WikiBasic["groups"] | WikiBasic["talents"];
}) {
  if (!relations?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2">
      <p className="text-sm font-semibold text-text-strong">{label}</p>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-sm leading-6">
        {relations.map((relation, index) => (
          <span key={`${relation.wikiIdentifier}-${index}`}>
            {index > 0 ? <span className="mr-2 text-text-muted">,</span> : null}
            {relation.slug && relation.language ? (
              <Link
                className="font-semibold text-brand-primary underline-offset-4 hover:underline"
                href={buildWikiPath(relation.language, relation.slug)}
              >
                {relation.name}
              </Link>
            ) : (
              <span className="text-text-strong">{relation.name}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WikiBasicPanel({
  basic,
  disabled = false,
  isEditing,
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
            agencyName: getAgencyNameUpdate(formData, basic.agencyName),
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
        <div className="mt-5 grid gap-4 md:grid-cols-2">
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
          <BasicRelationLinks label="Groups" relations={basic.groups} />
          <BasicTextInput
            isAlwaysVisible={isSong}
            label="Release Date"
            name="releaseDate"
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
          <BasicRelationLinks label="Talents" relations={basic.talents} />
          <BasicLinesInput
            isAlwaysVisible={isGroup}
            label="Official Colors"
            name="officialColors"
            values={basic.officialColors}
          />
          <BasicTextInput
            isAlwaysVisible={isGroup || isSong || isTalent}
            label="Agency"
            name="agencyName"
            value={basic.agencyName}
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
