# ExampleHR

Example application built with the following stack:

| Area | Technology |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Global state | [Jotai](https://jotai.org/) |
| Data fetching | [TanStack React Query v5](https://tanstack.com/query) |
| Component docs | [Storybook 10](https://storybook.js.org/) |
| Tests | [Vitest](https://vitest.dev/) + React Testing Library |
| Stories as tests | `@storybook/addon-vitest` (browser mode via Playwright) |
| API mocking | [MSW](https://mswjs.io/) (tests, Storybook and browser dev) |

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run storybook` | Storybook at http://localhost:6006 |
| `npm run build-storybook` | Static Storybook build |
| `npm test` | Vitest in watch mode (unit + stories) |
| `npm run test:run` | Single-run Vitest (unit + stories in browser mode) |
| `npm run test:unit` | Unit tests only (jsdom) |

## Structure

```
src/
  app/
    layout.tsx        # wraps the tree with <Providers>
    providers.tsx     # React Query + Jotai + Devtools (Client Component)
    page.tsx
  features/           # domain features (components / hooks / api)
  shared/
    theme.ts          # color and radius tokens (source of truth)
    components/        # components reused across features
      button/
  lib/
    query-client.ts   # QueryClient factory
    store.ts          # Jotai atoms
  mocks/
    handlers.ts       # shared MSW handlers
    server.ts         # MSW for Node (Vitest)
    browser.ts        # MSW for the browser (dev)
.storybook/           # Storybook config (MSW + Tailwind)
vitest.config.ts      # "unit" (jsdom) and "storybook" (browser) projects
vitest.setup.ts       # RTL matchers + MSW server
public/mockServiceWorker.js  # MSW worker (generated)
```

## Theming

Color and radius tokens live in [`src/shared/theme.ts`](src/shared/theme.ts) as the source of
truth. They are mirrored as CSS variables and exposed to Tailwind via `@theme` in
[`src/app/globals.css`](src/app/globals.css), so utilities like `bg-primary`,
`text-muted` and `border-border` are available. Avoid Tailwind arbitrary values — use the
named tokens instead.

## API mocking (MSW)

Handlers live in [`src/mocks/handlers.ts`](src/mocks/handlers.ts) and are reused across three
environments:

- **Tests** — `src/mocks/server.ts` is started in `vitest.setup.ts`.
- **Storybook** — initialized in `.storybook/preview.tsx`; override per story via
  `parameters.msw.handlers`.
- **Browser (dev)** — `src/mocks/browser.ts` + `public/mockServiceWorker.js`. The worker is
  ready but **not started by default** — call `worker.start()` when needed (for example behind
  a development flag).
