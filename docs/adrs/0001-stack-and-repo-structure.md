# ADR 0001: Stack and Repo Structure

## Status
Accepted

## Context
EventFlow (Snapsoft take-home) requires a backend serving flexible, template-driven event pages (recursive layout components) to multiple frontends, with username/password auth and VIP-gated events. Goal: showcase backend-leaning best practices in the submission.

## Decision

**Runtime**: Node.js + TypeScript — matches existing scaffolding, gives a type-safety story for the README.

**Backend framework**: NestJS on the Fastify adapter (`@nestjs/platform-fastify`). Nest's modules/DI/Guards give a demonstrable structure (VIP-gating via Guards, testable services via DI) without giving up Fastify's lightweight core and native JSON-Schema/AJV validation, which fits the recursive layout tree well.

**ORM / DB**: Drizzle + PostgreSQL. Relational tables for `users`/`events`/`speakers`/`sessions`/`registrations`; the recursive layout tree stored as a single **JSONB** column, validated at the route boundary via AJV. `drizzle-kit` for migrations.

**Auth**: Hand-rolled on Passport (`passport-local` + `passport-jwt`) + `@nestjs/jwt` + `argon2`. Idiomatic Nest pattern, stateless JWT (role/sub trusted from payload — no revocation without re-issuing/blocklist). Building auth is part of what's graded, so no auth-as-a-service library.

**Frontend**: Vite + React + TS — thin, matches the "basic UI" scope (single event-listing page). Styling via **Tailwind CSS + shadcn/ui** (Radix-based, accessible, no custom design-system work needed at this scope). **TanStack Query** for server state/data fetching (`GET /events`, `GET /events/:id`, `POST /auth/login`), typed against `packages/shared-types` — the app has real mutations (login, registration, optional org-edit), not just reads, and Query's mutation support is more fleshed-out than the alternatives. **TanStack Router** for routing (home/event-detail/login) — fully type-safe route params, same vendor/philosophy as Query. **Zustand** for the small slice of client state (auth token, VIP flag) shared between the login form and event views — pairs with TanStack Query as the current standard split of server vs. client state, far less boilerplate than Redux at this scope.

**Repo structure**: Monorepo, pnpm workspaces + Turborepo.
```
apps/api/src/{users (auth+users), events (events+layouts+registrations), speakers, db}
apps/web/
packages/shared-types/   # DTOs shared between api and web
docker-compose.yml       # local Postgres
```
Backend stays framework-agnostic toward its consumers (PRD: "serve multiple frontends"), `shared-types` keeps `apps/web` honest against the API's actual contract.

**Module boundaries**: `users` (auth+users, one table, tightly coupled). `events` (events+layouts+registrations, one aggregate — everything an event owns). `speakers` standalone.

**Testing**: Vitest everywhere (`unplugin-swc` wired into `apps/api` to fix Nest's `emitDecoratorMetadata`-dependent DI under esbuild). Unit tests (services/guards, Drizzle mocked) + integration tests (`test/integration`, real Postgres via docker-compose) for signup→login→VIP-access and registration flows.

**Lint/format**: oxlint + tsgolint (type-aware rules, incl. `no-floating-promises` — matters in an async-heavy Nest+Drizzle codebase) + Oxfmt. ~10x faster than ESLint+typescript-eslint at near-parity rule coverage.

**CI/CD**: GitHub Actions only, no deploy (out of scope for now).
- `pull_request`: lint → typecheck → test (`vitest run --coverage`) → build — required checks.
- `push` to `main`: build only (post-merge sanity check).

## Alternatives Considered

- **Fastify without Nest** (manual layering) — less demonstrable structure for VIP-gating/testability than Nest's Guards/DI.
- **Prisma** — ruled out for verbose/non-SQL-native syntax and slower joins vs Drizzle.
- **Adjacency-list rows for the layout tree** — fully relational but needs recursive CTEs to reassemble the tree; more work than the scope justifies.
- **MongoDB** — natural fit for the nested layout doc, but weaker relational guarantees for events/users/registrations.
- **SQLite** — easiest to run, but weak JSON querying and not a "production-minded" default to defend in the README.
- **Auth-as-a-service (better-auth, Lucia, Auth0, etc.)** — PRD wants username/password only, no third-party auth, and building auth is graded.
- **Passport-free hand-rolled Guard only** — viable, but Passport is the idiomatic/recognizable Nest pattern.
- **One module for everything** (auth+users+events+layouts+registrations) — undercuts the module-boundary rationale for choosing Nest in the first place.
- **Next.js as a unifying frontend/backend framework** — PRD wants the backend to serve multiple frontends; coupling it to one meta-framework works against that.
- **Two separate repos** — more submission friction for a take-home than a monorepo.
- **Jest everywhere** — Vitest's native fit with Vite (shared config, `import.meta.env`, no parallel Babel pipeline) outweighs the one-time `unplugin-swc` cost on the backend.
- **ESLint + Prettier / Biome** — oxlint+tsgolint now covers 59/61 typescript-eslint type-aware rules (incl. `no-floating-promises`) at far higher speed; Biome's type-aware linting isn't yet on par.
- **CI + deploy** — no live target defined yet; deferred, not ruled out.
- **React Context for auth state** — viable at this scope, but Zustand's selector-based subscriptions avoid Context's coarser re-renders for near-zero extra cost.
- **SWR** — lighter than TanStack Query, but its mutation support is thinner; this app has real mutations (login/register/edit), not just reads.
- **Plain `fetch` + `useEffect`/`useState`** — zero dependencies, but every component hand-rolls loading/error/race-condition handling — the pattern React's own docs now steer away from.
- **React Router** — larger ecosystem/more familiar, but TanStack Router's type-safe route params are a concrete win given TanStack Query is already in the stack.
