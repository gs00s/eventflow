# EventFlow

A backend-leaning full-stack system for EventFlow: template-driven event pages built from nested, reusable layout components, served to multiple frontends, with username/password auth and VIP-gated event access.

Requirements are in [`docs/prds/`](docs/prds/). Architecture and stack rationale are recorded as ADRs in [`docs/adrs/`](docs/adrs/), starting with [`0001-stack-and-repo-structure.md`](docs/adrs/0001-stack-and-repo-structure.md) — this README summarizes those decisions with links to current docs; the ADR has the full "why," including alternatives considered.

## Local runbook

### Prerequisites

- Node `24.19.0` — `.nvmrc` is checked in; run `nvm use`
- pnpm `11.21.0` via Corepack — `corepack enable && corepack prepare pnpm@11.21.0 --activate` (or just run `pnpm install`, the `packageManager` field in `package.json` pins the version for you)

### Install

```sh
pnpm install
```

### Run

```sh
pnpm dev
```

Starts both apps in parallel via Turborepo:

- **API** — NestJS on Fastify, http://localhost:3000
- **Web** — Vite dev server, http://localhost:5173

Verify the API:

```sh
curl http://localhost:3000/speakers
```

### Scripts

Run from the repo root, orchestrated across both apps via Turborepo:

| Command          | Does                                        |
| ---------------- | ------------------------------------------- |
| `pnpm build`     | Build both apps                             |
| `pnpm lint`      | `oxlint` (+ type-aware rules on `apps/api`) |
| `pnpm typecheck` | `tsc` across all packages                   |
| `pnpm test`      | `vitest run` across all packages            |
| `pnpm fmt`       | Format the repo with Oxfmt                  |
| `pnpm fmt:check` | Check formatting without writing            |

### Current state

- No database yet — `GET /speakers` returns a hardcoded response from `apps/api/src/speakers`. Postgres/Drizzle setup is a separate, later step.
- `apps/web` has a home page, a top nav, and a `/speakers` page listing names fetched live from the API.

## Technology decisions

### Backend

| Choice                                                                                                                                                                                                                                                                                                  | Why                                                                                                                                  | Docs                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Node.js + TypeScript                                                                                                                                                                                                                                                                                    | Type-safety across the stack                                                                                                         | [TypeScript](https://www.typescriptlang.org/docs/)                     |
| [NestJS](https://docs.nestjs.com/) on the [Fastify](https://fastify.dev/docs/latest/) adapter                                                                                                                                                                                                           | Modules/DI/Guards for demonstrable structure and VIP-gating, on Fastify's lightweight core + native schema validation                | [NestJS + Fastify](https://docs.nestjs.com/techniques/performance)     |
| [Drizzle ORM](https://orm.drizzle.team/docs/overview) + [PostgreSQL](https://www.postgresql.org/docs/current/)                                                                                                                                                                                          | Relational data with JSONB for the recursive layout tree; [`drizzle-kit`](https://orm.drizzle.team/docs/kit-overview) for migrations | [Get started](https://orm.drizzle.team/docs/get-started)               |
| [Passport](https://www.passportjs.org/) ([passport-local](https://www.passportjs.org/packages/passport-local/), [passport-jwt](https://www.passportjs.org/packages/passport-jwt/)) + [@nestjs/jwt](https://docs.nestjs.com/security/authentication) + [argon2](https://github.com/ranisalt/node-argon2) | Idiomatic Nest auth pattern, hand-rolled (username/password only, no third-party auth, per PRD)                                      | [Nest Authentication](https://docs.nestjs.com/security/authentication) |

### Frontend

| Choice                                                                                 | Why                                                                                               | Docs                                                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Vite](https://vite.dev/guide/) + [React](https://react.dev/) + TypeScript             | Minimal tooling for a single-purpose UI                                                           | [Vite](https://vite.dev/guide/) · [React](https://react.dev/learn)                                           |
| [Tailwind CSS](https://tailwindcss.com/docs) + [shadcn/ui](https://ui.shadcn.com/docs) | Accessible, Base UI-based components (shadcn's current default) without custom design-system work | [Tailwind](https://tailwindcss.com/docs/installation) · [shadcn/ui](https://ui.shadcn.com/docs/installation) |
| [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)      | Server state/data-fetching with real mutation support (login, registration, optional org-edit)    | [Overview](https://tanstack.com/query/latest/docs/framework/react/overview)                                  |
| [TanStack Router](https://tanstack.com/router/latest/docs/framework/react/overview)    | Fully type-safe routing, same vendor/philosophy as Query                                          | [Quick Start](https://tanstack.com/router/latest/docs/framework/react/quick-start)                           |
| [Zustand](https://zustand.docs.pmnd.rs/)                                               | Minimal client state (auth token, VIP flag)                                                       | [Getting started](https://zustand.docs.pmnd.rs/getting-started/introduction)                                 |

### Repo & tooling

| Choice                                                                                                                                                      | Why                                                                                                                        | Docs                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [pnpm](https://pnpm.io/) workspaces + [Turborepo](https://turborepo.dev/docs)                                                                               | Monorepo (`apps/api`, `apps/web`, `packages/shared-types`) with strict dependency resolution and task orchestration        | [pnpm workspaces](https://pnpm.io/workspaces) · [Turborepo](https://turborepo.dev/docs)                                         |
| [Vitest](https://vitest.dev/) + [unplugin-swc](https://github.com/unplugin/unplugin-swc)                                                                    | One test runner for both apps; `unplugin-swc` fixes Nest's decorator-metadata DI resolution under Vite's esbuild transform | [Vitest guide](https://vitest.dev/guide/)                                                                                       |
| [oxlint](https://oxc.rs/docs/guide/usage/linter) + [tsgolint](https://github.com/oxc-project/tsgolint) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) | Type-aware linting (incl. `no-floating-promises`) at ~10x ESLint's speed, single Rust toolchain for lint + format          | [Oxlint](https://oxc.rs/docs/guide/usage/linter) · [Type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html) |
| [GitHub Actions](https://docs.github.com/en/actions)                                                                                                        | `typecheck`/`lint`/`fmt:check`/`test` on pull requests; no build/deploy step or `main`-branch job yet                      | [GitHub Actions docs](https://docs.github.com/en/actions)                                                                       |
| [Docker Compose](https://docs.docker.com/compose/)                                                                                                          | Local Postgres for `docker-compose up` + `pnpm dev`                                                                        | [Compose docs](https://docs.docker.com/compose/)                                                                                |

## Key decisions & trade-offs

See [`docs/adrs/0001-stack-and-repo-structure.md`](docs/adrs/0001-stack-and-repo-structure.md) for the full decision record, including what was ruled out and why (Prisma, MongoDB, SQLite, Next.js, auth-as-a-service, ESLint/Prettier, Biome, SWR, React Router, and more).

## Suggestions for future improvement

_(To be filled in as the implementation surfaces real trade-offs — e.g. JWT revocation strategy, adjacency-list layout storage if querying individual components becomes necessary, deploy target.)_
