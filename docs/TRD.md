# TRD — Time-Off (ExampleHR)

> Technical Requirements Document. Written first to lock the hard decisions before
> any code. The end-of-project review may revise sections, but the contracts and the
> reconciliation strategy below are the source of truth for the implementation.

## 1. Problem & context

ExampleHR lets employees view their time-off balances and file requests, and lets
managers approve or deny those requests. **ExampleHR is not the source of truth (SoT)
for balances.** The SoT lives in an external HCM system (think Workday / SAP). ExampleHR
only _presents_ and _orchestrates_.

This split creates the central tension of the feature:

- **Fast**: the UI must feel instant. An employee filing a request should see the effect
  immediately, not after a slow round-trip to the HCM.
- **Correct**: the number on screen must eventually match the HCM, and the app must never
  show a state that the HCM contradicts in a way that misleads the user — most importantly
  it must **never** show a request as `approved` and then silently flip it to `denied`.

We resolve this with **optimistic update + authoritative re-read + reconcile**: act fast,
then verify against the SoT, and recover _honestly_ when the SoT disagrees.

### Balance shape

- A balance is **per employee, per location**. One employee can hold several rows (one per
  location). We call a single `(employeeId, locationId)` row a **cell**.
- A balance cell carries `available`, `pending`, and a `version` / `updatedAt` used for
  conflict detection and reconciliation.

### HCM surface (what we must talk to / simulate)

1. **Per-cell read** — `GET /api/hcm/balance?employeeId&locationId`. Treated as the
   **authoritative read of a single cell**. Used right after a write and when a manager
   opens / acts on a request.
2. **Per-cell write** — `POST /api/hcm/balance`. Files a request against one cell. May
   return: `success`, `conflict` (version moved underneath us), `insufficient-balance`,
   or **silent-wrong** (HTTP 200 but the returned balance is incoherent with what we asked
   for). Latency is variable.
3. **Batch corpus** — `GET /api/hcm/balances`. The full set of balances. **Expensive and
   slower**; used for initial hydration and periodic background reconciliation.
4. **Requests** — `GET /api/hcm/requests` returns the complete request history. The employee
   view filters it by the active employee; the manager view narrows it to pending requests.
5. **Employee cancel** — `POST /api/hcm/requests/:id/cancel`. Cancels only pending requests,
   re-reads the relevant cell version, and returns the days to the balance.
6. **Manager decisions** — `POST /api/hcm/requests/:id/approve` and
   `POST /api/hcm/requests/:id/deny`. Decisions include the expected balance version and are
   rejected if the SoT moved before the decision is applied.

### Behaviours the mock must reproduce

- **Anniversary / start-of-year bonus** that fires on a timer/trigger and changes a balance
  **while the app is open** (the "refresh underneath you" problem).
- **Silent failures**: 200 OK with a wrong value.
- **Conflict / insufficient-balance** rejections.
- **Variable latency**.

### Personas

- **Employee** — chooses an active employee persona, sees that employee's balances, submits
  requests by date range, reviews the full request history, and can cancel pending requests.
  _Invariant_: never sees a request go `approved → denied`. A request the user perceives as
  accepted must not later silently flip.
- **Manager** — approves/denies against the **balance that is valid at the moment of the
  decision** (re-read on open / on action), and is blocked from deciding on obviously stale data.

## 2. Challenges (from the brief)

| #   | Challenge                                                        | Where it bites                                                 |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| C1  | Balance refreshes **underneath** an open session (bonus trigger) | reconcile vs in-flight mutation                                |
| C2  | Per-cell read is the **authoritative** truth for a cell          | post-write re-read, manager decision                           |
| C3  | Batch corpus is **expensive**                                    | can't poll it tightly; used for hydration + periodic reconcile |
| C4  | **Silent failures** (200 but wrong)                              | success path must still verify                                 |
| C5  | **Conflicts / insufficient balance**                             | optimistic apply must be reversible                            |
| C6  | **Per-employee / per-location** cells                            | cache keyed by cell, many rows per employee                    |

## 3. Proposed solution

### Data layer = React Query, keyed by cell and by corpus

- **Per-cell query key**: `['balance', employeeId, locationId]`. Authoritative truth for one cell.
- **Corpus query key**: `['balances']`. Hydration + background reconcile source.
- **Requests query key**: `['requests']`. Complete request history for the employee view.
- Manager uses the same request corpus through `usePendingRequests()` for the pending queue.

### Write path = optimistic mutation with rollback + authoritative re-read

`useFileTimeOff()`:

