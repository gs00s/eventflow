# Event Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors search events by name/description from a hero box on the landing page, landing on a `/search` results page that respects the app's existing VIP viewer-scoped split.

**Architecture:** Extend the existing `GET /events` and `GET /events/vip` endpoints with an optional `?q=` query param (case-insensitive substring match on `title`/`description` via Postgres `ILIKE`, backed by a `pg_trgm` GIN index) — no new backend routes, same DTO, same ADR-0003 split logic. On the frontend, a new presentational `EventSearchForm` component is reused in two places: a `Hero` section embedded on the existing landing page (`EventsPage`) that navigates to `/search?q=`, and a new `SearchPage` (registered as a `/search` TanStack Router route with a zod-validated search schema) that fetches from the VIP-aware endpoint based on the viewer's session and renders results with the existing `EventListItem`.

**Tech Stack:** NestJS + Drizzle ORM (Postgres) on the backend; React + TanStack Router/Query + `@tanstack/react-form` + zod on the frontend. Vitest everywhere (`.spec.ts(x)`), Testcontainers for backend integration tests, MSW for frontend integration tests.

**Spec:** GitHub issue [gs00s/eventflow#100](https://github.com/gs00s/eventflow/issues/100) — full requirements gathered via a grilling session; this plan implements that issue in full.

## Global Constraints

- Branch already created and checked out: `feat/100-event-search`. Conventional Commits scoped to the issue id: commit messages and any PR title use `<type>(100): <description>` — never repeat the scope in the body.
- No `Co-Authored-By: Claude` or other self-attribution in commits (project CLAUDE.md).
- **No new backend routes** — extend `GET /events` / `GET /events/vip` with `?q=`; ADR-0003's split (public route filters `isVip=false`, VIP route requires `session.user.isVip` and returns everything) stays exactly as-is, just with an extra optional filter.
- Matching is case-insensitive substring only (`ILIKE '%term%'`) against `title` and `description` — no full-text search, no ranking.
- **No pagination** anywhere in this feature (matches the existing, unpaginated events list).
- Reuse the existing `EventListItem` component for search results (same VIP badge treatment) — do not build a new result card.
- Hero and search-page search boxes are **submit-only** (Enter or button click) — no live/debounced search-as-you-type.
- Submit is disabled client-side whenever the trimmed query is empty.
- `/search` with a missing or empty `q` renders an in-page empty state ("enter a search term above") — it does **not** redirect to `/`.
- Testing conventions (project CLAUDE.md): co-located `.spec.ts(x)` files, Arrange/Act/Assert with a blank line between sections, capture the act result in a variable. Repositories are integration-tested only (Testcontainers, real Postgres) — no repository unit tests. Services/controllers are unit-tested by spying on the layer *below* them (controller tests spy on the repository, not the service), built via `Test.createTestingModule({ imports: [EventsModule] })` + `module.get(...)`. One integration test per resource for the happy path already exists (`events.integration.spec.ts`) — extend it, don't duplicate it. Frontend tests are integration-style by default (`setupRouterTest()` / `renderApp()` + MSW at the HTTP boundary); isolated `render()` unit tests are reserved for pure prop/callback-driven components with no router/data-fetching dependency (mirrors `LoginForm`/`LoginPage`).
- Package manager is pnpm; workspace packages are `@eventflow/api` and `@eventflow/web`. Run scoped commands as `pnpm --filter @eventflow/api <script> -- <args>` / `pnpm --filter @eventflow/web <script> -- <args>`.

---

## File Structure

**Backend** (`apps/api/src/`)
- Modify `events/events.repository.ts` — `q` param + ILIKE matching on `findAll`/`findPublic`.
- Modify `db/schemas/events.ts` — add two `pg_trgm` GIN indexes (`title`, `description`).
- Create `db/migrations/0008_add_trgm_search_indexes_to_events.sql` (generated + hand-patched for the extension) and its `meta/` entries (generated).
- Modify `events/events.service.ts` — thread `q` through `findPublic`/`findAllForVip`.
- Modify `events/events.controller.ts` — accept `@Query('q')` on `findAll`/`findAllVip`.
- Modify `events/events.repository.integration.spec.ts`, `events/events.service.spec.ts`, `events/events.controller.spec.ts`, `events/events.integration.spec.ts` — add search coverage.

**Frontend** (`apps/web/src/`)
- Modify `lib/api.ts` — `fetchEvents`/`fetchEventsVip` accept an optional `q`.
- Create `events/components/event-search-form.tsx` — presentational search box (input + submit), reused by both the hero and the search page.
- Create `events/components/event-search-form.spec.tsx` — isolated unit test (mirrors `login-form.spec.tsx`).
- Create `events/components/hero.tsx` — wraps `EventSearchForm`, navigates to `/search?q=`.
- Modify `events/events.page.tsx` — render `<Hero />` below the existing intro block.
- Modify `events/events.page.spec.tsx` — add a router-level test that the hero search navigates to `/search`.
- Modify `router.tsx` — register a `/search` route with a zod `validateSearch` schema.
- Create `events/search.page.tsx` — the results page.
- Create `events/search.page.spec.tsx` — integration-style tests (empty state, results, prefill/resubmit, no-results, VIP split, error).

---

### Task 1: `EventsRepository` — filter by search query

**Files:**
- Modify: `apps/api/src/events/events.repository.ts`
- Test: `apps/api/src/events/events.repository.integration.spec.ts`

**Interfaces:**
- Consumes: `events` table from `../db/schemas` (existing), `DbService` (existing).
- Produces: `EventsRepository.findAll(q?: string)` and `EventsRepository.findPublic(q?: string)` — both now accept an optional case-insensitive substring filter matched against `title` OR `description`. Return type unchanged (array of `typeof events.$inferSelect`). `EventsService` (Task 3) calls these with the viewer's raw query string.

- [ ] **Step 1: Write the failing integration tests**

Replace the full contents of `apps/api/src/events/events.repository.integration.spec.ts` with:

```ts
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbService } from '../db/db.service';
import { eventSessions, events, layouts, speakers, user } from '../db/schemas';
import {
  eventFactory,
  eventSessionFactory,
  layoutFactory,
  speakerFactory,
  userFactory,
} from '../test/fixtures';
import { EventsModule } from './events.module';
import { EventsRepository } from './events.repository';

describe('EventsRepository (integration)', () => {
  let module: TestingModule;
  let repository: EventsRepository;
  const owner = userFactory.build();
  const layout = layoutFactory.build();
  const event = eventFactory.build({ ownerId: owner.id, layoutId: layout.id });
  const vipEvent = eventFactory.build({ ownerId: owner.id, isVip: true });
  const searchableEvent = eventFactory.build({
    ownerId: owner.id,
    title: 'Kubernetes Deep Dive Workshop',
    description: 'Hands-on container orchestration for platform teams.',
  });
  const searchableVipEvent = eventFactory.build({
    ownerId: owner.id,
    isVip: true,
    title: 'Executive Roundtable',
    description: 'An exclusive discussion on kubernetes adoption at scale.',
  });
  const speaker = speakerFactory.build();
  const session = eventSessionFactory.build({ eventId: event.id, speakerId: speaker.id });

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    repository = module.get(EventsRepository);

    const dbService = module.get(DbService);
    await dbService.db.delete(eventSessions);
    await dbService.db.delete(events);
    await dbService.db.delete(layouts);
    await dbService.db.delete(speakers);
    await dbService.db.insert(user).values(owner);
    await dbService.db.insert(speakers).values(speaker);
    await dbService.db.insert(layouts).values(layout);
    await dbService.db
      .insert(events)
      .values([event, vipEvent, searchableEvent, searchableVipEvent]);
    await dbService.db.insert(eventSessions).values(session);
  });

  afterAll(async () => {
    await module.close();
  });

  it('returns every seeded event from the database, VIP included', async () => {
    const result = await repository.findAll();

    expect(result.map((row) => row.id)).toEqual(expect.arrayContaining([event.id, vipEvent.id]));
  });

  it('excludes VIP events from the public query', async () => {
    const result = await repository.findPublic();

    expect(result.map((row) => row.id)).toEqual(
      expect.not.arrayContaining([vipEvent.id, searchableVipEvent.id]),
    );
  });

  it('matches a non-VIP event by a case-insensitive title substring, publicly', async () => {
    const result = await repository.findPublic('KUBERNETES');

    expect(result.map((row) => row.id)).toEqual([searchableEvent.id]);
  });

  it('matches an event by a substring in its description', async () => {
    const result = await repository.findAll('kubernetes');

    expect(result.map((row) => row.id)).toEqual(
      expect.arrayContaining([searchableEvent.id, searchableVipEvent.id]),
    );
  });

  it('excludes a VIP-only match from the public search', async () => {
    const result = await repository.findPublic('roundtable');

    expect(result).toEqual([]);
  });

  it('returns no rows for a query that matches nothing', async () => {
    const result = await repository.findPublic('nonexistent-term-xyz');

    expect(result).toEqual([]);
  });

  it('returns an event with its sessions, their assigned speakers, and its layout', async () => {
    const result = await repository.findById(event.id);

    expect(result).toMatchObject({
      title: event.title,
      sessions: [
        expect.objectContaining({
          title: session.title,
          speaker: expect.objectContaining({ id: speaker.id }),
        }),
      ],
      layout: expect.objectContaining({ id: layout.id }),
    });
  });

  it('returns undefined for an unknown event id', async () => {
    const result = await repository.findById('00000000-0000-0000-0000-000000000000');

    expect(result).toBeUndefined();
  });

  it('reports an event id VIP flag', async () => {
    const nonVip = await repository.findVipFlag(event.id);
    const vip = await repository.findVipFlag(vipEvent.id);
    const notFound = await repository.findVipFlag('00000000-0000-0000-0000-000000000000');

    expect(nonVip).toBe(false);
    expect(vip).toBe(true);
    expect(notFound).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm --filter @eventflow/api test:integration -- src/events/events.repository.integration.spec.ts`
Expected: FAIL — `findPublic`/`findAll` don't accept a second argument yet, and the new search assertions don't match (currently both queries ignore `q` entirely, so the "matches" tests return every row instead of the filtered subset).

- [ ] **Step 3: Implement the repository filter**

Replace the full contents of `apps/api/src/events/events.repository.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { DbService } from '../db/db.service';
import { events } from '../db/schemas';

@Injectable()
export class EventsRepository {
  constructor(private readonly dbService: DbService) {}

  findAll(q?: string) {
    return this.dbService.db
      .select()
      .from(events)
      .where(q ? matchesQuery(q) : undefined);
  }

  findPublic(q?: string) {
    return this.dbService.db
      .select()
      .from(events)
      .where(q ? and(eq(events.isVip, false), matchesQuery(q)) : eq(events.isVip, false));
  }

  findById(id: string) {
    return this.dbService.db.query.events.findFirst({
      where: eq(events.id, id),
      with: {
        sessions: {
          with: { speaker: true },
        },
        layout: true,
      },
    });
  }

  async findVipFlag(id: string): Promise<boolean | undefined> {
    const rows = await this.dbService.db
      .select({ isVip: events.isVip })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    return rows[0]?.isVip;
  }
}

function matchesQuery(q: string) {
  return or(ilike(events.title, `%${q}%`), ilike(events.description, `%${q}%`));
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm --filter @eventflow/api test:integration -- src/events/events.repository.integration.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/events/events.repository.ts apps/api/src/events/events.repository.integration.spec.ts
git commit -m "feat(100): filter events by search query in the repository"
```

---

### Task 2: `pg_trgm` GIN indexes for search

**Files:**
- Modify: `apps/api/src/db/schemas/events.ts`
- Create: `apps/api/src/db/migrations/0008_add_trgm_search_indexes_to_events.sql` (+ generated `meta/` entries)

**Interfaces:**
- Consumes: nothing new — this only adds indexes backing the `ILIKE` queries from Task 1. No code depends on this task's output directly; it's a performance/infra task with no behavior change.
- Produces: `pg_trgm` extension enabled + GIN indexes on `events.title` and `events.description`, applied automatically by `testcontainers-global-setup.ts`'s `migrate()` call on the next test run.

- [ ] **Step 1: Add the index definitions to the schema**

Replace the full contents of `apps/api/src/db/schemas/events.ts` with:

```ts
import { sql } from 'drizzle-orm';
import { boolean, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { layouts } from './layouts';
import { user } from './user';

export const events = pgTable(
  'events',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    subtitle: text().notNull(),
    description: text().notNull(),
    heroImage: text('hero_image').notNull(),
    heroCta: text('hero_cta').notNull(),
    date: date().notNull(),
    locationCity: text('location_city').notNull(),
    locationVenue: text('location_venue').notNull(),
    locationAddress: text('location_address').notNull(),
    organizerName: text('organizer_name').notNull(),
    organizerImage: text('organizer_image').notNull(),
    isVip: boolean('is_vip').default(false).notNull(),
    layoutId: uuid('layout_id').references(() => layouts.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('events_title_trgm_idx').using('gin', sql`${table.title} gin_trgm_ops`),
    index('events_description_trgm_idx').using('gin', sql`${table.description} gin_trgm_ops`),
  ],
);
```

- [ ] **Step 2: Generate the migration**

Run: `pnpm --filter @eventflow/api db:generate --name=add_trgm_search_indexes_to_events`
Expected: a new `apps/api/src/db/migrations/0008_add_trgm_search_indexes_to_events.sql` appears, containing two `CREATE INDEX ... USING gin (... gin_trgm_ops)` statements (drizzle-kit does not know about Postgres extensions, so it won't add the `CREATE EXTENSION` statement itself — that's the next step).

- [ ] **Step 3: Prepend the extension statement**

Open the generated `apps/api/src/db/migrations/0008_add_trgm_search_indexes_to_events.sql` and add this as the very first line (keep the rest of the generated content, including its `--> statement-breakpoint` separators, unchanged below it):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
```

- [ ] **Step 4: Verify the migration applies cleanly**

Run: `pnpm --filter @eventflow/api test:integration -- src/events/events.repository.integration.spec.ts`
Expected: PASS — `testcontainers-global-setup.ts` runs every migration in `src/db/migrations` (including the new `0008`) against a fresh `postgres:18-alpine` container before any integration test runs; a failure here means the hand-edited SQL is invalid.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schemas/events.ts apps/api/src/db/migrations/0008_add_trgm_search_indexes_to_events.sql apps/api/src/db/migrations/meta
git commit -m "feat(100): add pg_trgm GIN indexes on events title and description"
```

---

### Task 3: `EventsService` — thread the query through

**Files:**
- Modify: `apps/api/src/events/events.service.ts`
- Test: `apps/api/src/events/events.service.spec.ts`

**Interfaces:**
- Consumes: `EventsRepository.findPublic(q?: string)` / `EventsRepository.findAll(q?: string)` from Task 1.
- Produces: `EventsService.findPublic(q?: string): Promise<Event[]>` and `EventsService.findAllForVip(q?: string): Promise<Event[]>` — same DTO mapping as before (`toEvent`), just passing `q` through. `EventsController` (Task 4) calls these with the raw query param.

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/events/events.service.spec.ts`, add these two `it` blocks directly after the existing `'maps every repository row to event DTOs for the VIP list'` test (inside the same `describe('EventsService', ...)` block):

```ts
  it('passes the search query through to the public repository call', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const repoSpy = vi.spyOn(module.get(EventsRepository), 'findPublic').mockResolvedValue([row]);
    const service = module.get(EventsService);

    await service.findPublic('kubernetes');

    expect(repoSpy).toHaveBeenCalledWith('kubernetes');
  });

  it('passes the search query through to the VIP repository call', async () => {
    const row = eventFactory.build();
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const repoSpy = vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValue([row]);
    const service = module.get(EventsService);

    await service.findAllForVip('kubernetes');

    expect(repoSpy).toHaveBeenCalledWith('kubernetes');
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm --filter @eventflow/api test:unit -- src/events/events.service.spec.ts`
Expected: FAIL — `repoSpy` is called with no arguments (`undefined`), not `'kubernetes'`.

- [ ] **Step 3: Implement**

In `apps/api/src/events/events.service.ts`, replace the `findPublic` and `findAllForVip` methods (lines 16-26) with:

```ts
  async findPublic(q?: string): Promise<Event[]> {
    const rows = await this.eventsRepository.findPublic(q);

    return rows.map(toEvent);
  }

  async findAllForVip(q?: string): Promise<Event[]> {
    const rows = await this.eventsRepository.findAll(q);

    return rows.map(toEvent);
  }
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm --filter @eventflow/api test:unit -- src/events/events.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/events/events.service.ts apps/api/src/events/events.service.spec.ts
git commit -m "feat(100): thread the search query through EventsService"
```

---

### Task 4: `EventsController` — accept `?q=`

**Files:**
- Modify: `apps/api/src/events/events.controller.ts`
- Test: `apps/api/src/events/events.controller.spec.ts`

**Interfaces:**
- Consumes: `EventsService.findPublic(q?: string)` / `EventsService.findAllForVip(q?: string)` from Task 3.
- Produces: `GET /api/events?q=` and `GET /api/events/vip?q=` — same response shape and VIP gating as before, now search-filtered when `q` is present. Task 5's integration tests hit these HTTP routes directly.

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/events/events.controller.spec.ts`, add these two `it` blocks directly after the existing `'resolves via Nest DI and lists public events'` test:

```ts
  it('passes the q query param through to the public repository call', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const repoSpy = vi.spyOn(module.get(EventsRepository), 'findPublic').mockResolvedValueOnce([]);
    const controller = module.get(EventsController);

    await controller.findAll('kubernetes');

    expect(repoSpy).toHaveBeenCalledWith('kubernetes');
  });

  it('passes the q query param through to the VIP repository call', async () => {
    const module = await Test.createTestingModule({ imports: [EventsModule] }).compile();
    const repoSpy = vi.spyOn(module.get(EventsRepository), 'findAll').mockResolvedValueOnce([]);
    const controller = module.get(EventsController);

    await controller.findAllVip(sessionFor({ isVip: true }), 'kubernetes');

    expect(repoSpy).toHaveBeenCalledWith('kubernetes');
  });
```

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `pnpm --filter @eventflow/api test:unit -- src/events/events.controller.spec.ts`
Expected: FAIL — TypeScript error (`findAll`/`findAllVip` don't accept a second argument) or, if it compiles loosely, `repoSpy` called with `undefined`.

- [ ] **Step 3: Implement**

In `apps/api/src/events/events.controller.ts`:

1. Add `Query` to the `@nestjs/common` import (line 1-10):

```ts
import {
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
```

2. Replace `findAll` (lines 21-27) with:

```ts
  @AllowAnonymous()
  @Get()
  findAll(@Query('q') q?: string): Promise<Event[]> {
    eventsRequestsCounter.inc({ tier: 'standard' });

    return this.eventsService.findPublic(q);
  }
```

3. Replace `findAllVip` (lines 29-36) with:

```ts
  // Must be registered before ':id', or Nest matches "vip" as an :id value.
  @Get('vip')
  async findAllVip(
    @Session() session: UserSession<typeof auth>,
    @Query('q') q?: string,
  ): Promise<Event[]> {
    eventsRequestsCounter.inc({ tier: 'vip' });
    if (!session.user.isVip) throw new ForbiddenException();

    return this.eventsService.findAllForVip(q);
  }
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm --filter @eventflow/api test:unit -- src/events/events.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/events/events.controller.ts apps/api/src/events/events.controller.spec.ts
git commit -m "feat(100): accept a q query param on the events list routes"
```

---

### Task 5: End-to-end search coverage

**Files:**
- Modify: `apps/api/src/events/events.integration.spec.ts`

**Interfaces:**
- Consumes: `GET /api/events?q=` and `GET /api/events/vip?q=` from Task 4, over real HTTP via `supertest`.
- Produces: nothing consumed downstream — this is the backend's final proof that search works end-to-end (routing, auth, repository, indexes) before the frontend is wired up.

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/events/events.integration.spec.ts`:

1. Add a `searchableEvent` fixture next to the existing `event`/`vipEvent` declarations (after line 22):

```ts
  const searchableEvent = eventFactory.build({
    ownerId: owner.id,
    title: 'Kubernetes Deep Dive Workshop',
  });
  const searchableVipEvent = eventFactory.build({
    ownerId: owner.id,
    isVip: true,
    description: 'An exclusive session on kubernetes adoption at scale.',
  });
```

2. Include both in the `beforeAll` insert (replace line 36):

```ts
    await db.insert(events).values([event, vipEvent, searchableEvent, searchableVipEvent]);
```

3. Add these tests directly after the existing `'GET /api/events returns only non-VIP events'` test:

```ts
  it('GET /api/events?q= filters non-VIP events by a title/description match', async () => {
    const response = await request(app.getHttpServer()).get('/api/events?q=kubernetes');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([expect.objectContaining({ id: searchableEvent.id })]);
  });

  it('GET /api/events?q= returns an empty array when nothing matches', async () => {
    const response = await request(app.getHttpServer()).get('/api/events?q=nonexistent-term-xyz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('GET /api/events/vip?q= filters every event by a title/description match for a VIP user', async () => {
    const agent = await vipAgent();

    const response = await agent.get('/api/events/vip?q=kubernetes');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: searchableEvent.id }),
        expect.objectContaining({ id: searchableVipEvent.id }),
      ]),
    );
  });
