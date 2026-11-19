import { ArrowLeftRight } from "lucide-react";
import { useId, useState } from "react";
import { centimetersToFeetAndInches, feetAndInchesToCentimeters } from "@kpool/wiki";
import { wikiBasicFieldClassName } from "../basicFormStyles";
import { useI18n } from "../../../i18n/I18nProvider";

const inputClassName = "min-w-0 w-full min-h-10 bg-transparent px-3 py-2 text-sm font-normal text-text-strong outline-none";

export function WikiHeightInput({ label, value, disabled }: {
  label: string;
  value: number | undefined;
  disabled: boolean;
}) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.heightInput;
  const noteId = useId();
  const [unit, setUnit] = useState("cm");
  const [centimeters, setCentimeters] = useState(value);
  const [imperial, setImperial] = useState({ feet: "", inches: "" });

  const changeImperial = (next: typeof imperial) => {
    setImperial(next);
    setCentimeters(next.feet === "" && next.inches === ""
      ? undefined
      : feetAndInchesToCentimeters(Number(next.feet), Number(next.inches)));
  };

  return (
    <fieldset className={wikiBasicFieldClassName} disabled={disabled}>
      <legend className="mb-1.5">{label}</legend>
      <input name="height" type="hidden" value={centimeters ?? ""} />
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border border-stroke-subtle bg-surface-raised/60 transition-colors hover:border-brand-primary/30 focus-within:border-brand-primary/60 focus-within:ring-2 focus-within:ring-brand-primary/10">
          {unit === "cm" ? (
            <label className="flex min-w-0 flex-1 items-center">
              <span className="sr-only">{label} (cm)</span>
              <input className={inputClassName} type="number" min="0" step="1"
                value={centimeters ?? ""} onChange={(event) => {
                  setCentimeters(event.currentTarget.value === "" ? undefined : event.currentTarget.valueAsNumber);
                }} />
              <span className="pr-3 text-text-muted" aria-hidden="true">cm</span>
            </label>
          ) : (
            <>
              <label className="flex min-w-0 flex-1 items-center">
                <span className="sr-only">{t.feet} (ft)</span>
                <input className={inputClassName} type="number" min="0" step="1"
                  aria-describedby={noteId} value={imperial.feet}
                  onChange={(event) => changeImperial({ ...imperial, feet: event.currentTarget.value })} />
                <span className="pr-3 text-text-muted" aria-hidden="true">{"'"}</span>
              </label>
              <label className="flex min-w-0 flex-1 items-center border-l border-stroke-subtle">
                <span className="sr-only">{t.inches} (in)</span>
                <input className={inputClassName} type="number" min="0" max="11.99" step="0.01"
                  aria-describedby={noteId} value={imperial.inches}
                  onChange={(event) => changeImperial({ ...imperial, inches: event.currentTarget.value })} />
                <span className="pr-3 text-text-muted" aria-hidden="true">{'"'}</span>
              </label>
            </>
          )}
        </div>
        <button
          type="button"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-primary/10 text-brand-primary transition-colors hover:bg-brand-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={unit === "cm" ? t.switchToFeet : t.switchToCentimeters}
          title={unit === "cm" ? t.switchToFeet : t.switchToCentimeters}
          onClick={() => {
            if (unit === "cm") {
              const rounded = centimeters === undefined ? undefined : Math.round(centimeters);
              setCentimeters(rounded);
              const converted = rounded === undefined ? undefined : centimetersToFeetAndInches(rounded);
              setImperial({ feet: converted ? String(converted.feet) : "", inches: converted ? String(converted.inches) : "" });
            }
            setUnit(unit === "cm" ? "ft-in" : "cm");
          }}
        >
          <ArrowLeftRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      {unit === "ft-in" ? <p id={noteId} className="sr-only">{t.roundingNote}</p> : null}
    </fieldset>
  );
}
