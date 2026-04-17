import { cardSurfaceStyle } from "../styles";

type WikiFormActionsProps = {
  onCancel: () => void;
};

export function WikiFormActions({ onCancel }: WikiFormActionsProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-strong"
        style={cardSurfaceStyle}
        type="submit"
      >
        Save
      </button>
      <button
        className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-muted"
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
    </div>
  );
}