```

- [ ] **Step 2: Run the tests to confirm they pass**

This task lands after Tasks 1-4 already implemented `q` filtering end-to-end (repository → service → controller), so there's no red step here — these tests exist to lock in the full HTTP-level behavior (routing, auth, indexes) as a regression check, not to drive new implementation.

Run: `pnpm --filter @eventflow/api test:integration -- src/events/events.integration.spec.ts`
Expected: PASS — all events tests, including the new ones, pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/events/events.integration.spec.ts
git commit -m "test(100): cover event search end-to-end over HTTP"
```

---

### Task 6: `EventSearchForm` — presentational search box

**Files:**
- Create: `apps/web/src/events/components/event-search-form.tsx`
- Test: `apps/web/src/events/components/event-search-form.spec.tsx`

**Interfaces:**
- Consumes: `Field`, `FieldGroup`, `FieldLabel` from `@/components/ui/field`; `Input` from `@/components/ui/input`; `Button` from `@/components/ui/button`; `useForm` from `@tanstack/react-form`; `z` from `zod`.
- Produces: `EventSearchForm({ defaultValue?: string; onSubmit: (query: string) => void })` — a controlled, labelled ("Search events") text input + submit button. Submit is disabled while the trimmed value is empty; `onSubmit` fires with the trimmed, non-empty query. Consumed by `Hero` (Task 7) and `SearchPage` (Task 9).

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/events/components/event-search-form.spec.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventSearchForm } from './event-search-form';

