# ADR 0005: Structured Logging

## Status

Accepted

## Context

No logging exists anywhere in the codebase. The security review (2026-08-22) found no way to investigate auth failures or request failures after the fact — a real gap now that the repo is public. Goal: security-incident investigation and general reliability/debugging, equally.

## Decision

### Library: `pino` + `nestjs-pino`

- Fastest JSON logger in the Node ecosystem.
- Transport-based: stdout now, add a Datadog transport later (`pino-datadog-transport` exists) without touching any call site.
- Built-in `redact` config — structural protection, not per-call-site discipline.
- `nestjs-pino` wires it into Nest's DI as the app-wide logger. `pino-http` gives every request a child logger with an auto-generated correlation ID for free.

### Scope: failures only, not a full access log

One global exception filter, registered as an `APP_FILTER` provider (not an ad-hoc `main.ts` call — stays in the DI graph, directly unit-testable via `Test.createTestingModule`). Catches everything: `HttpException`s (auth failures from the guard, VIP `ForbiddenException`s, `NotFoundException`s) and anything unhandled that NestJS converts to a 500.

- 4xx: message only, `warn` level. Expected/handled cases, no stack trace needed.
- 5xx: full error + stack, `error` level. Actual bugs.
- Logged fields: status code, method, path, request ID, user ID if the request reached auth.

No business-event logging (registration created, VIP flips, etc.) — the filter's exception-level detail already covers the stated goal. No process-level `uncaughtException`/`unhandledRejection` handlers — no background jobs/crons exist yet, so the global filter already covers 100% of current code paths.

### Redaction

Deny-list at the logger config level: `req.headers` and `res.headers` in full (the session cookie lives in `req.headers.cookie`; the rest — user-agent, Helmet's CSP/HSTS dump, etc. — is just noise, redacted the same way rather than enumerated field-by-field), plus any field named `*.password`/`*.token`/`*.secret` wherever it appears. Structural, not per-call-site — protects even a future call site that logs a request/error object carelessly.

### GCP Cloud Logging integration

A `formatters.level` hook maps pino's level to GCP's expected `severity` field. Must explicitly return the original numeric `level` alongside `severity` — pino's `formatters.level` _replaces_ the default `level` field rather than merging with it, so omitting it here would silently break tooling that expects it later (Datadog's pino ingestion, `pino-pretty` for local dev).

```js
formatters: {
  level(label, number) {
    return { severity: label.toUpperCase(), level: number };
  }
}
```

### Bootstrap

Standard `nestjs-pino` pattern: `bufferLogs: true` + `app.useLogger(app.get(Logger))` in `main.ts`, so startup logs aren't dropped before the logger is ready.

### Per-class context

Supported via pino's child-logger mechanism, not a parallel config surface: `logger.setContext(ClassName.name)` tags every line from that instance with `{ context: "ClassName" }`, inheriting the parent instance's `redact` rules and `formatters` automatically.

## Alternatives Considered

- **`winston` + `nest-winston`** — same transport-based shape (has a Datadog transport too), but meaningfully slower than pino and no built-in path-based redaction (would need a hand-written formatter, more room for a mistake).
- **NestJS's built-in `Logger` + a hand-rolled JSON formatter** — zero new dependency, but no transport abstraction (Datadog later becomes hand-written fan-out logic) and no structural redaction (every call site has to remember). Conflicts with two of the stated requirements.
- **Full access log** (every request, not just failures) — higher Cloud Logging volume/cost for no benefit toward the stated goal, which is investigation, not traffic analysis.
- **Business-event logging beyond exceptions** — deferred; the exception filter's detail already covers the stated goal. Revisit if a real gap shows up in practice.
- **Process-level `uncaughtException`/`unhandledRejection` handlers** — deferred; no background jobs/crons exist yet, so the global filter already covers every current code path.
