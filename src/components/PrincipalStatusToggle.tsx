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
export function PrincipalStatusToggle({
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
  const active = value === "active";
  const locked = disabled || value === "forced_stop";
  return (
    <button
      type="button"
      role="switch"
      aria-label={t.label}
      aria-checked={active}
      aria-describedby={value === "forced_stop" ? `${id}-reason` : undefined}
      disabled={locked}
      onClick={() => {
        if (!locked) onChange(active ? "suspended" : "active");
      }}
      className="inline-flex min-h-10 items-center gap-2 rounded text-sm font-semibold text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${active ? "bg-brand-primary" : "bg-stroke-subtle"}`}>
        <span className={`absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-4" : "translate-x-0"}`} />
      </span>
      <span aria-hidden="true" className="min-w-[3em] text-left">{t[value]}</span>
      {value === "forced_stop" ? <span id={`${id}-reason`} className="sr-only">{t.forcedReason}</span> : null}
    </button>
  );
}
