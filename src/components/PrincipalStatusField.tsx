"use client";
import { useId } from "react";
import type { PrincipalStatus } from "@/gateways/identity/principalStatus";

type Labels = {
  label: string;
  active: string;
  suspended: string;
  forced_stop: string;
  forcedReason: string;
};
export function PrincipalStatusField({
  value,
  disabled,
  onChange,
  t,
}: {
  value: PrincipalStatus;
  disabled: boolean;
  onChange: (status: "active" | "suspended") => void;
  t: Labels;
}) {
  const id = useId();
  return (
    <div className="mt-4 grid gap-2 text-sm">
      <label htmlFor={id}>{t.label}</label>
      <select
        id={id}
        aria-describedby={value === "forced_stop" ? `${id}-reason` : undefined}
        className="rounded-lg border border-stroke-subtle bg-surface-base p-2 disabled:opacity-60"
        value={value}
        disabled={disabled || value === "forced_stop"}
        onChange={(event) => {
          if (
            event.target.value === "active" ||
            event.target.value === "suspended"
          )
            onChange(event.target.value);
        }}
      >
        <option value="active">{t.active}</option>
        <option value="suspended">{t.suspended}</option>
        {value === "forced_stop" ? (
          <option value="forced_stop">{t.forced_stop}</option>
        ) : null}
      </select>
      {value === "forced_stop" ? (
        <p id={`${id}-reason`} className="text-text-muted">
          {t.forcedReason}
        </p>
      ) : null}
    </div>
  );
}
