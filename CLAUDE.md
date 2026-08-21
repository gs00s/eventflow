# EventFlow

## Required reading

Check `docs/prds/` (requirements) and `docs/adrs/` (accepted decisions) before architectural/dependency choices. New ADRs: `docs/adrs/000N-title.md`, sequential; flag rather than silently deviate from an accepted one.

## Issue tracking

Issues live in GitHub's Issues tab (`gs00s/eventflow`), not local files. Every branch/PR/commit traces back to one.

## Git commits, branches, and PRs

[Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `chore`, `docs`, etc.), scoped to the issue id:

- **Branch**: `<type>/<issue-id>-<slug>`, e.g. `docs/1-record-stack-and-repo-structure-design-decisions`
- **PR title**: `<type>(<issue-id>): <description>`, e.g. `docs(1): record stack and repo structure design decisions`
- **Commit message**: same format as the PR title — the scope already identifies the issue, skip repeating it in the body

Never add a `Co-Authored-By: Claude` trailer or other self-attribution.

**Always ask for explicit permission before**: `git commit`, creating a GitHub issue, opening a PR, or merging a PR. Never do these automatically as part of a larger task — surface the change and wait for a yes.

## Writing style (issues, PRs, commits, docs)

- Match length to information, not habit.
- One fact per sentence. Active voice, imperative mode.
- Zero filler, zero hedging.
- Cut anything visible elsewhere (the diff, the linked issue, the code).
- Lists over prose for 2+ items.
- Delete any sentence that, if removed, loses no fact.

## Engineering principles

- **Official docs first** — implement new tech/libraries the way their docs show, not from memory or blog patterns; check current docs before wiring something in.
- **Minimalism** — smallest solution that satisfies the requirement, not the most "complete" one; no abstraction, config, or dependency the current scope doesn't need.
- **Latest versions** — latest stable language/runtime/package version; update the environment rather than pin old to dodge a local mismatch.
- **No unnecessary comments** — default to none; only when the WHY is non-obvious (hidden constraint, workaround, invisible default), never to restate the code. One concise line, not a block.
- **Never read `process.env` outside `src/env.ts`** — one Zod schema, consumed via `env.X` elsewhere. Validates lazily (`Proxy`, not eager `.parse()`) — decorator metadata forces DI classes like `DbService` into real imports, so eager validation would crash unit tests that never construct one. Exception: test setup that _writes_ `process.env.X` for `env.ts` to read (e.g. `testcontainers-setup-file.ts`).

## Backend layering

`Controller → Service → Repository → DbService`, per resource:

- **Repository** — only layer touching Drizzle/the database, returns raw rows.
- **Service** — owns DTO transformation (never return raw DB models, even 1:1) and real business logic (filtering, computed fields, validation).
- **Controller** — thin, delegates to the service.

## Frontend layering

`apps/web/src` organized by domain — `auth/`, `events/`, `speakers/`, `users/`:

- Each domain owns its `*.page.tsx` routes and a `components/` folder; `events/` also owns `layout/`, the registry-driven renderer for the PRD's recursive layout tree (`Section`, `Heading`, `Paragraph`, `SessionSchedule`/`SessionCard`, `SpeakerList`/`SpeakerCard`).
- Cross-cutting: top-level `components/` (`Nav`, `RootLayout`, shadcn `ui/`) and `lib/` (`api.ts`, `auth-client.ts`, `utils.ts`) — the only things a domain may import beyond its own subtree.
- No cross-domain imports between `events/`, `speakers/`, `auth/`, `users/`.

## Database migrations

Generate with an explicit name (`drizzle-kit generate --name=<snake_case_description>`, e.g. `create_speakers_table`) — never accept drizzle-kit's random default (`0000_cloudy_oracle.sql`); the name is the only human-readable trace of what a migration does.

## Testing conventions

Co-locate specs with the code they test, `.spec.` everywhere (never `.test.`), no `test/`/`__tests__/` dirs. Bodies follow Arrange / Act / Assert, blank-line separated, no comment labels; capture the act result in a variable and assert on that rather than chaining off the call, unless there's nothing to separate (e.g. `expect(fn()).toThrow()`).

**Backend layering & mocking**:

- **Repositories are integration-tested only** — a passthrough like `return db.select().from(table)` has no logic to unit-test; real Postgres (Testcontainers) covers it.
- **Services/controllers are unit-tested by spying on the repository, never the service** — spying one layer lower means a controller test also exercises real service logic.
- **Build via `Test.createTestingModule({ imports: [ResourceModule] })`**, never `new ClassUnderTest(...)` — `module.get()` reaches every provider in the compiled graph. `vi.spyOn(module.get(ResourceRepository), 'method')`, then `module.get()` whatever's under test.
- **Pair unit coverage with one integration test per resource**, happy path end-to-end.

**Integration infrastructure**: unit tests load env from `apps/api/.env.test` (fake-but-valid, just enough for `env.ts`'s Zod check — no query ever runs). Integration files share one Testcontainers Postgres (`globalSetup`), run sequentially (`fileParallelism: false`) — random PKs mean `onConflictDoNothing()` won't dedupe across files, so each spec clears its own table(s) in `beforeAll`.

**Frontend (`apps/web`)**: default is integration-style — real router + real TanStack Query (`setupRouterTest()`/`renderApp()`), mocking only the HTTP boundary with MSW; never mock a hook, child component, or `authClient` directly. Isolated `render()` unit tests only for pure prop/callback-driven "dumb" components with no data-fetching or router dependency (e.g. `LoginForm`/`RegisterForm`).
