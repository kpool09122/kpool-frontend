export function AnnouncementCategoryBadge({
  label,
}: {
  label: string;
}) {
  return (
    <span className="inline-flex rounded-full border border-stroke-subtle bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-muted">
      {label}
    </span>
  );
}
