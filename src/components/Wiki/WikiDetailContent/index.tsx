import {
  type WikiDetail,
  type WikiDraftDetail,
  normalizeWikiSectionContents,
  sortWikiSections,
} from "@kpool/wiki";
import { useId, type ReactNode, type MouseEventHandler } from "react";

import { WikiPublicHeroImage } from "../WikiPublicHeroImage/index";
import { OfficialCertificationBadge } from "../OfficialCertificationBadge/index";
import { WikiContentTabs } from "../WikiContentTabs/index";
import { WikiSectionAccordion } from "../WikiSectionAccordion/index";
import { sectionListClassName } from "../styles";

import { dictionaries } from "../../../i18n/dictionaries";
import { normalizeLocale } from "../../../i18n/locales";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiDetailContentProps = {
  data: WikiDetail | WikiDraftDetail;
  editHref?: string;
  onEdit?: MouseEventHandler<HTMLAnchorElement>;
  language: string;
  sectionsOpenByDefault?: boolean;
  videoPanel?: ReactNode;
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
};

export function WikiDetailContent({
  data,
  editHref,
  onEdit,
  language,
  sectionsOpenByDefault,
  videoPanel,
  activeTabId,
  onTabChange,
}: WikiDetailContentProps) {
  const { dictionary } = useI18n();
  const contentDictionary = dictionaries[normalizeLocale(language) ?? "ja"];
  const t = dictionary.wiki;
  const flipCardId = useId();
  const sections = sortWikiSections(data.sections.map(normalizeWikiSectionContents));

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-7 sm:gap-8">
        <header className="mx-auto w-full max-w-3xl text-center">
          <h1 className="wiki-title text-4xl font-bold [overflow-wrap:anywhere] lg:text-5xl">
            {data.basic.name}
            {data.isOfficial === true ? (
              <OfficialCertificationBadge className="ms-3 h-10 w-10 lg:h-11 lg:w-11" />
            ) : null}
          </h1>
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
      </div>

      <WikiContentTabs
        ariaLabel={t.contentTabsLabel}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        tabs={[
          {
            id: "wiki",
            label: t.contentWikiTab,
            panel: (
              <div className={sectionListClassName}>
                {sections.map((section) => (
                  <WikiSectionAccordion
                    editHref={editHref}
                    onEdit={onEdit}
                    key={section.sectionIdentifier}
                    language={language}
                    openByDefault={sectionsOpenByDefault}
                    section={section}
                  />
                ))}
              </div>
            ),
          },
          ...(videoPanel
            ? [{ id: "video", label: t.contentVideoTab, panel: videoPanel }]
            : []),
        ]}
      />
    </div>
  );
}
