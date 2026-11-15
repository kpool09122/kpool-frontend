import type { WikiBasic } from "@kpool/wiki";
import type { ReactNode } from "react";

import { WikiBasicFieldsList } from "./WikiBasicFieldsList";

type WikiProfileCardDetailsProps = {
  basic: WikiBasic;
  language: string;
  title: string;
  action?: ReactNode;
};

export function WikiProfileCardDetails({ basic, language, title, action }: WikiProfileCardDetailsProps) {
  return (
    <div className="@container/wiki-profile">
      <div className="mb-1 flex min-h-9 items-center justify-between gap-3 border-b border-stroke-subtle pb-3">
        <h2 className="wiki-title text-xl font-semibold tracking-tight @min-[28rem]/wiki-profile:text-2xl">
          {title}
        </h2>
        {action}
      </div>
      <div onClick={(event) => event.stopPropagation()}>
        <WikiBasicFieldsList
          basic={basic}
          className="grid @min-[28rem]/wiki-profile:grid-cols-2 @min-[28rem]/wiki-profile:gap-x-8"
          itemClassName="border-b border-stroke-subtle py-2.5"
          language={language}
        />
      </div>
    </div>
  );
}
