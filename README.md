# EventFlow

A backend-leaning full-stack system for EventFlow: template-driven event pages built from nested, reusable layout components, served to multiple frontends, with username/password auth and VIP-gated event access.

Requirements: [`docs/prds/`](docs/prds/). Architecture/stack rationale: [`docs/adrs/`](docs/adrs/) — this README summarizes those decisions; the ADRs have the full "why," including alternatives considered.

## Local runbook

### Prerequisites

- Node `24.19.0` — `.nvmrc` is checked in; run `nvm use`
- pnpm `11.21.0` via Corepack — `corepack enable && corepack prepare pnpm@11.21.0 --activate` (or just run `pnpm install`, the `packageManager` field in `package.json` pins the version for you)

### Install

```sh
pnpm install
```

### Database

```sh
docker compose up -d          # local Postgres (postgres:18-alpine)
cp apps/api/.env.example apps/api/.env
cd apps/api
pnpm db:migrate               # create tables
pnpm db:seed                  # seed from docs/prds/speakers.mock.json
```

Seeding also creates two demo accounts (idempotent — safe to re-run):

| Email              | Password       | Role                                     |
| ------------------ | -------------- | ---------------------------------------- |
| `demo@example.com` | `password1234` | Regular member — sees only public events |
| `vip@example.com`  | `password1234` | VIP member — also sees VIP-gated events  |

### Run

```sh
pnpm dev
```

Starts both apps in parallel via Turborepo:

- **API** — NestJS on Express, http://localhost:9000
- **Web** — Vite dev server, http://localhost:7000, proxying `/api` to the API (mirrors the Firebase Hosting → Cloud Run rewrite used in production)

Verify: `curl http://localhost:7000/api/speakers`

### Scripts

Run from the repo root, orchestrated across both apps via Turborepo:

| Command                  | Does                                                  |
| ------------------------ | ----------------------------------------------------- |
| `pnpm build`             | Build both apps                                       |
| `pnpm lint`              | `oxlint` (+ type-aware rules on `apps/api`)           |
| `pnpm typecheck`         | `tsc` across all packages                             |
| `pnpm test:unit`         | `vitest run` — no database required                   |
| `pnpm test:integration`  | `vitest run` against real Postgres via Testcontainers |
| `pnpm fmt` / `fmt:check` | Format the repo with Oxfmt / check without writing    |

`apps/api`-only: `pnpm db:generate` (new migration from schema changes), `pnpm db:migrate`, `pnpm db:seed`.

### Current state

