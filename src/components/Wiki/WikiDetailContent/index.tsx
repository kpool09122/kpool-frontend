import {
  type WikiDetail,
  type WikiDraftDetail,
  normalizeWikiSectionContents,
  sortWikiSections,
} from "@kpool/wiki";
import { useId } from "react";

import { WikiPublicHeroImage } from "../WikiPublicHeroImage/index";
import { WikiSectionAccordion } from "../WikiSectionAccordion/index";
import { getWikiResourceLabel } from "@kpool/wiki";
import { useI18n } from "../../../i18n/I18nProvider";

type WikiDetailContentProps = {
  data: WikiDetail | WikiDraftDetail;
  editHref?: string;
  language: string;
};

export function WikiDetailContent({
  data,
  editHref,
  language,
}: WikiDetailContentProps) {
  const { dictionary } = useI18n();
  const t = dictionary.wiki;
  const flipCardId = useId();
  const sections = sortWikiSections(data.sections.map(normalizeWikiSectionContents));

  return (
    <div className="flex flex-col gap-8">
      <header>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-4xl font-semibold text-text-strong lg:text-5xl">
            {data.basic.name}
          </h1>
        </div>
      </header>

      <WikiPublicHeroImage
        basic={data.basic}
        editHref={editHref}
        flipCardId={flipCardId}
        heroImage={data.heroImage}
        language={language}
        profileLabel={`${getWikiResourceLabel(data.resourceType)} ${t.profileSuffix}`}
      />

      <section className="space-y-5">
        <div className="space-y-4">
          {sections.map((section) => (
            <WikiSectionAccordion
              editHref={editHref}
              key={section.sectionIdentifier}
              language={language}
              section={section}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