describe('EventSearchForm', () => {
  it('calls onSubmit with the trimmed query', async () => {
    const onSubmit = vi.fn();
    render(<EventSearchForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Search events'), {
      target: { value: '  cloud computing  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('cloud computing');
    });
  });

  it('pre-fills the input from defaultValue', () => {
    render(<EventSearchForm defaultValue="kubernetes" onSubmit={vi.fn()} />);

    const input = screen.getByLabelText('Search events') as HTMLInputElement;
    expect(input.value).toBe('kubernetes');
  });

  it('disables the submit button when the query is empty', () => {
    render(<EventSearchForm onSubmit={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('disables the submit button when the query is only whitespace', () => {
    render(<EventSearchForm onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: '   ' } });

    const button = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('enables the submit button once a non-empty query is entered', () => {
    render(<EventSearchForm onSubmit={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: 'cloud' } });

    const button = screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm --filter @eventflow/web test:unit -- src/events/components/event-search-form.spec.tsx`
Expected: FAIL — `event-search-form.tsx` doesn't exist yet.

- [ ] **Step 3: Implement**

Create `apps/web/src/events/components/event-search-form.tsx`:

```tsx
import { useForm } from '@tanstack/react-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const eventSearchSchema = z.object({
  q: z.string().trim().min(1),
});

export function EventSearchForm({
  defaultValue = '',
  onSubmit,
}: {
  defaultValue?: string;
  onSubmit: (query: string) => void;
}) {
  const form = useForm({
    defaultValues: { q: defaultValue },
    validators: { onSubmit: eventSearchSchema },
    onSubmit: ({ value }) => onSubmit(value.q.trim()),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field name="q">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name} className="sr-only">
                Search events
              </FieldLabel>
              <div className="flex gap-2">
                <Input
                  id={field.name}
                  name={field.name}
                  type="search"
                  placeholder="Search events by name or description"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <form.Subscribe selector={(state) => state.values.q.trim().length === 0}>
                  {(isEmpty) => (
                    <Button type="submit" disabled={isEmpty}>
                      Search
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </form>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm --filter @eventflow/web test:unit -- src/events/components/event-search-form.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/events/components/event-search-form.tsx apps/web/src/events/components/event-search-form.spec.tsx
git commit -m "feat(100): add EventSearchForm"
```

---

### Task 7: `Hero` on the landing page

**Files:**
- Create: `apps/web/src/events/components/hero.tsx`
- Modify: `apps/web/src/events/events.page.tsx`
- Test: `apps/web/src/events/events.page.spec.tsx`

**Interfaces:**
- Consumes: `EventSearchForm` from Task 6; `useNavigate` from `@tanstack/react-router` (targets the `/search` route registered in Task 8 — this task can be implemented before Task 8, but its navigation test only passes once Task 8's route exists, since `RouterProvider` needs a matching route to render anything at `/search`).
- Produces: `Hero()` — no props. Rendered inside `EventsPage`, directly below the existing intro block.

- [ ] **Step 1: Write the failing test**

In `apps/web/src/events/events.page.spec.tsx`, add `fireEvent` to the existing `@testing-library/react` import (line 1):

```tsx
import { fireEvent, screen } from '@testing-library/react';
```

Then add this test at the end of the `describe('EventsPage', ...)` block (after the `'shows an error message when the request fails'` test):

```tsx
  it('renders a hero search box that navigates to /search with the query', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => HttpResponse.json([])));

    await renderApp('/');

    fireEvent.change(await screen.findByLabelText('Search events'), {
      target: { value: 'kubernetes' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Search events' })).toBeTruthy();
  });
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `pnpm --filter @eventflow/web test:unit -- src/events/events.page.spec.tsx`
Expected: FAIL — no "Search events" labelled input exists on `/` yet.

- [ ] **Step 3: Implement the Hero component**

Create `apps/web/src/events/components/hero.tsx`:

```tsx
import { useNavigate } from '@tanstack/react-router';
import { EventSearchForm } from './event-search-form';

export function Hero() {
  const navigate = useNavigate();

  return (
    <div className="mt-6 rounded-lg border border-border bg-muted/30 p-6">
      <h2 className="text-lg font-semibold">Find your next event</h2>
      <p className="mt-1 text-sm text-muted-foreground">Search by event name or description.</p>
      <div className="mt-4">
        <EventSearchForm
          onSubmit={(query) => void navigate({ to: '/search', search: { q: query } })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire it into `EventsPage`**

In `apps/web/src/events/events.page.tsx`, add the import (after the existing `event-list-item` import) and render `<Hero />` below the tagline:

```tsx
import { useQuery } from '@tanstack/react-query';
import { fetchEvents, fetchEventsVip } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { EventListItem } from './components/event-list-item';
import { Hero } from './components/hero';

export function EventsPage() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isVip = session?.user.isVip ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', { isVip }],
    queryFn: isVip ? fetchEventsVip : fetchEvents,
    enabled: !isSessionPending,
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">EventFlow</h1>
      <p className="mt-2 text-muted-foreground">Find and register for upcoming events.</p>
      <Hero />
      {(isSessionPending || isLoading) && <p className="mt-4 text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-destructive">Failed to load events.</p>}
      {data && (
        <ul className="mt-4 space-y-4">
          {data.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
```

This step's test will still fail until Task 8 registers the `/search` route (there's nothing to navigate to yet) — that's expected; proceed to Task 8 before re-running.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/events/components/hero.tsx apps/web/src/events/events.page.tsx apps/web/src/events/events.page.spec.tsx
git commit -m "feat(100): add a hero search box to the landing page"
```

---

### Task 8: Register the `/search` route

**Files:**
- Modify: `apps/web/src/router.tsx`

**Interfaces:**
- Consumes: `SearchPage` component (Task 9 creates it — this task can reference it before the file exists only if done together; recommended order is to do Task 9's component creation first, or treat Tasks 8 and 9 as one unit if executed by the same worker). This plan lists them separately for reviewability, but **Task 8's route registration and Task 9's page creation must land in the same commit** — a route pointing at a nonexistent component doesn't compile.
- Produces: a `/search` route with `validateSearch: z.object({ q: z.string().optional() })`, so `useSearch({ from: '/search' })` anywhere in the app resolves to `{ q?: string }`. This unblocks Task 7's Hero navigation test and Task 9's `SearchPage`.

- [ ] **Step 1: Add the route**

In `apps/web/src/router.tsx`:

1. Add the zod and `SearchPage` imports (after the existing `import * as z from 'zod'`-style convention — add near the top, after the `@tanstack/react-router` import):

```tsx
import * as z from 'zod';
```

and after the `EventsPage` import:

```tsx
import { SearchPage } from '@/events/search.page';
```

2. Add the search params schema and route (after `eventDetailRoute`, before `speakersRoute`):

```tsx
const searchParamsSchema = z.object({ q: z.string().optional() });

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: searchParamsSchema,
  component: SearchPage,
});
```

3. Add `searchRoute` to the tree:

```tsx
const routeTree = rootRoute.addChildren([
  indexRoute,
  eventDetailRoute,
  searchRoute,
  speakersRoute,
  speakerDetailRoute,
  loginRoute,
  registerRoute,
  profileRoute,
]);
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter @eventflow/web typecheck`
Expected: fails until Task 9 creates `apps/web/src/events/search.page.tsx` — proceed directly to Task 9, then return and re-run this check.

- [ ] **Step 3: Commit (fold into Task 9's commit — see Task 9 Step 5)**

No standalone commit here; `router.tsx` is committed together with `search.page.tsx` in Task 9 since neither compiles alone.

---

### Task 9: `SearchPage` and `api.ts` support

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/events/search.page.tsx`
- Test: `apps/web/src/events/search.page.spec.tsx`
- (Carries Task 8's `router.tsx` change into its commit.)

**Interfaces:**
- Consumes: `fetchEvents`/`fetchEventsVip` (extended here with `q`), `EventListItem` (existing), `EventSearchForm` (Task 6), `useSearch`/`useNavigate` from `@tanstack/react-router` against the `/search` route (Task 8), `authClient.useSession()` (existing pattern from `EventsPage`).
- Produces: the `/search` page — nothing downstream consumes this.

- [ ] **Step 1: Extend `fetchEvents`/`fetchEventsVip` with an optional query**

In `apps/web/src/lib/api.ts`, replace the two functions (lines 49-59) with:

```ts
export async function fetchEvents(q?: string): Promise<Event[]> {
  const res = await fetch(q ? `/api/events?q=${encodeURIComponent(q)}` : '/api/events');
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch events');
  return eventSchema.array().parse(await res.json());
}

export async function fetchEventsVip(q?: string): Promise<Event[]> {
  const res = await fetch(q ? `/api/events/vip?q=${encodeURIComponent(q)}` : '/api/events/vip');
  if (!res.ok) throw new ApiError(res.status, 'Failed to fetch events');
  return eventSchema.array().parse(await res.json());
}
```

This is a backward-compatible signature change — `EventsPage` (Task 7) still calls these with no arguments and is unaffected.

- [ ] **Step 2: Write the failing tests**

Create `apps/web/src/events/search.page.spec.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mocks/server';
import { eventFactory, sessionFor, userFactory } from '@/test/fixtures';
import { setupRouterTest } from '@/test/router-harness';

const renderApp = setupRouterTest();

describe('SearchPage', () => {
  it('renders an empty state when no query is present', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));

    await renderApp('/search');

    expect(await screen.findByText('Enter a search term above.')).toBeTruthy();
  });

  it('renders matching events for the query in the URL', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const event = eventFactory.build({ title: 'Kubernetes Deep Dive' });
    server.use(
      http.get('/api/events', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('q')).toBe('kubernetes');
        return HttpResponse.json([event]);
      }),
    );

    await renderApp('/search?q=kubernetes');

    const link = await screen.findByRole('link', { name: event.title });
    expect(link.getAttribute('href')).toBe(`/events/${event.id}`);
  });

  it('pre-fills the search field with the current query', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => HttpResponse.json([])));

    await renderApp('/search?q=kubernetes');

    const input = (await screen.findByLabelText('Search events')) as HTMLInputElement;
    expect(input.value).toBe('kubernetes');
  });

  it('re-runs the search when the field is edited and resubmitted', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    const first = eventFactory.build({ title: 'Kubernetes Deep Dive' });
    const second = eventFactory.build({ title: 'Serverless Summit' });
    server.use(
      http.get('/api/events', ({ request }) => {
        const q = new URL(request.url).searchParams.get('q');
        return HttpResponse.json(q === 'serverless' ? [second] : [first]);
      }),
    );

    await renderApp('/search?q=kubernetes');
    await screen.findByRole('link', { name: first.title });

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: 'serverless' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('link', { name: second.title })).toBeTruthy();
  });

  it('shows a no-results message for a query with no matches', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => HttpResponse.json([])));

    await renderApp('/search?q=nonexistent');

    expect(await screen.findByText('No events match "nonexistent".')).toBeTruthy();
  });

  it('fetches the VIP-inclusive search for a signed-in VIP user', async () => {
    const vipUser = userFactory.build({ isVip: true });
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(sessionFor(vipUser))));
    const vipEvent = eventFactory.build({ title: 'VIP Gala', isVip: true });
    server.use(http.get('/api/events/vip', () => HttpResponse.json([vipEvent])));

    await renderApp('/search?q=gala');

    expect(await screen.findByRole('link', { name: vipEvent.title })).toBeTruthy();
  });

  it('shows an error message when the search request fails', async () => {
    server.use(http.get('/api/auth/get-session', () => HttpResponse.json(null)));
    server.use(http.get('/api/events', () => new HttpResponse(null, { status: 500 })));

    await renderApp('/search?q=kubernetes');

    expect(await screen.findByText('Failed to load search results.')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `pnpm --filter @eventflow/web test:unit -- src/events/search.page.spec.tsx`
Expected: FAIL — `search.page.tsx` doesn't exist, and `router.tsx` (Task 8) doesn't compile without it.

- [ ] **Step 4: Implement `SearchPage`**

Create `apps/web/src/events/search.page.tsx`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { fetchEvents, fetchEventsVip } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { EventListItem } from './components/event-list-item';
import { EventSearchForm } from './components/event-search-form';

export function SearchPage() {
  const { q } = useSearch({ from: '/search' });
  const navigate = useNavigate();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const isVip = session?.user.isVip ?? false;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'search', q, { isVip }],
    queryFn: () => (isVip ? fetchEventsVip(q) : fetchEvents(q)),
    enabled: !isSessionPending && !!q,
  });

  function handleSearch(query: string) {
    void navigate({ to: '/search', search: { q: query } });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Search events</h1>
      <div className="mt-4">
        <EventSearchForm defaultValue={q ?? ''} onSubmit={handleSearch} />
      </div>
      {!q && <p className="mt-4 text-muted-foreground">Enter a search term above.</p>}
      {q && (isSessionPending || isLoading) && (
        <p className="mt-4 text-muted-foreground">Loading…</p>
      )}
      {q && isError && <p className="mt-4 text-destructive">Failed to load search results.</p>}
      {q && data && data.length === 0 && (
        <p className="mt-4 text-muted-foreground">No events match &quot;{q}&quot;.</p>
      )}
      {q && data && data.length > 0 && (
        <ul className="mt-4 space-y-4">
          {data.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run all frontend tests to confirm everything passes**

Run: `pnpm --filter @eventflow/web typecheck && pnpm --filter @eventflow/web test:unit`
Expected: PASS — including Task 7's hero navigation test, now that `/search` exists.

- [ ] **Step 6: Commit (includes Task 8's router change)**

```bash
git add apps/web/src/lib/api.ts apps/web/src/events/search.page.tsx apps/web/src/events/search.page.spec.tsx apps/web/src/router.tsx
git commit -m "feat(100): add the /search results page"
```

---

## Final Verification

- [ ] Run the full backend suite: `pnpm --filter @eventflow/api test:unit && pnpm --filter @eventflow/api test:integration`
- [ ] Run the full frontend suite: `pnpm --filter @eventflow/web typecheck && pnpm --filter @eventflow/web test:unit`
- [ ] Run lint on both: `pnpm --filter @eventflow/api lint && pnpm --filter @eventflow/web lint`
- [ ] Manually exercise the flow with the dev server: type a query into the landing-page hero, confirm it lands on `/search?q=...` with matching results and the VIP badge on any VIP event (as a signed-in VIP seed user); edit the field on `/search` and resubmit; visit `/search` directly with no query and confirm the empty state.
