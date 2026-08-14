# EventFlow

## Required reading

Before architectural or dependency decisions, check `docs/prds/` (requirements) and `docs/adrs/` (accepted decisions). New ADRs go in `docs/adrs/`, numbered sequentially (`000N-title.md`); flag rather than silently deviate from an accepted one.

## Issue tracking

Issues live in GitHub's Issues tab (`gs00s/eventflow`), not local files. Every branch/PR/commit traces back to one.

## Git commits, branches, and PRs

All follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `chore`, `docs`, etc.), scoped to the issue id:

- **Branch**: `<type>/<issue-id>-<slug>`, e.g. `docs/1-record-stack-and-repo-structure-design-decisions`
- **PR title**: `<type>(<issue-id>): <description>`, e.g. `docs(1): record stack and repo structure design decisions`
- **Commit message**: same format as the PR title — the scope already identifies the issue, skip repeating it in the body

Never add a `Co-Authored-By: Claude` trailer, or any other self-attribution, to commit messages.

## Engineering principles

- **Official docs first.** Implement a new technology or library the way its official docs show, not from memory or blog-post patterns. Check current docs before wiring something in.
- **Minimalism.** Fewer moving parts, less code. Smallest solution that satisfies the requirement, not the most "complete" one — no abstraction, config, or dependency the current scope doesn't need.
- **Latest versions.** Always the latest stable language/runtime/package version — update the environment rather than pin to an older one to dodge a local mismatch.
- **No unnecessary comments.** Default to none. Only add one when the WHY is non-obvious (a hidden constraint, a workaround, invisible default behavior) — never to restate what the code/config already says.
- **Never read `process.env` outside `src/env.ts`.** One Zod schema, consumed via `env.X` elsewhere. Validates lazily (`Proxy`, not eager `.parse()`) — decorator-metadata forces DI classes like `DbService` into real imports, so eager validation would crash unit tests that never construct one. Exception: test setup that _writes_ `process.env.X` for `env.ts` to read (e.g. `testcontainers-setup-file.ts`).

## Backend layering

`Controller → Service → Repository → DbService`, per resource:

- **Repository** — only layer touching Drizzle/the database, returns raw rows.
- **Service** — owns DTO transformation. Never return raw database models from an endpoint, even when the mapping is 1:1. Real business logic (filtering, computed fields, validation) lives here too.
- **Controller** — thin, delegates to the service.

## Testing conventions

**File conventions**: co-locate specs with the code they test — no `test/`/`__tests__/` directories, even for integration tests. `.spec.` everywhere, never `.test.`.

**Test body shape**: Arrange / Act / Assert, separated by blank lines, no comment labels. Capture the act phase's result in a variable and assert on that, rather than chaining off the call — unless there's genuinely nothing to separate (e.g. `expect(fn()).toThrow()`).

**Layering & mocking**:

- **Repositories are integration-tested only.** A passthrough like `return db.select().from(table)` has no logic to unit-test — mocking Drizzle's builder just echoes the mock back. Real Postgres (Testcontainers) covers it.
- **Services and controllers are unit-tested by spying on the repository, never the service.** Spying one layer lower means a controller test also exercises the real service logic — only DB I/O is ever faked.
- **Build via `Test.createTestingModule({ imports: [ResourceModule] })`**, never `new ClassUnderTest(...)` or manually re-listing providers — `module.get()` reaches every provider in the compiled graph, exported or not. `vi.spyOn(module.get(ResourceRepository), 'method')`, then `module.get()` whatever's under test.
- **Pair unit coverage with one integration test per resource** covering the happy path end-to-end (real DB, repository, service, controller).

**Integration test infrastructure**:

- **Unit tests load env vars from `apps/api/.env.test`** (via `vitest.setup.ts` → `setupFiles`), not the shell or the real `.env` — fake-but-valid values, just enough to satisfy `env.ts`'s Zod check when `DbService` is constructed; no query ever runs.
- **Integration files share one Testcontainers Postgres** (`globalSetup`) and run sequentially (`fileParallelism: false`) — random PKs (`defaultRandom()`) mean `onConflictDoNothing()` won't dedupe across files, so each spec clears its own table(s) in `beforeAll`.
