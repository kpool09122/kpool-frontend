import { ContactCategoryBadge } from "./ContactCard";
import { formatContactDate } from "./contactDate";

// Presentation only: author is an already-localized label, omitted for own replies.
export type ContactReplyDisplay = {
  replyIdentifier: string;
  content: string;
  sentAt: string | null;
  replyType?: "operator" | "submitter";
  createdAt?: string;
  author?: string;
};

export function ContactDetail({ contact, categoryLabel, locale, historyTitle, emptyHistory }: {
  contact: { contactIdentifier: string; category: number; createdAt: string; content: string; replies: readonly ContactReplyDisplay[] };
  categoryLabel: string;
  locale: string;
  historyTitle: string;
  emptyHistory: string;
}) {
  return <>
    <section className="grid min-w-0 gap-3 rounded-lg bg-surface-base p-4"><p className="font-semibold text-text-strong"><ContactCategoryBadge category={contact.category} label={categoryLabel} /> · {formatContactDate(contact.createdAt, locale)}</p><p className="whitespace-pre-wrap text-text-strong [overflow-wrap:anywhere]">{contact.content}</p></section>
    <details key={contact.contactIdentifier} className="min-w-0 space-y-2" open>
      <summary className="list-item cursor-pointer rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2">
        <h4 className="inline">{historyTitle}</h4>
      </summary>
      {contact.replies.length === 0 ? <p className="text-sm text-text-muted">{emptyHistory}</p> : <div className="ml-2 grid min-w-0 gap-3">
        {contact.replies.map((item) => <div className={`min-w-0 border-l-2 ${item.replyType === "submitter" ? "border-brand-secondary" : "border-brand-primary"} pl-3`} key={item.replyIdentifier}>
          <article className="min-w-0 rounded-lg bg-surface-base p-3">
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{item.content}</p>
            <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm text-text-muted">
              {item.author !== undefined ? <p className="min-w-0 [overflow-wrap:anywhere]">{item.author}</p> : null}
              <p className="ml-auto text-right">{formatContactDate((item.replyType === "submitter" ? item.createdAt : item.sentAt) ?? "", locale)}</p>
            </div>
          </article>
        </div>)}
      </div>}
    </details>
  </>;
}
