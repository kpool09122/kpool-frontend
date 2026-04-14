# kpool-frontend

This project is managed with `pnpm`.

## Requirements

- Node.js `22.15.0` or compatible
- `pnpm` `10.33.0`
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