0. **Input** — the form captures `locationId`, `startDate`, and `endDate`. The UI derives
   `days` as weekdays in the selected range, then sends dates + derived days to the mock HCM.
   The current scope intentionally does not model country-specific holiday calendars.
   Requests cannot overlap an existing `Pending` or `Approved` request for the same employee,
   regardless of location; `Denied` and `Cancelled` history does not block a new request.
   Requests must start at least 3 days from today, cannot exceed 10 business days, and cannot
   cross the fiscal-year boundary.
1. **onMutate** — snapshot the current cell, apply the optimistic delta (`available -= days`,
   `pending += days`), mark the cell as **in-flight** (Jotai), cancel outgoing cell queries.
2. **onError** — roll the cell back to the snapshot, add a local `Reverted` request row,
   and toast the reason (conflict / insufficient / network).
3. **onSuccess** — perform an **authoritative per-cell re-read** (C2). Then **detect
   silent-wrong** (C4): if the re-read contradicts what a coherent success should look like
   (e.g. the server claims success but `available`, `pending`, or `version` did not move
   coherently), treat it as a **recoverable failure** — reconcile to the authoritative value,
   add a local `Reverted` request row, and toast an explanation. This is the honest-recovery
   path: we never leave the user believing a state the SoT contradicts.
4. **onSettled** — clear the in-flight mark for the cell.

### Background reconcile = periodic corpus refetch that respects in-flight work

`useReconcile()`:

- Periodically refetches the corpus (`['balances']`) — spaced out, because it's expensive (C3).
- On apply, for each cell: **if a mutation is in-flight for that cell, do not overwrite it**
  (C1). The in-flight optimistic value wins until its own authoritative re-read settles.
- For idle cells, reconcile by `version`/`updatedAt`: the corpus value wins only if it is
  **newer** than what we hold; equal/older is ignored (no needless churn, no flip-flop).
- When an idle cell changes under the user (e.g. bonus), surface a **non-destructive**
  `stale → refreshed` badge rather than silently mutating the number with no signal.

### Manager path

- The manager queue is grouped by employee so a manager can review one employee's pending
  requests in context instead of scanning a loose cross-employee list.
- Pending approvals surface team overlap warnings when another employee has an active
  `Pending` or `Approved` request in the same date range.
- Opening / acting on a request triggers an **authoritative re-read of the relevant cell**
  (C2). Approve/deny sends that cell's `expectedBalanceVersion`, and the mock HCM rejects the
  decision if the balance version changed before the decision is applied.
- Approve/deny is blocked when the cell is obviously stale (version moved since the queue was
  loaded) — the manager is asked to re-read before deciding, preventing a decision on a value
  the SoT has already changed.

### Employee cancel path

- Only pending requests expose a cancel action.
- Cancel re-reads the authoritative cell, sends the expected balance version to the mock HCM,
  and rejects if the balance or request moved underneath the user.
- On success, the request remains in the employee's history as `Cancelled`, and the requested
  days return from `pending` to `available`.

## 4. Alternatives analysed

### 4.0 Library choices: data fetching and state management

The brief asks us to pick the data-fetching and state-management tools deliberately. The deciding
factor is the shape of the problem: **almost everything in this feature is server state owned by the
HCM** — balances and requests that are fetched, cached, invalidated, re-read and reconciled. Very
little is true client state. So the two choices are really one decision (a server-state cache) plus
a small, deliberate complement (ephemeral UI state).

**Data fetching — TanStack React Query (chosen).**

- **vs. `fetch` in `useEffect` / hand-rolled cache**: we would have to reimplement caching by key,
  request deduplication, background refetch, `staleTime`, query invalidation, and the
  optimistic-update lifecycle (`onMutate` / `onError` / `onSettled` with rollback context). That
  lifecycle _is_ the heart of this feature (C2, C4, C5); rebuilding it by hand is exactly the
  error-prone code Query exists to remove.
- **vs. SWR**: very capable for reads, but Query's **mutation** model — typed `onMutate` context for
  optimistic apply + rollback, and granular `invalidateQueries` / `setQueryData` — maps directly
  onto the write path and the per-cell vs corpus invalidation strategy (§4.2). That mutation
  ergonomics gap is what tips it.
- **vs. RTK Query**: would be the natural pick _if_ we were already on Redux. We are not, and
  adopting the Redux toolchain only to get a query layer is weight we do not need.
- **Decision**: React Query. Its cache is keyed exactly the way the domain is — **per cell**
  (`['balance', employeeId, locationId]`) and **corpus** (`['balances']`) — so the SoT-reconciliation
  story (re-read a cell, reconcile the corpus, guard in-flight cells) is expressed in the library's
  own primitives rather than around them.

