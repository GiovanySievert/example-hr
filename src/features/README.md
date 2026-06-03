# Features

Each feature is an isolated folder grouping everything related to a business domain.

## Anatomy

```
src/features/<feature>/
  components/   # feature-specific components (with their stories)
  hooks/        # feature hooks (e.g. React Query useXxxQuery / useXxxMutation)
  api/          # data access / HTTP calls for the feature
  index.ts      # barrel: exposes the feature's public API
```

## Conventions

- Import across layers via the `@/features/<feature>` and `@/shared/...` aliases.
- Keep anything reusable across features in [`src/shared`](../shared).
- A feature must not import another feature's internal files — use its `index.ts`.
