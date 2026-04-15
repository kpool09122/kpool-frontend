"use client";

import Image from "next/image";
import { type WikiSection } from "@/types/wiki-detail";
import { useId } from "react";

import { getSectionOffset, getWikiBasicFields, sortWikiSections } from "./wikiDetailView";
import { useWikiDetail } from "./useWikiDetail";

type WikiDetailPageProps = {
  wikiId: string;
};

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L7 21l-4 1 1-4Z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="section-accordion__chevron h-4 w-4 transition-transform"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SectionAccordion({ section }: { section: WikiSection }) {
  return (
    <details
      className="section-accordion rounded-[1.75rem] border border-stroke-subtle bg-surface-raised shadow-soft"
      data-testid={`section-${section.sectionIdentifier}`}
      style={{ marginLeft: `${getSectionOffset(section.depth)}px` }}
    >
      <summary
        className="flex list-none items-center gap-3 cursor-pointer p-5 text-left"
        data-testid={`section-toggle-${section.sectionIdentifier}`}
      >
        <span className="rounded-full border border-stroke-subtle p-2 text-text-muted">
          <ChevronIcon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-2xl font-semibold tracking-[-0.03em] text-text-strong">
            {section.title}
          </span>
        </span>
        <span
          aria-label={`Edit section ${section.title}`}
          className="rounded-full border border-stroke-subtle p-3 text-text-strong transition group-hover:bg-brand-highlight/30"
          role="img"
        >
          <EditIcon />
        </span>
      </summary>

      <div className="border-t border-stroke-subtle px-5 pb-5 pt-4">
        <p className="max-w-3xl text-sm leading-7 text-text-muted">
          {section.body}
        </p>
        {section.children.length > 0 ? (
          <div className="mt-5 space-y-4">
            {section.children.map((child) => (
              <SectionAccordion key={child.sectionIdentifier} section={child} />
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function WikiDetailPage({ wikiId }: WikiDetailPageProps) {
  const wikiDetail = useWikiDetail(wikiId);
  const flipCardId = useId();

  if (wikiDetail.status === "loading") {
    return (
      <main className="min-h-screen bg-surface-base px-6 py-12 text-text-strong sm:px-10">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-stroke-subtle bg-surface-raised p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-text-muted">
            Loading Wiki
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.03em]">
            Preparing the public detail view...
          </p>
        </div>
      </main>
    );
  }

  if (wikiDetail.status === "error") {
    return (
      <main className="min-h-screen bg-surface-base px-6 py-12 text-text-strong sm:px-10">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-status-danger/30 bg-surface-raised p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-status-danger">
            Unable to load wiki
          </p>
          <p className="mt-4 text-lg leading-7 text-text-muted">
            {wikiDetail.message}
          </p>
        </div>
      </main>
    );
  }

  if (wikiDetail.status === "empty") {
    return (
      <main className="min-h-screen bg-surface-base px-6 py-12 text-text-strong sm:px-10">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-stroke-subtle bg-surface-raised p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-text-muted">
            No public wiki yet
          </p>
          <p className="mt-4 text-lg leading-7 text-text-muted">
            This resource does not have a public wiki detail page at the moment.
          </p>
        </div>
      </main>
    );
  }

  const { data } = wikiDetail;
  const basicFields = getWikiBasicFields(data.basic);
  const sections = sortWikiSections(data.sections);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,214,194,0.85),_transparent_38%),linear-gradient(180deg,_var(--background)_0%,_#fff_100%)] px-5 py-6 text-text-strong sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="lg:hidden">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-text-strong">
            {data.basic.name}
          </h1>
        </header>

        <section className="lg:overflow-hidden lg:rounded-[2rem] lg:border lg:border-stroke-subtle lg:bg-surface-raised lg:shadow-soft">
          <div className="hidden border-b border-stroke-subtle bg-brand-primary px-6 py-6 text-white sm:px-8 lg:block">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mt-3 hidden text-4xl font-semibold tracking-[-0.05em] lg:block lg:text-5xl">
                  {data.basic.name}
                </h1>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:hidden">
            <div className="space-y-4">
              <input
                className="peer sr-only"
                data-testid="wiki-flip-input"
                id={flipCardId}
                type="checkbox"
              />
              <div
                aria-label="Flip wiki card"
                className="block"
                data-testid="wiki-flip-trigger"
                role="group"
              >
                <div className="relative h-[34rem] [perspective:1400px]">
                  <div
                    className="relative h-full rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] peer-checked:[transform:rotateY(180deg)]"
                    data-testid="wiki-flip-card"
                  >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised [backface-visibility:hidden]">
                      <div className="relative h-full w-full">
                        <Image
                          alt={data.heroImage.alt}
                          className="object-cover"
                          fill
                          sizes="100vw"
                          src={data.heroImage.src}
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-[#15243b]/5 via-transparent via-55% to-[#15243b]/92" />
                      <div className="absolute inset-x-0 bottom-0 px-5 py-6 text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-highlight">
                          Tap The Card
                        </p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                          Flip to reveal the basic profile
                        </p>
                        <p className="mt-3 max-w-xs text-sm leading-6 text-white/78">
                          The card turns like a physical profile card and exposes
                          the group basics on the reverse side.
                        </p>
                      </div>
                    </div>
                    <label
                      aria-label="Flip wiki card to basic details"
                      className="absolute inset-0 z-30 cursor-pointer rounded-[2rem]"
                      data-testid="wiki-flip-front-toggle"
                      htmlFor={flipCardId}
                    />

                    <div
                      className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] pointer-events-none peer-checked:pointer-events-auto"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                            Basic
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                            Group profile
                          </p>
                        </div>
                        <label
                          aria-label="Flip wiki card to image side"
                          className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-medium text-text-strong"
                          htmlFor={flipCardId}
                        >
                          Flip back
                        </label>
                      </div>
                      <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                        <dl className="grid gap-4">
                        {basicFields.map((field) => (
                          <div
                            key={field.label}
                            className="rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-3"
                          >
                            <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                              {field.label}
                            </dt>
                            <dd className="mt-1 text-sm leading-6 text-text-strong">
                              {field.value}
                            </dd>
                          </div>
                        ))}
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-text-muted">
                <span className="peer-checked:hidden">
                  Tap anywhere on the card to flip to the basic details.
                </span>
                <span className="hidden peer-checked:inline">
                  Tap the card again to return to the cover image.
                </span>
              </p>
            </div>
          </div>

          <div className="hidden gap-6 px-6 py-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden rounded-[1.75rem] border border-stroke-subtle">
              <div className="relative min-h-[30rem]">
                <Image
                  alt={data.heroImage.alt}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  src={data.heroImage.src}
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-stroke-subtle bg-surface-base p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                    Basic
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Group profile
                  </p>
                </div>
                <button
                  aria-label="Edit basic"
                  type="button"
                  className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
                >
                  <EditIcon />
                </button>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {basicFields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
                      {field.label}
                    </dt>
                    <dd className="mt-1 text-sm leading-6 text-text-strong">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-4">
            {sections.map((section) => (
              <SectionAccordion key={section.sectionIdentifier} section={section} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
