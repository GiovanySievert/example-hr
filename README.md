# ExampleHR

Example application built with the following stack:

| Area             | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org/) (App Router)              |
| Language         | TypeScript                                                  |
| Styling          | [Tailwind CSS v4](https://tailwindcss.com/)                 |
| Global state     | [Jotai](https://jotai.org/)                                 |
| Data fetching    | [TanStack React Query v5](https://tanstack.com/query)       |
| Component docs   | [Storybook 10](https://storybook.js.org/)                   |
| Tests            | [Vitest](https://vitest.dev/) + React Testing Library       |
| Stories as tests | `@storybook/addon-vitest` (browser mode via Playwright)     |
| API mocking      | [MSW](https://mswjs.io/) (tests, Storybook and browser dev) |

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command                   | Description                                         |
| ------------------------- | --------------------------------------------------- |
| `npm run dev`             | Development server                                  |
| `npm run build`           | Production build                                    |
| `npm run start`           | Serve the production build                          |
| `npm run lint`            | ESLint                                              |
| `npm run storybook`       | Storybook at http://localhost:6006                  |
| `npm run build-storybook` | Static Storybook build                              |
| `npm test`                | Vitest in watch mode (unit + stories)               |
| `npm run test:run`        | Single-run Vitest (unit + stories in browser mode)  |
| `npm run test:unit`       | Unit tests only (jsdom)                             |
| `npm run test:coverage`   | Unit tests with v8 coverage (data layer + mock HCM) |

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
  started automatically by `MockProvider` (`src/mocks/mock-provider.tsx`). Disable it by setting
  `NEXT_PUBLIC_API_MOCKING=disabled`.

## Time-Off

The Time-Off feature lets an **employee** view balances and file requests, and a **manager**
approve or deny them. The catch: the **HCM** (an external Workday/SAP-like system, here mocked
with MSW) is the source of truth — ExampleHR only presents and orchestrates. The data layer is
optimistic with an authoritative re-read and a background reconcile that recovers honestly when
the HCM disagrees (it never shows a request as approved and then silently denies it). The design
and the alternatives considered are in [`docs/TRD.md`](docs/TRD.md).

### Run it

```bash
npm run dev                 # then open:
#   http://localhost:3000/time-off    Employee view
#   http://localhost:3000/approvals   Manager view
```

The app runs entirely against the in-memory mock HCM — no backend required. A single command
(`npm run dev`) is enough. Storybook (`npm run storybook`) renders every state in isolation,
including the failure paths, with interaction tests under `@storybook/addon-vitest`.

### Driving the mock (browser console)

With the dev server running, the mock HCM is controllable from the browser console:

```js
hcm.bonus(); // anniversary bonus on e1/us (+5); reconcile shows "Refreshed"
hcm.bonus('e1', 'de', 3); // bonus on a specific cell/amount
hcm.failNext('insufficient-balance'); // next file request on e1/us is rejected
hcm.failNext('conflict'); // next write conflicts (version moved)
hcm.failNext('silent-wrong'); // next write returns 200 but a wrong balance
hcm.reset(); // reset the mock to its default seed
```

To see the **anniversary bonus mid-session**: open `/time-off`, run `hcm.bonus()`, and within a
few seconds the US balance updates and the card shows a **Refreshed** badge. To see **honest
recovery**: run `hcm.failNext('silent-wrong')`, then file a request — the optimistic change is
reverted and a toast explains why.

### Layout

```
src/features/time-off/
  api/        types, hcm-client, query keys, cell key
  hooks/      useBalance(s), useFileTimeOff, useReconcile, manager approve/deny
  components/ BalanceCard, TimeOffRequestForm, RequestStatusList,
              PendingApprovalRow/Item/List, Employee/Manager containers (+ stories)
  state.ts    Jotai ephemeral UI state (in-flight + refreshed cells)
src/mocks/hcm/  in-memory store with real logic, MSW handlers, latency, integration tests
```
