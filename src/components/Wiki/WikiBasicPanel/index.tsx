"use client";

import { type WikiBasic } from "@kpool/wiki";

import { getLines, getString } from "../editing";
import { EditIcon } from "../icons";
import { WikiBasicFieldsList } from "../WikiBasicFieldsList";
import { WikiFormActions } from "../WikiFormActions";
import { cardSurfaceMutedStyle, cardSurfaceStyle } from "../styles";

type WikiBasicPanelProps = {
  basic: WikiBasic;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (basic: WikiBasic) => void;
};

export function WikiBasicPanel({
  basic,
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: WikiBasicPanelProps) {
  if (isEditing) {
    return (
      <form
        className="rounded-[1.75rem] border border-stroke-subtle p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          onSave({
            ...basic,
            name: getString(formData, "name"),
            groupType: getString(formData, "groupType"),
            status: getString(formData, "status"),
            generation: getString(formData, "generation"),
            debutDate: getString(formData, "debutDate"),
            fandomName: getString(formData, "fandomName"),
            representativeSymbol: getString(formData, "representativeSymbol"),
            officialColors: getLines(formData, "officialColors"),
            agencyName: getString(formData, "agencyName") || null,
          });
        }}
        style={cardSurfaceMutedStyle}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
          Basic
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Name
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.name} name="name" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Group Type
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.groupType} name="groupType" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Status
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.status} name="status" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Generation
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.generation} name="generation" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Debut Date
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.debutDate} name="debutDate" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Fandom Name
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.fandomName} name="fandomName" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Representative Symbol
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.representativeSymbol} name="representativeSymbol" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong">
            Agency
            <input className="rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.agencyName ?? ""} name="agencyName" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-text-strong md:col-span-2">
            Official Colors
            <textarea className="min-h-24 rounded-xl border border-stroke-subtle bg-surface-raised px-3 py-2" defaultValue={basic.officialColors.join("\n")} name="officialColors" />
          </label>
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
            Group profile
          </p>
        </div>
        <button
          aria-label="Edit basic"
          className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
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
