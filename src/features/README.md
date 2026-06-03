# Features

Cada feature é uma pasta isolada que agrupa tudo relacionado a um domínio de negócio.

## Anatomia

```
src/features/<feature>/
  components/   # componentes específicos da feature (com suas stories)
  hooks/        # hooks da feature (ex.: React Query useXxxQuery / useXxxMutation)
  api/          # acesso a dados / chamadas HTTP da feature
  index.ts      # barrel: expõe a API pública da feature
```

## Convenções

- Importe entre camadas via alias `@/features/<feature>` e `@/shared/...`.
- Mantenha o que é reutilizável entre features em [`src/shared`](../shared).
- Uma feature não deve importar arquivos internos de outra feature — use o `index.ts`.
