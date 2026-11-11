"use client";

import { useI18n } from "../../../i18n/I18nProvider";
import { cardSurfaceStyle } from "../styles";

type WikiFormActionsProps = {
  onCancel: () => void;
  disabled?: boolean;
};

export function WikiFormActions({ onCancel, disabled = false }: WikiFormActionsProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki.blockForm;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong"
        style={cardSurfaceStyle}
        disabled={disabled}
        type="submit"
      >
        {t.save}
      </button>
      <button
        className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-muted"
        onClick={onCancel}
        type="button"
      >
        {t.cancel}
      </button>
    </div>
  );
}
