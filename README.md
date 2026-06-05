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

Node 22 is expected (see [`.nvmrc`](.nvmrc)). No environment variables are required — the app runs
entirely against the in-memory mock HCM. See [`.env.example`](.env.example) for the optional
overrides (e.g. disabling the MSW worker).

### With Docker (single command)

A single command brings up both the app and Storybook, each against the in-memory mock HCM:

```bash
docker compose up        # app → http://localhost:3000   Storybook → http://localhost:6006
```

Both services share one image (Node 22) defined in [`Dockerfile`](Dockerfile); the wiring is in
[`docker-compose.yml`](docker-compose.yml). Stop with `docker compose down`.

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
| `npm run chromatic`       | Publish Storybook to Chromatic (needs a token)      |

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every push and pull request:

- **`verify`** — `npm ci`, then `lint`, `build`, `test:run` (unit + Storybook interaction tests in
  a headless Chromium) and `build-storybook`. This is the guardrail that keeps future contributors
  from silently breaking a state: a broken reconcile, rollback or approval path fails the build.
- **`chromatic`** — publishes the static Storybook to [Chromatic](https://www.chromatic.com/) for a
  live, deployed URL and visual regression baselines. It reads `secrets.CHROMATIC_PROJECT_TOKEN`;
  add that secret under the repository's **Settings ▸ Secrets and variables ▸ Actions** to enable
  it. Locally: `CHROMATIC_PROJECT_TOKEN=… npm run chromatic`.

## Test strategy & coverage

Four layers guard distinct regressions (the reasoning is in [`docs/TRD.md`](docs/TRD.md) §6):

| Layer                       | What it protects                                                                                                                                                     | Where                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Mock HCM integration tests  | The HCM contract and every branch — success, version conflict, insufficient balance, silent-wrong, latency, anniversary bonus                                        | `src/mocks/hcm/handlers.test.ts`                 |
| Hook tests                  | The data layer's reconciliation logic — optimistic apply, rollback, silent-wrong detection, version validation, reconcile in-flight guard                            | `src/features/time-off/hooks/*.test.tsx`         |
| Storybook stories           | Every visual state in isolation (loading, empty, stale, optimistic-pending, optimistic-rolled-back, HCM-rejected, HCM-silently-wrong, balance-refreshed-mid-session) | `src/features/time-off/components/*.stories.tsx` |
| Storybook interaction tests | User-visible flows end-to-end through MSW (`play()` functions, run in browser mode by the `storybook` Vitest project)                                                | same `*.stories.tsx`, run via `npm run test:run` |

`npm run test:coverage` reports v8 coverage for the **data layer and mock HCM**
(`src/features/time-off/{api,hooks,state}` and `src/mocks/hcm`) — the logic-heavy code where a
silent break is most dangerous. Components are exercised by the Storybook interaction tests rather
than by line coverage, because their correctness is about rendered states and user flows, not
branch counts.

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

The Time-Off feature lets an **employee** choose their active employee persona, view balances,
file requests by date range, cancel pending requests, and review the full request history
(`Pending`, `Approved`, `Denied`, `Cancelled`, and honest rollback states). A **manager** reviews
pending requests grouped by employee, then approves or denies against the latest authoritative
balance.

The catch: the **HCM** (an external Workday/SAP-like system, here mocked with MSW) is the source
of truth — ExampleHR only presents and orchestrates. The data layer is optimistic with an
authoritative re-read and a background reconcile that recovers honestly when the HCM disagrees
(it never shows a request as approved and then silently denies it). The design and the alternatives
considered are in [`docs/TRD.md`](docs/TRD.md).

### Run it

```bash
npm run dev                 # then open:
#   http://localhost:3000/time-off    Employee view
#   http://localhost:3000/approvals   Manager view
```

The app runs entirely against the in-memory mock HCM — no backend required. A single command
(`npm run dev`) is enough. Storybook (`npm run storybook`) renders every state in isolation,
including the failure paths, employee persona switching, cancellation, request history, date-range
request labels, and grouped manager approvals with interaction tests under `@storybook/addon-vitest`.

> Note: opening Storybook may log a few `No existing state found for follower with id:
'storybook/...'` warnings in the browser console. These come from Storybook 10's own
> UniversalStore / test-widget initialisation
> ([storybookjs/storybook#33575](https://github.com/storybookjs/storybook/issues/33575)) — they are
> cosmetic, the stories render fine, and the interaction tests (`npm run test:run`) are unaffected.

### Driving the mock (browser console)

With the dev server running, the mock HCM is controllable from the browser console:

```js
hcm.bonus(); // anniversary bonus on e1/us (+5); reconcile shows "Refreshed"
hcm.bonus('e1', 'de', 3); // bonus on a specific cell/amount
hcm.birthday(); // birthday bonus (+1) for whoever's birthday is today, across all their cells
hcm.birthday('06-05', 2); // birthday bonus for a specific MM-DD and amount (e2 was born 06-05)
hcm.failNext('insufficient-balance'); // next file request on e1/us is rejected
hcm.failNext('conflict'); // next write conflicts (version moved)
hcm.failNext('silent-wrong'); // next write returns 200 but a wrong balance
hcm.failNext('silent-wrong-pending-mismatch'); // 200 with incoherent available/pending movement
hcm.reset(); // reset the mock to its default seed
```

To see a **balance refresh mid-session**: open `/time-off`, run `hcm.bonus()` (work anniversary)
or `hcm.birthday('06-05')` (employee e2's birthday), and within a few seconds the affected balances
update and the card shows a **Refreshed** badge. The reconcile is driven by the HCM bumping a cell's
version; the birthday trigger is keyed off each employee's `birthday` (`MM-DD`) in the seed and only
credits the employees whose birthday matches. To see **honest recovery**: run
`hcm.failNext('silent-wrong')`, then file a request — the optimistic change is reconciled to the
authoritative HCM value, a **Reverted** row appears in the request list, and a toast explains why.

Employee requests are filed with `startDate` and `endDate`; the UI derives the submitted day count
from weekdays in that range. The mock does not model country-specific holidays or location
calendars. A new request is blocked when its date range overlaps an existing `Pending` or
`Approved` request for the same employee. Requests must start at least 3 days from today, cannot
exceed 10 business days, cannot cross the fiscal-year boundary, and cannot be dated after
December 31, 2099. Pending requests can be cancelled from the employee history; the mock HCM
returns the days from `pending` to `available` and keeps the request visible as `Cancelled`.

The manager approval queue is grouped by employee and highlights team overlap warnings when
another employee has active time off in the same range.

### Validation

Use these commands before shipping assessment changes:

```bash
npm run lint
npm run build
npm run test:unit
npm run test:run
npm run test:coverage
npm run build-storybook
```

Storybook coverage for the current product surface lives under `src/features/time-off/components`:
employee persona switching (`EmployeeTimeOffShell`), date-range filing, cancellation, full request
history loading/error/syncing states, HCM rollback paths, mid-session balance refresh, request
policy validation, and manager approvals grouped by employee with team overlap warnings.

### Layout

```
src/features/time-off/
  api/        types, hcm-client, query keys, cell key, date-range and request-policy helpers
  hooks/      useBalance(s), useRequests, useFileTimeOff, useCancelRequest,
              useReconcile, manager approve/deny
  components/ BalanceCard, TimeOffRequestForm, RequestStatusList,
              PendingApprovalRow/Item/List, Employee shell/persona selector,
              Employee/Manager containers (+ stories)
  state.ts    Jotai ephemeral UI state (in-flight + refreshed cells + rolled-back requests)
src/mocks/hcm/  in-memory store with real logic, MSW handlers, latency, integration tests
```