**State management — Jotai (chosen), scoped to ephemeral UI state only.**

- The only genuinely client-owned state is small and transient: which cells have an in-flight
  mutation, which were just refreshed (the badge), and the locally-held "reverted" request rows.
  Putting this in React Query would abuse the cache; putting it in React Context would re-render
  broad subtrees on every change.
- **vs. Redux / Zustand**: both work, but a global store + reducers/actions is ceremony for what is
  a handful of `Set<string>` and a list. Jotai's **atom-per-concern** model keeps each piece of UI
  state independent and co-located with the code that uses it, and only the components reading a
  given atom re-render.
- **Decision**: Jotai for ephemeral UI state, React Query for all server state. The boundary is
  explicit (§5): _if it comes from the HCM it lives in Query; if it is UI-only it lives in Jotai._
  Keeping client state this small is itself the point — most of the hard state is server state, and
  it belongs in the cache.

### 4.1 Optimistic vs pessimistic write

- **Pessimistic** (wait for HCM, then show result): trivially correct, never shows a state the
  SoT contradicts. But every action eats the full variable HCM latency — the UI feels broken,
  which is exactly the experience the brief calls out as unacceptable.
- **Optimistic** (chosen): instant feedback, then verify. Cost is complexity: we must make every
  optimistic change reversible and must verify even the success path (because of silent-wrong).
- **Decision**: **optimistic + authoritative re-read + reconcile.** The honest-recovery
  machinery (rollback + toast, never `approved → denied` silently) is what makes optimistic
  acceptable here. Pessimistic would trade away the product's core feel for correctness we can
  achieve anyway through verification.

### 4.2 Cache invalidation: invalidate-per-cell vs refetch-corpus

- **Refetch corpus on every change**: simplest mental model, but the corpus is expensive (C3);
  doing it per action does not scale and couples one cell's write to a full reload.
- **Invalidate per cell** (chosen for the write path): after a write we re-read **only the
  touched cell** — cheap, authoritative, scoped. The corpus is refetched **only** on a slow
  background cadence for reconciliation, not on the hot path.
- **Decision**: per-cell invalidation on writes; corpus refetch only for periodic background
  reconcile and initial hydration.

### 4.3 Background refresh vs in-flight action (the crux of C1)

When the corpus reconcile lands while a user action is mid-flight, who wins?

- **Last-write-wins by wall clock**: simple but wrong here — a stale corpus snapshot could clobber
  a fresh optimistic mutation, causing visible flip-flop.
- **Merge field-by-field**: brittle; balances aren't independently mergeable (available/pending
  move together).
- **Version / `updatedAt` per cell + in-flight guard** (chosen):
  - A cell with a **pending mutation is never overwritten** by reconcile; the optimistic value
    holds until its own authoritative re-read resolves it.
  - For idle cells, the corpus wins **only if its `version` is newer**. Equal/older is ignored.
  - This gives us monotonic, explainable behaviour: the newest authoritative version wins, and
    in-flight user intent is protected until it's been verified against the SoT.
- **Decision**: **version-guarded reconcile with an in-flight guard.** Not last-write-wins, not
  field merge.

### 4.4 Manual day count vs date range

- **Manual day count**: simpler implementation, but it does not match how employees think about
  vacations and makes the request history hard to audit.
- **Date range** (chosen): the employee picks `startDate` and `endDate`; ExampleHR derives
  weekdays as the requested day count and stores the dates on the request. This makes employee
  history and manager approvals much easier to understand.
- **Limitation**: the mock intentionally does not include country-specific holidays or location
  calendars. A production version should derive business days from the HCM/calendar source of
  truth rather than from weekdays only.

## 5. Component tree → concerns

```
(employee)/time-off                         Employee view
  TimeOffPage
    EmployeeTimeOffShell           → active employee persona selector for mock multi-employee data
    BalanceCard / BalanceCell      → C2/C6: per-cell authoritative balance, stale/refreshed badge
    TimeOffRequestForm             → write path: location + date range, derives business days
    RequestStatusList              → full history, cancel pending, rollback item, never approved→denied

(manager)/approvals                         Manager view
  ApprovalsPage
    PendingRequestList             → pending requests grouped by employee
      PendingRequestRow            → C2: balance context re-read + expected version at decision time
        approve / deny             → blocked on obviously-stale cell (C1/C5)

Supporting modules:
  api/date-range                   → weekday counting and display labels
  api/request-policy               → advance notice, max duration, fiscal-year limits
  hooks/useRequests                → complete request history
  hooks/usePendingRequests         → manager pending queue
  hooks/useCancelRequest           → cancel with balance-version check
```

