import {
  type WikiDetail,
  type WikiDraftDetail,
  normalizeWikiSectionContents,
  sortWikiSections,
} from "@kpool/wiki";
import { useId, type MouseEventHandler } from "react";

import { WikiPublicHeroImage } from "../WikiPublicHeroImage/index";
import { OfficialCertificationBadge } from "../OfficialCertificationBadge/index";
import { WikiContentTabs } from "../WikiContentTabs/index";
import { WikiSectionAccordion } from "../WikiSectionAccordion/index";

import { dictionaries } from "../../../i18n/dictionaries";
import { normalizeLocale } from "../../../i18n/locales";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiDetailContentProps = {
  data: WikiDetail | WikiDraftDetail;
  editHref?: string;
  onEdit?: MouseEventHandler<HTMLAnchorElement>;
  language: string;
};

export function WikiDetailContent({
  data,
  editHref,
  onEdit,
  language,
}: WikiDetailContentProps) {
  const { dictionary } = useI18n();
  const contentDictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const t = dictionary.wiki;
  const flipCardId = useId();
  const sections = sortWikiSections(data.sections.map(normalizeWikiSectionContents));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="flex items-start justify-between gap-4">
          <h1 className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-4xl font-semibold text-text-strong lg:text-5xl">
            <span>{data.basic.name}</span>
            {data.isOfficial === true ? (
              <OfficialCertificationBadge className="h-10 w-10 lg:h-11 lg:w-11" />
            ) : null}
          </h1>
        </div>
      </header>

      <WikiPublicHeroImage
        basic={data.basic}
        editHref={editHref}
        onEdit={onEdit}
        flipCardId={flipCardId}
        heroImage={data.heroImage}
        language={language}
        profileLabel={contentDictionary.wiki.profileLabel}
        translationSetIdentifier={data.translationSetIdentifier}
      />

      <WikiContentTabs
        ariaLabel={t.contentTabsLabel}
        tabs={[
          {
            id: "wiki",
            label: t.contentWikiTab,
            panel: (
              <div className="space-y-4">
                {sections.map((section) => (
                  <WikiSectionAccordion
                    editHref={editHref}
                    onEdit={onEdit}
                    key={section.sectionIdentifier}
                    language={language}
                    section={section}
                  />
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
