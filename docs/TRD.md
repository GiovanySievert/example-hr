# TRD — Time-Off (ExampleHR)

> Technical Requirements Document. Written first to lock the hard decisions before
> any code. The end-of-project review may revise sections, but the contracts and the
> reconciliation strategy below are the source of truth for the implementation.

## 1. Problem & context

ExampleHR lets employees view their time-off balances and file requests, and lets
managers approve or deny those requests. **ExampleHR is not the source of truth (SoT)
for balances.** The SoT lives in an external HCM system (think Workday / SAP). ExampleHR
only *presents* and *orchestrates*.

This split creates the central tension of the feature:

- **Fast**: the UI must feel instant. An employee filing a request should see the effect
  immediately, not after a slow round-trip to the HCM.
- **Correct**: the number on screen must eventually match the HCM, and the app must never
  show a state that the HCM contradicts in a way that misleads the user — most importantly
  it must **never** show a request as `approved` and then silently flip it to `denied`.

We resolve this with **optimistic update + authoritative re-read + reconcile**: act fast,
then verify against the SoT, and recover *honestly* when the SoT disagrees.

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
4. **Manager** — `GET /api/hcm/requests`, `POST /api/hcm/requests/:id/approve`,
   `POST /api/hcm/requests/:id/deny`.

### Behaviours the mock must reproduce

- **Anniversary / start-of-year bonus** that fires on a timer/trigger and changes a balance
  **while the app is open** (the "refresh underneath you" problem).
- **Silent failures**: 200 OK with a wrong value.
- **Conflict / insufficient-balance** rejections.
- **Variable latency**.

### Personas

- **Employee** — sees balance, submits a request. *Invariant*: never sees a request go
  `approved → denied`. A request the user perceives as accepted must not later silently flip.
- **Manager** — approves/denies against the **balance that is valid at the moment of the
  decision** (re-read on open / on action), and is blocked from deciding on obviously stale data.

## 2. Challenges (from the brief)

| # | Challenge | Where it bites |
|---|-----------|----------------|
| C1 | Balance refreshes **underneath** an open session (bonus trigger) | reconcile vs in-flight mutation |
| C2 | Per-cell read is the **authoritative** truth for a cell | post-write re-read, manager decision |
| C3 | Batch corpus is **expensive** | can't poll it tightly; used for hydration + periodic reconcile |
| C4 | **Silent failures** (200 but wrong) | success path must still verify |
| C5 | **Conflicts / insufficient balance** | optimistic apply must be reversible |
| C6 | **Per-employee / per-location** cells | cache keyed by cell, many rows per employee |

## 3. Proposed solution

### Data layer = React Query, keyed by cell and by corpus

- **Per-cell query key**: `['balance', employeeId, locationId]`. Authoritative truth for one cell.
- **Corpus query key**: `['balances']`. Hydration + background reconcile source.
- Manager: `['requests']` for the pending queue.

### Write path = optimistic mutation with rollback + authoritative re-read

`useFileTimeOff()`:

1. **onMutate** — snapshot the current cell, apply the optimistic delta (`available -= days`,
   `pending += days`), mark the cell as **in-flight** (Jotai), cancel outgoing cell queries.
2. **onError** — roll the cell back to the snapshot, toast the reason (conflict /
   insufficient / network).
3. **onSuccess** — perform an **authoritative per-cell re-read** (C2). Then **detect
   silent-wrong** (C4): if the re-read contradicts what a coherent success should look like
   (e.g. the server claims success but the authoritative balance didn't move, or moved
   incoherently), treat it as a **recoverable failure** — roll the optimistic state back to
   the authoritative value and toast an explanation. This is the honest-recovery path: we
   never leave the user believing a state the SoT contradicts.
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

- Opening / acting on a request triggers an **authoritative re-read of the relevant cell**
  (C2), so the decision is made against the balance valid *at that moment*.
- Approve/deny is blocked when the cell is obviously stale (version moved since the queue was
  loaded) — the manager is asked to re-read before deciding, preventing a decision on a value
  the SoT has already changed.

## 4. Alternatives analysed

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

## 5. Component tree → concerns

```
(employee)/time-off                         Employee view
  TimeOffPage
    BalanceCard / BalanceCell      → C2/C6: per-cell authoritative balance, stale/refreshed badge
    TimeOffRequestForm             → write path: location + days, client-side validation
    RequestStatusList              → honest status; recoverable rollback item, never approved→denied

(manager)/approvals                         Manager view
  ApprovalsPage
    PendingRequestList
      PendingRequestRow            → C2: balance context re-read at decision time
        approve / deny             → blocked on obviously-stale cell (C1/C5)
```

Shared UI ephemeral state (set of in-flight cells, stale/refreshed banners) lives in **Jotai**;
all server state lives in **React Query**.

## 6. Test strategy

What each layer protects, and why:

- **Mock HCM integration tests (Vitest, unit project, against MSW handlers)** — protect the
  *contract and the branches*: success, conflict, insufficient-balance, silent-wrong, variable
  latency, and bonus-applied. If these drift, every layer above is testing a fiction.
- **Hook tests (`renderHook` + MSW)** — protect the *reconciliation logic*: optimistic apply,
  rollback on conflict/insufficient, silent-wrong detection on the success path, and reconcile
  that respects an in-flight mutation. This is where the hard decisions in §4 are enforced.
- **Storybook component stories** — protect *every visual state* in isolation, including the
  uncomfortable ones (rolled-back, hcm-rejected, silently-wrong, refreshed-mid-session).
- **Storybook interaction tests (play functions, addon-vitest)** — protect the *user-visible
  flows* end to end against the mock: submit → optimistic → rollback; manager approving with a
  changed balance; bonus applied mid-session reconciling the UI.

### States to cover explicitly

Employee view: `loading`, `empty`, `stale`, `optimistic-pending`, `optimistic-rolled-back`,
`hcm-rejected` (conflict / insufficient), `hcm-silently-wrong`, `balance-refreshed-mid-session`.

Manager view: `empty`, `pending-balance-ok`, `pending-balance-insufficient`,
`balance-changed-between-open-and-approve` (conflict on approve), `approval-success`, `denial`.

Coverage is gated on the data-layer hooks and the mock HCM branches (FASE 5); the report is
documented in the README.
```
