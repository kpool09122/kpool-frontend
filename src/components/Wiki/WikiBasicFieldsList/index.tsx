import Link from "next/link";
import { getWikiBasicFields, type WikiBasic } from "@kpool/wiki";
import { type CSSProperties } from "react";

type WikiBasicFieldsListProps = {
  basic: WikiBasic;
  className: string;
  itemClassName: string;
  itemStyle: CSSProperties;
};

const basicFieldTextWrapClassName =
  "min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]";

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
        <div className={`${basicFieldTextWrapClassName} ${itemClassName}`} key={field.label} style={itemStyle}>
          <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
            {field.label}
          </dt>
          <dd className={`${basicFieldTextWrapClassName} mt-1 text-sm leading-6 text-text-strong`}>
            {field.links ? (
              <span className={`${basicFieldTextWrapClassName} flex flex-wrap gap-x-2 gap-y-1`}>
                {field.links.map((link, index) => (
                  <span className={basicFieldTextWrapClassName} key={`${link.href}-${index}`}>
                    {index > 0 ? <span className="mr-2 text-text-muted">,</span> : null}
                    <Link
                      className={`${basicFieldTextWrapClassName} font-semibold text-brand-primary underline-offset-4 hover:underline`}
                      href={link.href}
                    >
                      {link.label}
                    </Link>
                  </span>
                ))}
              </span>
            ) : (
              <span className={basicFieldTextWrapClassName}>{field.value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