Shared UI ephemeral state (set of in-flight cells, stale/refreshed banners, local rolled-back
request rows) lives in **Jotai**; all server state lives in **React Query**.

## 6. Test strategy

What each layer protects, and why:

- **Mock HCM integration tests (Vitest, unit project, against MSW handlers)** — protect the
  _contract and the branches_: success, conflict, insufficient-balance, silent-wrong, variable
  latency, and bonus-applied. If these drift, every layer above is testing a fiction.
- **Hook tests (`renderHook` + MSW)** — protect the _reconciliation logic_: optimistic apply,
  rollback on conflict/insufficient, silent-wrong detection on the success path, manager version
  validation, employee cancel, request refetch after filing, and reconcile that respects an
  in-flight mutation. This is where the hard decisions in §4 are enforced.
- **Storybook component stories** — protect _every visual state_ in isolation, including the
  uncomfortable ones (full history, cancelled, rolled-back, hcm-rejected, silently-wrong,
  refreshed-mid-session, grouped manager approvals).
- **Storybook interaction tests (play functions, addon-vitest)** — protect the _user-visible
  flows_ end to end against the mock: submit → optimistic → rollback; manager approving with a
  changed balance; employee switching persona; employee cancelling a pending request; bonus
  applied mid-session reconciling the UI.

### States to cover explicitly

Employee view: `loading`, `empty`, `stale`, `optimistic-pending`, `optimistic-rolled-back`,
`hcm-rejected` (conflict / insufficient), `hcm-silently-wrong`, `balance-refreshed-mid-session`,
`request-history-approved-denied-cancelled`, `request-history-loading-error-syncing`,
`cancel-pending-request`, `employee-persona-switch`, `request-policy-violation`.

Manager view: `empty`, `pending-balance-ok`, `pending-balance-insufficient`,
`grouped-by-employee`, `team-overlap-warning`,
`balance-changed-between-open-and-approve` (conflict on approve), `approval-success`, `denial`.

Coverage is gated on the data-layer hooks and the mock HCM branches (FASE 5); the report is
documented in the README.

## 7. Out of scope & future work

This deliverable deliberately scopes down to the problem the brief centres on: presenting balances
that feel instant while the HCM owns the numbers, and reconciling honestly when the two disagree.
The data layer, optimistic/reconcile model, and mock HCM are built to production-grade rigour; the
surrounding product surface of a real time-off system is intentionally not. The items below are the
gaps a production version would close, ordered by how much they shape the rest of the system.

### Tier 1 — domain model (changes the data shape)

- **Leave types.** A single generic balance is modelled. Real policy splits into vacation, sick,
  personal/PTO, parental, unpaid, bereavement, etc. — each with its own rules (sick needs no
  advance notice; some types skip approval). This adds a `leaveType` dimension to the balance cell
  and the request, so it would land before anything else.
- **Sub-day granularity.** `days` is an integer. Half-days and hour-level requests need a fractional
  or minutes-based amount on `Balance` and `TimeOffRequest`, plus matching validation and display.
- **Accrual, carry-over and expiry.** Balances are seeded as static numbers. A real system accrues
  N/month from a start date, caps accumulation, carries a bounded amount across the year, and
  expires "use-it-or-lose-it" days. The anniversary bonus is the only accrual event modelled today;
  the fiscal-year rule only _blocks_ a crossing request, it does not roll the balance over.
- **Holiday & working-day calendars per location.** `countBusinessDays` counts Mon–Fri only and
  ignores national/regional holidays — a real gap for a per-location system. Business days should
  be derived from the HCM/calendar source of truth, not from weekdays.

### Tier 2 — workflow & identity

- **Authentication, authorization and RBAC.** Identity is a persona dropdown; `/approvals` is open
  to anyone and shows every pending request globally. A real system authenticates the user, derives
  the manager↔reports graph, guards the manager route, and scopes the queue to direct reports.
- **Richer approval workflow.** One approver, no justification field, no edit. Production needs a
  decision reason/comment, multi-level chains, delegation when an approver is away, edit of a
  pending request (vs. cancel-and-refile), and cancellation of an already-approved absence that
  returns the days.

### Tier 3 — platform & polish

- **Durable persistence.** The mock HCM is in-memory and resets on reload — correct for this
  harness, but the largest step toward a real backend.
- **Notifications** (manager alerted on a new pending; employee on a decision), a **team calendar**
  beyond the current overlap warning, an **audit trail** of state transitions, **pagination** for
  large request histories, and **i18n / timezone / locale** for a genuinely per-location product.

These are tracked here rather than half-built: each one is small in isolation but would dilute the
clarity of the reconciliation story the brief actually asks us to prove.
