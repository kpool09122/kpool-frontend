# kpool-frontend

This project is managed with `pnpm`.

## Requirements

- Node.js `26.13.1`
- `pnpm` `12.4.2`
- `task` `3.x`

## Getting Started

Install dependencies:

```bash
pnpm install
```

Or via Task:

```bash
task setup
```

Start the development server:

```bash
task dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## UI Components

UI primitives use shadcn/ui (Radix, `new-york`). Configuration is in `components.json`,
components live in `src/components/ui`, and `src/lib/utils.ts` provides `cn`.
Theme tokens in `src/app/globals.css` follow the existing k-pool colors.

Add components with `pnpm dlx shadcn@latest add <component>` and review the generated changes.
The video carousel uses the shadcn Carousel with Embla Autoplay.

## Environment Variables

Wiki pages fetch backend data via `KPOOL_WIKI_PRIVATE_API_BASE_URL`. Backend requests use `/api/v1/{context}`; browser-facing Next.js API URLs remain unversioned. Deploy together with kpool-backend#698.
For local development, create `.env.local` from the example and point it at the backend:

```bash
cp .env.example .env.local
```

Example:

```bash
KPOOL_WIKI_PRIVATE_API_BASE_URL=http://127.0.0.1:8000
```

After updating `.env.local`, restart `pnpm dev` or `task dev`.

公開WikiのGTM・GA4計測は既定で無効です。

## Available Tasks

```bash
task install
task dev
task build
task start
task lint
task test
task test:unit
task test:coverage
task test:e2e
task check
```

You can also run the underlying package scripts directly with `pnpm dev`, `pnpm build`, and `pnpm lint`.

## Testing

Unit tests use `Vitest` and Testing Library:

```bash
task test:unit
task test:coverage
```

End-to-end tests use `Playwright`:

```bash
task test:e2e
```

If browsers are not installed yet, run:

```bash
pnpm exec playwright install chromium
```
