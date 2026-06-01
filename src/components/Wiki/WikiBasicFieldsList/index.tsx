import Link from "next/link";
import { getWikiBasicFields, type WikiBasic } from "@kpool/wiki";
import { type CSSProperties } from "react";

type WikiBasicFieldsListProps = {
  basic: WikiBasic;
  className: string;
  itemClassName: string;
  itemStyle: CSSProperties;
};

export function WikiBasicFieldsList({
  basic,
  className,
  itemClassName,
  itemStyle,
}: WikiBasicFieldsListProps) {
  const fields = getWikiBasicFields(basic);

  return (
    <dl className={className}>
      {fields.map((field) => (
        <div className={itemClassName} key={field.label} style={itemStyle}>
          <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            {field.label}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-text-strong">
            {field.links ? (
              <span className="flex flex-wrap gap-x-2 gap-y-1">
                {field.links.map((link, index) => (
                  <span key={`${link.href}-${index}`}>
                    {index > 0 ? <span className="mr-2 text-text-muted">,</span> : null}
                    <Link
                      className="font-semibold text-brand-primary underline-offset-4 hover:underline"
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </span>
                ))}
              </span>
            ) : (
              field.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
