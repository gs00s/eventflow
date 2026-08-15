# ADR 0002: Authentication

## Status

Accepted

## Context

The PRD asks for username/password signup/login with no social login or third-party auth, and ADR 0001 originally planned hand-rolled auth (Passport local strategy + argon2 + `@nestjs/jwt`) partly for that reason, partly because building auth is part of what's graded. Before implementing, we researched the current auth-library landscape (Lucia, Auth.js, Better Auth) against that plan. This ADR records the conclusion and supersedes ADR 0001's auth line.

## Decision

**Library**: Better Auth, `emailAndPassword` provider only — no social providers configured, so the PRD's "no social login" requirement holds literally. Using Better Auth at all is a deliberate divergence from ADR 0001's "no third-party auth library" stance: it's a self-hosted code library that stores credentials in our own Postgres, not a hosted third-party identity service (Auth0/Clerk/Supabase Auth) — the PRD's exclusion reads as targeting delegated/hosted identity, not a library we install and run ourselves. Traded away: the "build it by hand" demonstration ADR 0001 originally valued, in exchange for schema-generation and client-SDK convenience.

**NestJS integration**: `@thallesp/nestjs-better-auth` — the community package Better Auth's own docs point to (docs-endorsed, not first-party-maintained). Requires `bodyParser: false` app-wide; the wrapper re-applies JSON/urlencoded parsing to non-auth routes automatically, so this isn't an ongoing per-controller tax.

**HTTP adapter**: switched from Fastify to Express (`@nestjs/platform-express`) — see the updated line in [ADR 0001](./0001-stack-and-repo-structure.md#decision). Better Auth's NestJS integration targets Express as its primary/stable target; Fastify was only "beta" per their own docs, and nothing in the codebase depended on Fastify specifically.

**Database**: schema (user/session/account/verification tables) generated via `npx auth@latest generate` targeting Drizzle (`src/db/schemas/auth.ts`), migrated the same way as `speakers` (`drizzle-kit`).

**Email verification**: off for now — accounts are usable immediately after signup. Revisit if a later requirement needs it; not needed for the current PRD scope.

**Password hashing / session issuance**: owned entirely by Better Auth internally. This supersedes ADR 0001's "hand-rolled Passport + argon2 + `@nestjs/jwt`" line — that plan is no longer in effect.

**Cookies/CORS topology**: decided — same-origin via reverse proxy, in both dev and production, so default `SameSite=Lax` cookies work with no `crossSubDomainCookies` config and no Safari/ITP cross-site-cookie risk. The API sets a global `api` prefix (`app.setGlobalPrefix('api')`); the `AuthModule` auto-excludes its own `basePath` (`/api/auth`) from that prefix, so it composes cleanly instead of double-prefixing. `trustedOrigins: [env.CORS_ORIGIN]` is still required, though — not for CORS (the browser sees same-origin through the proxy either way), but because Better Auth independently rejects state-changing requests (sign-in/sign-up/sign-out) whose `Origin` header isn't allow-listed, and the browser's real `Origin` is the frontend's own origin, not the API's `baseURL`.

## Alternatives Considered

- **Passport** (`passport-local` + `passport-jwt` + argon2, ADR 0001's original plan) — genuinely first-party, Nest's own documented pattern, no schema-generation or client-SDK help. Ruled out in favor of Better Auth's conveniences, despite Passport being the fully-first-party-supported option.
- **Lucia** — deprecated March 2025, last code push July 2025, repositioned as a documentation/reference resource rather than an installable maintained library. Not a real option anymore.
- **Auth.js (NextAuth)** — official Drizzle adapter exists, but ergonomics/docs are Next.js-centric; NestJS integration is community-boilerplate-only, no stronger a story than Better Auth's.
- **Auth-as-a-service** (Auth0, Clerk, Supabase Auth) — literally hosted third-party identity providers, unambiguously excluded by the PRD's wording regardless of any other reasoning above.
