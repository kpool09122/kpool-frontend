import Link from "next/link";

import { ThemeToggle } from "./ThemeToggle";
import { getThemePaletteSections } from "./themePalette";

const paletteSections = getThemePaletteSections();

export default function Home() {
  return (
    <main className="min-h-screen bg-surface-base px-6 py-10 text-text-strong sm:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="overflow-hidden rounded-[2rem] border border-stroke-subtle bg-surface-raised shadow-soft">
          <div className="bg-brand-primary px-6 py-10 text-white sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-highlight">
                K-Pool Theme
              </p>
              <ThemeToggle />
            </div>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Trust-forward colors for a calm, premium first impression.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/78">
              The palette avoids aqua-led branding and establishes reusable
              tokens for future product UI.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                className="inline-flex items-center rounded-full bg-brand-secondary px-5 py-3 text-sm font-semibold text-[#15243b] transition hover:brightness-105"
                href="/wiki/aurora-echo"
              >
                Open Wiki Detail Demo
              </Link>
              <p className="text-sm text-white/72">
                Jump straight to the public wiki detail prototype.
              </p>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 text-sm text-text-muted sm:px-10 lg:grid-cols-[1.3fr_0.7fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-strong">
                Direction
              </p>
              <p className="mt-3 max-w-2xl leading-7">
                Deep navy carries the brand, muted neutrals support long-form
                reading, and warm gold handles emphasis without competing for
                attention.
              </p>
              <p className="mt-3 leading-7">
                A manual theme switch is available in the hero so the dark
                palette can be reviewed without changing OS settings.
              </p>
            </div>

            <div className="rounded-3xl border border-stroke-subtle bg-brand-highlight/40 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-text-strong">
                Primary Usage
              </p>
              <ul className="mt-3 space-y-2 leading-6">
                <li>Navigation, headings, and key actions use `brand-primary`.</li>
                <li>Highlights and badges use `brand-secondary`.</li>
                <li>Background hierarchy comes from surface and text tokens.</li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="palette-heading" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-text-muted">
                Palette
              </p>
              <h2
                id="palette-heading"
                className="text-3xl font-semibold tracking-[-0.03em]"
              >
                Theme token preview
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-text-muted">
              Each swatch exposes the CSS variable name and intended usage so
              future components can adopt the same tokens directly from
              `globals.css`.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {paletteSections.map((section) => (
              <section
                key={section.title}
                aria-label={`${section.title} palette`}
                className="rounded-[1.75rem] border border-stroke-subtle bg-surface-raised p-6 shadow-soft"
              >
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.02em]">
                    {section.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {section.description}
                  </p>
                </div>

                <ul className="mt-6 space-y-4">
                  {section.items.map((item) => (
                    <li
                      key={item.cssVar}
                      className="flex items-center gap-4 rounded-2xl border border-stroke-subtle bg-surface-base p-4"
                    >
                      <div
                        aria-hidden="true"
                        className="h-14 w-14 shrink-0 rounded-2xl border border-black/5"
                        style={{ backgroundColor: item.value }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-text-strong">{item.name}</p>
                        <p className="text-sm text-text-muted">{item.role}</p>
                        <code className="mt-1 block text-xs text-text-muted">
                          {item.cssVar}
                        </code>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