- Events, layouts, and registration (the PRD's core deliverable) are implemented: `GET /events`(`/:id`) serve public event data with the recursive Section/Heading/Paragraph/SessionSchedule/SpeakerList layout tree; `GET /events/vip`(`/:id`) serve the same, VIP-inclusive, gated to signed-in VIP users ([ADR 0003](docs/adrs/0003-viewer-scoped-data-endpoint-split.md)); `POST`/`DELETE`/`GET /events/:id/register` cover registration.
- Auth (`/api/auth/sign-up/email`, `/sign-in/email`, `/sign-out`) is handled by Better Auth directly; `GET /api/users/me` is the one hand-written endpoint.
- `apps/web`'s homepage lists current events (viewer-scoped as above), each linking to a detail page with its rendered layout tree and a register/unregister control, plus a `/speakers` page and `/login`, `/register`, `/profile` (guarded) pages.
- Integration tests spin up their own ephemeral Postgres via Testcontainers, independent of the `docker-compose` instance used for `pnpm dev`.
- Event editing by organizer account (the PRD's optional requirement) is not implemented.

## Technology decisions

### Backend

| Choice                                                                                                                                                                                                  | Why                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js + [TypeScript](https://www.typescriptlang.org/docs/)                                                                                                                                            | Type-safety across the stack                                                                                                         |
| [NestJS](https://docs.nestjs.com/) on the [Express](https://expressjs.com/) adapter                                                                                                                     | Modules/DI/Guards for demonstrable structure and VIP-gating; Express because Better Auth's NestJS integration targets it as primary  |
| [Drizzle ORM](https://orm.drizzle.team/docs/overview) + [PostgreSQL](https://www.postgresql.org/docs/current/)                                                                                          | Relational data with JSONB for the recursive layout tree; [`drizzle-kit`](https://orm.drizzle.team/docs/kit-overview) for migrations |
| [Zod](https://zod.dev)                                                                                                                                                                                  | Recursive validation of the JSONB layout tree at the route boundary — same library used everywhere else (`env.ts`, seed scripts)     |
| [Better Auth](https://www.better-auth.com/docs/integrations/nestjs) (`emailAndPassword` provider only) via [`@thallesp/nestjs-better-auth`](https://www.npmjs.com/package/@thallesp/nestjs-better-auth) | Self-hosted, own-Postgres auth library (username/password only, no social login, per PRD) with schema-gen and client-SDK convenience |
| [`helmet`](https://helmetjs.github.io/) + Better Auth's built-in [rate limiter](https://www.better-auth.com/docs/concepts/rate-limit)                                                                   | Standard Express security headers, plus throttling on `/sign-in/email` to blunt brute-force credential guessing                      |

### Frontend

| Choice                                                                                                   | Why                                                                                                |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Vite](https://vite.dev/guide/) + [React](https://react.dev/learn) + TypeScript                          | Minimal tooling for a single-purpose UI                                                            |
| [Tailwind CSS](https://tailwindcss.com/docs) + [shadcn/ui](https://ui.shadcn.com/docs)                   | Accessible, Base UI-based components (shadcn's current default) without custom design-system work  |
| [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)                        | Server state/data-fetching with real mutation support (login, registration)                        |
| [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/quick-start)                   | Fully type-safe routing, same vendor/philosophy as Query; route `beforeLoad` guards for auth pages |
| [TanStack Form](https://tanstack.com/form/latest/docs/framework/react/overview) + [Zod](https://zod.dev) | Same vendor/philosophy as Query/Router; client-side validation shared with `packages/shared-types` |
| [Better Auth React client](https://www.better-auth.com/docs/integrations/react)                          | Session state (`useSession`, `getSession`) owned by Better Auth's own client — no parallel store   |

### Repo & tooling

| Choice                                                                                                                                                      | Why                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [pnpm workspaces](https://pnpm.io/workspaces) + [Turborepo](https://turborepo.dev/docs)                                                                     | Monorepo (`apps/api`, `apps/web`, `packages/shared-types`) with strict dependency resolution and task orchestration                            |
| [Vitest](https://vitest.dev/guide/) + [unplugin-swc](https://github.com/unplugin/unplugin-swc)                                                              | One test runner for both apps; `unplugin-swc` fixes Nest's decorator-metadata DI resolution under Vite's esbuild transform                     |
| [oxlint](https://oxc.rs/docs/guide/usage/linter) + [tsgolint](https://github.com/oxc-project/tsgolint) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) | Type-aware linting (incl. `no-floating-promises`) at ~10x ESLint's speed, single Rust toolchain for lint + format                              |
| [Testcontainers](https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/) (`@testcontainers/postgresql`)                          | Ephemeral Postgres spun up once per test run (Vitest `globalSetup`) — same code path locally and in CI, no docker-compose dependency for tests |
| [GitHub Actions](https://docs.github.com/en/actions)                                                                                                        | `typecheck`/`lint`/`fmt:check`/`test:unit`/`test:integration`/`build` on pull requests; no deploy step or `main`-branch job yet                |
| [Docker Compose](https://docs.docker.com/compose/)                                                                                                          | Local Postgres for interactive `pnpm dev` (not used by tests)                                                                                  |

## Key decisions & trade-offs

Full decision records, including alternatives ruled out, live in `docs/adrs/`:

- [0001 — Stack and repo structure](docs/adrs/0001-stack-and-repo-structure.md): NestJS/Drizzle/Postgres, module boundaries, testing/lint/CI setup (ruled out: Prisma, MongoDB, SQLite, Next.js, auth-as-a-service, ESLint/Prettier, Biome, SWR, React Router, and more)
- [0002 — Authentication](docs/adrs/0002-authentication.md): Better Auth over hand-rolled Passport, and the resulting Fastify→Express switch
- [0003 — Viewer-scoped data endpoint split](docs/adrs/0003-viewer-scoped-data-endpoint-split.md): VIP-gated data gets its own URL (`/events/vip`) rather than one endpoint with conditional caching, so gated content can never leak into a shared cache

## Suggestions for future improvement

_(To be filled in as the implementation surfaces real trade-offs — e.g. adjacency-list layout storage if querying individual components becomes necessary, request logging/observability, deploy target.)_
