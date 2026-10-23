import { formatContactDate } from "./contactDate";
import { formatContactPreview } from "./contactPreview";

// Only fields needed to display a card; independent of either API's DTO.
export type ContactCardSummary = {
  contactIdentifier: string;
  category: number;
  name: string;
  createdAt: string;
  content: string;
  replyIdentifiers: readonly string[];
};

export function ContactCategoryBadge({ category, label }: { category: number; label: string }) {
  const colors = {
    1: "border-brand-primary bg-brand-primary/10 text-brand-primary",
    2: "border-status-danger bg-status-danger/10 text-status-danger",
    3: "border-status-warning bg-status-warning/10 text-status-warning",
  }[category] ?? "border-text-muted bg-text-muted/10 text-text-strong";
  return <span className={`inline-flex min-w-0 max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-semibold [overflow-wrap:anywhere] ${colors}`}>{label}</span>;
}

export function ContactCard({ contact, categoryLabel, replyCountLabel, locale, disabled = false, onOpen }: {
  contact: ContactCardSummary;
  categoryLabel: string;
  replyCountLabel: (count: number) => string;
  locale: string;
  disabled?: boolean;
  onOpen: (contactIdentifier: string) => void;
}) {
  const replyCount = contact.replyIdentifiers.length;
  return <button
    aria-haspopup="dialog"
    className="grid w-full min-w-0 gap-3 rounded-xl border border-stroke-subtle bg-surface-raised p-4 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    disabled={disabled}
    onClick={() => onOpen(contact.contactIdentifier)}
    type="button"
  >
    <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <span className="flex min-w-0 flex-wrap items-center gap-3">
        <ContactCategoryBadge category={contact.category} label={categoryLabel} />{" "}
        <span className="min-w-0 break-all font-semibold text-text-strong">{contact.name}</span>{" "}
        <span className="ml-auto min-w-0 max-w-full break-words text-right text-sm text-text-muted [overflow-wrap:anywhere]">{formatContactDate(contact.createdAt, locale)}</span>
      </span>{" "}
      {replyCount > 0 ? <span aria-label={replyCountLabel(replyCount)} className="inline-flex aspect-square min-w-6 shrink-0 items-center justify-center self-start justify-self-end whitespace-nowrap rounded-full border border-status-success bg-surface-raised p-1 text-xs font-semibold leading-none text-status-success">
        {replyCount}
      </span> : null}
    </span>{" "}
    <span className="min-w-0 whitespace-pre-wrap text-sm text-text-muted [overflow-wrap:anywhere]">{formatContactPreview(contact.content)}</span>
  </button>;
}
