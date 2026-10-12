"use client";

import { useId } from "react";

type PrincipalGroupMembershipOptionProps = {
  name: string;
  description?: string | null;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
};

export function PrincipalGroupMembershipOption({ name, description, checked, disabled, onChange }: PrincipalGroupMembershipOptionProps) {
  const id = useId();
  const nameId = `${id}-name`;
  const descriptionId = `${id}-description`;

  return (
    <label className="flex items-start gap-3 rounded-lg border border-stroke-subtle bg-surface-base p-3 text-sm">
      <input
        aria-labelledby={nameId}
        aria-describedby={description ? descriptionId : undefined}
        checked={checked}
        className="mt-0.5 size-4 shrink-0"
        disabled={disabled}
        onChange={onChange}
        type="checkbox"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-text-strong" id={nameId}>{name}</span>
        {description ? <span className="mt-1 block whitespace-pre-wrap break-words text-sm font-normal leading-6 text-text-muted" id={descriptionId}>{description}</span> : null}
      </span>
    </label>
  );
}
