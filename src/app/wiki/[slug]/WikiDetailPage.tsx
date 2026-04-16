"use client";

import Image from "next/image";
import {
  getWikiBasicFields,
  isWikiBlock,
  isWikiSection,
  normalizeWikiSectionContents,
  sortWikiSections,
  sortWikiSectionContents,
  type WikiBlock,
  type WikiSection,
} from "@kpool/wiki";
import { useId, useState } from "react";

import { buildWikiThemeCssVariables } from "./wikiThemePalette";
import { WikiEmbedFrame } from "./WikiEmbedFrame";
import { WikiRelatedProfiles } from "./WikiRelatedProfiles";
import { useWikiDetail } from "./useWikiDetail";

type WikiDetailPageProps = {
  slug: string;
  themeColor?: string;
};

const mainBackgroundStyle = {
  backgroundColor: "var(--background)",
  backgroundImage:
    "var(--wiki-page-background, radial-gradient(circle at top, rgba(255,214,194,0.85), transparent 38%), linear-gradient(180deg, var(--background) 0%, #fff 100%))",
};

const cardSurfaceStyle = {
  backgroundColor: "var(--wiki-card-background, var(--surface-raised))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

const cardSurfaceMutedStyle = {
  backgroundColor: "var(--wiki-card-background-muted, var(--surface-base))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
};

const transparentFrameStyle = {
  backgroundColor: "transparent",
  borderColor: "transparent",
  boxShadow: "none",
};

const heroOverlayStyle = {
  backgroundImage:
    "var(--wiki-hero-overlay, linear-gradient(to bottom, rgba(21, 36, 59, 0.05), transparent 55%, rgba(21, 36, 59, 0.92)))",
};

const accentBadgeStyle = {
  backgroundColor: "var(--wiki-accent-background, rgba(255, 214, 194, 0.3))",
  color: "var(--wiki-accent-text, var(--text-strong))",
  borderColor: "var(--wiki-card-border, var(--stroke-subtle))",
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

function WikiBlockDisplay({ block }: { block: WikiBlock }) {
  switch (block.blockType) {
    case "text":
      return <p className="max-w-3xl text-sm leading-7 text-text-muted">{block.content}</p>;
    case "image":
      return (
        <figure>
          <div className="relative min-h-64 overflow-hidden rounded-2xl border border-stroke-subtle">
            <Image alt={block.alt ?? ""} className="object-cover" fill sizes="100vw" src={block.imageSrc} />
          </div>
          {block.caption ? <figcaption className="mt-2 text-sm text-text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "image_gallery":
      return (
        <figure>
          <div className="grid gap-3 sm:grid-cols-2">
            {block.images.map((image) => (
              <div className="relative min-h-40 overflow-hidden rounded-2xl border border-stroke-subtle" key={image.imageIdentifier}>
                <Image alt={image.alt ?? ""} className="object-cover" fill sizes="50vw" src={image.imageSrc} />
              </div>
            ))}
          </div>
          {block.caption ? <figcaption className="mt-2 text-sm text-text-muted">{block.caption}</figcaption> : null}
        </figure>
      );
    case "embed":
      return <WikiEmbedFrame block={block} />;
    case "quote":
      return (
        <blockquote className="border-l-4 border-text-muted/30 pl-4 text-base leading-8 text-text-strong">
          {block.content}
          {block.source ? <cite className="mt-2 block text-sm text-text-muted">{block.source}</cite> : null}
        </blockquote>
      );
    case "list":
      return block.listType === "numbered" ? (
        <ol className="list-decimal space-y-2 pl-6 text-sm leading-7 text-text-muted">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ol>
      ) : (
        <ul className="list-disc space-y-2 pl-6 text-sm leading-7 text-text-muted">
          {block.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            {block.headers ? (
              <thead>
                <tr>{block.headers.map((header) => <th className="border-b border-stroke-subtle px-3 py-2" key={header}>{header}</th>)}</tr>
              </thead>
            ) : null}
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")}>{row.map((cell) => <td className="border-b border-stroke-subtle px-3 py-2 text-text-muted" key={cell}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "profile_card_list":
      return <WikiRelatedProfiles block={block} />;
  }
}

function SectionAccordion({ section }: { section: WikiSection }) {
  const contents = sortWikiSectionContents(section.contents);

  return (
    <details
      className="section-accordion rounded-[1.75rem] border border-stroke-subtle bg-surface-raised shadow-soft"
      data-testid={`section-${section.sectionIdentifier}`}
      style={cardSurfaceStyle}
    >
      <summary
        className="flex list-none items-center gap-3 cursor-pointer p-5 text-left"
        data-testid={`section-toggle-${section.sectionIdentifier}`}
      >
        <span
          className="rounded-full border border-stroke-subtle p-2 text-text-muted"
          style={cardSurfaceMutedStyle}
        >
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
          style={cardSurfaceMutedStyle}
        >
          <EditIcon />
        </span>
      </summary>

      <div
        className="space-y-4 border-t border-stroke-subtle px-5 pb-5 pt-4"
        style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
      >
        {contents.map((content) =>
          isWikiBlock(content) ? (
            <WikiBlockDisplay block={content} key={content.blockIdentifier} />
          ) : isWikiSection(content) ? (
            <SectionAccordion key={content.sectionIdentifier} section={content} />
          ) : null,
        )}
      </div>
    </details>
  );
}

export function WikiDetailPage({ slug, themeColor }: WikiDetailPageProps) {
  const wikiDetail = useWikiDetail(slug, { themeColor });
  const flipCardId = useId();
  const [isFlipped, setIsFlipped] = useState(false);

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
  const sections = sortWikiSections(data.sections.map(normalizeWikiSectionContents));
  const themeStyles = buildWikiThemeCssVariables(data.themeColor);
  const themeLabel = data.themeColor?.toUpperCase();

  return (
    <main
      className="wiki-theme-scope min-h-screen px-5 py-6 text-text-strong sm:px-8 sm:py-10"
      data-testid="wiki-theme-root"
      style={{
        ...themeStyles,
        ...mainBackgroundStyle,
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-text-strong lg:text-5xl">
              {data.basic.name}
            </h1>
            {themeLabel ? (
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
                data-testid="wiki-theme-badge"
                style={accentBadgeStyle}
              >
                Theme {themeLabel}
              </span>
            ) : null}
          </div>
        </header>

        <section
          className="lg:rounded-[2rem]"
          style={transparentFrameStyle}
        >
          <div className="grid gap-5 lg:hidden">
            <div className="space-y-4">
              <input
                className="sr-only"
                data-testid="wiki-flip-input"
                id={flipCardId}
                onChange={(event) => setIsFlipped(event.currentTarget.checked)}
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
                    className={`relative h-full rounded-[2rem] shadow-soft transition duration-700 [transform-style:preserve-3d] ${
                      isFlipped ? "[transform:rotateY(180deg)]" : ""
                    }`}
                    data-testid="wiki-flip-card"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised [backface-visibility:hidden]"
                      style={cardSurfaceStyle}
                    >
                      <div className="relative h-full w-full">
                        <Image
                          alt={data.heroImage.alt}
                          className="object-cover"
                          fill
                          sizes="100vw"
                          src={data.heroImage.src}
                        />
                      </div>
                      <div className="absolute inset-0" style={heroOverlayStyle} />
                      <div className="absolute inset-x-0 bottom-0 px-5 py-6 text-white">
                        <p
                          className="text-xs font-semibold uppercase tracking-[0.28em]"
                          style={{ color: "var(--wiki-hero-accent, var(--brand-highlight))" }}
                        >
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
                      className={`absolute inset-0 z-30 rounded-[2rem] ${
                        isFlipped ? "pointer-events-none" : "cursor-pointer"
                      }`}
                      data-testid="wiki-flip-front-toggle"
                      htmlFor={flipCardId}
                    />

                    <div
                      className={`absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                        isFlipped ? "pointer-events-auto" : "pointer-events-none"
                      }`}
                      onClick={() => setIsFlipped(false)}
                      style={cardSurfaceStyle}
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
                      </div>
                      <div
                        className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <dl className="grid gap-4">
                          {basicFields.map((field) => (
                            <div
                              key={field.label}
                              className="rounded-2xl border border-stroke-subtle bg-surface-base px-4 py-3"
                              style={cardSurfaceMutedStyle}
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
                <span className={isFlipped ? "hidden" : ""}>
                  Tap anywhere on the card to flip to the basic details.
                </span>
                <span className={isFlipped ? "inline" : "hidden"}>
                  Tap the card again to return to the cover image.
                </span>
              </p>
            </div>
          </div>

          <div className="hidden gap-6 py-6 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            <div
              className="h-full overflow-hidden rounded-[1.75rem] border border-stroke-subtle"
              style={{ borderColor: "var(--wiki-card-border, var(--stroke-subtle))" }}
            >
              <div className="relative h-full min-h-[30rem]">
                <Image
                  alt={data.heroImage.alt}
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  src={data.heroImage.src}
                />
              </div>
            </div>

            <div
              className="rounded-[1.75rem] border border-stroke-subtle bg-surface-base p-6"
              style={cardSurfaceMutedStyle}
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
                <button
                  aria-label="Edit basic"
                  type="button"
                  className="rounded-full border border-stroke-subtle p-3 text-text-strong transition hover:bg-brand-highlight/30"
                  style={cardSurfaceStyle}
                >
                  <EditIcon />
                </button>
              </div>
              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {basicFields.map((field) => (
                  <div
                    key={field.label}
                    className="rounded-2xl border border-stroke-subtle bg-surface-raised px-4 py-3"
                    style={cardSurfaceStyle}
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
