# ADR 0003: Separating publicly-cacheable data from viewer-scoped data by endpoint

## Status

Accepted

## Context

Some responses are safe for any cache to serve to any caller; others depend on who's asking and must never leak from one caller to the next. If a single URL serves both, it's unsafe for any downstream cache to hold — regardless of `Cache-Control`, since that depends on every response, forever, setting the header correctly, with no structural backstop if a cache layer ignores or overrides origin headers. No CDN exists in this stack yet (ADR 0001), but the property should hold by construction, not by header discipline.

Not every per-viewer concern is an access gate — a small overlay on content everyone can already see (e.g. a "have I registered" flag) is a different shape of problem and out of scope here.

## Decision

**A viewer-scoped response gets a separate URL from the identity-independent version of the same resource.**

- The public route returns identity-independent data, safely cacheable regardless of header handling downstream.
- The scoped route nests under the same resource and names _what_ varies, not _who's asking_ (e.g. `.../vip`, not `/api/me/*`) — resource-first naming, and each future gate gets its own self-describing URL instead of a shared opaque prefix.
- The URL split is a caching/naming convention only, not the access control — the scoped route still checks entitlement server-side on every request.
- A gated single-item route returns the same denial to every disallowed caller regardless of identity, keeping that URL cacheable even though its allowed content isn't.

**First application**: VIP-gated event access (`/api/events` vs. `/api/events/vip`, and their `/:id` counterparts) — see `apps/api/src/events/events.controller.ts`.

## Alternatives Considered

- **One endpoint + conditional `Cache-Control`** — sufficient only if every cache in front of the API always honors origin headers correctly. Rejected: no structural backstop against a cache that doesn't.
- **Identity-prefixed namespace** (`/api/me/*` as an infra-level "never cache" rule) — repurposes a URL prefix as a cache-policy signal rather than a resource name; doesn't say what's actually being gated.
- **Client-side overlay on a publicly cached body** — right shape for an overlay concern, wrong for an access gate: the gated content itself must never reach a shared cache.
