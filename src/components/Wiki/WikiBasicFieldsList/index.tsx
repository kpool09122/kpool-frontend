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
          <dd className="mt-1 text-sm leading-6 text-text-strong">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
