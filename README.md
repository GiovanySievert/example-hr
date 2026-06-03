# ExampleHR

Aplicação de exemplo construída com a seguinte stack:

| Área | Tecnologia |
|------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Linguagem | TypeScript |
| Estilo | [Tailwind CSS v4](https://tailwindcss.com/) |
| Estado global | [Jotai](https://jotai.org/) |
| Data fetching | [TanStack React Query v5](https://tanstack.com/query) |
| Documentação de componentes | [Storybook 10](https://storybook.js.org/) |
| Testes | [Vitest](https://vitest.dev/) + React Testing Library |
| Stories como testes | `@storybook/addon-vitest` (browser mode via Playwright) |
| Mock de API | [MSW](https://mswjs.io/) (testes, Storybook e browser dev) |

## Começando

```bash
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build de produção |
| `npm run lint` | ESLint |
| `npm run storybook` | Storybook em http://localhost:6006 |
| `npm run build-storybook` | Build estático do Storybook |
| `npm test` | Vitest em watch (unit + stories) |
| `npm run test:run` | Vitest single-run (unit + stories no browser mode) |
| `npm run test:unit` | Apenas os testes unitários (jsdom) |

## Estrutura

```
src/
  app/
    layout.tsx        # envolve a árvore com <Providers>
    providers.tsx     # React Query + Jotai + Devtools (Client Component)
    page.tsx
  components/
    button.tsx
    button.stories.tsx
  lib/
    query-client.ts   # factory do QueryClient
    store.ts          # átomos Jotai
  mocks/
    handlers.ts       # handlers MSW compartilhados
    server.ts         # MSW para Node (Vitest)
    browser.ts        # MSW para o navegador (dev)
.storybook/           # config do Storybook (MSW + Tailwind)
vitest.config.ts      # projetos "unit" (jsdom) e "storybook" (browser)
vitest.setup.ts       # RTL matchers + MSW server
public/mockServiceWorker.js  # worker MSW (gerado)
```

## Mocks de API (MSW)

Os handlers ficam em [`src/mocks/handlers.ts`](src/mocks/handlers.ts) e são reaproveitados
em três ambientes:

- **Testes** — `src/mocks/server.ts` é iniciado em `vitest.setup.ts`.
- **Storybook** — inicializado em `.storybook/preview.tsx`; sobrescreva por story via
  `parameters.msw.handlers`.
- **Browser (dev)** — `src/mocks/browser.ts` + `public/mockServiceWorker.js`. O worker já
  está pronto, mas **não é iniciado por padrão** — chame `worker.start()` quando precisar
  (por exemplo, atrás de uma flag em desenvolvimento).
