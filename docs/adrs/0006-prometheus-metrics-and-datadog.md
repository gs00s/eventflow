# ADR 0006: Prometheus Metrics with Datadog Scraping

## Status

Accepted

## Context

No metrics exist anywhere in the codebase. Two concrete needs: traffic visibility split by event tier (standard vs VIP), and login success/failure counts. ADR 0005 already flagged "add a Datadog transport later" for logs without committing to a mechanism — this ADR is that commitment, plus the metrics piece, decided together since both ship through the same Datadog Agent sidecar.

## Decision

### Library: `prom-client` via `@willsoto/nestjs-prometheus`

- DI-friendly `Counter` providers; current (last published 2026-03) and Nest 11-compatible.
- `defaultLabels: { service: 'api', env: env.NODE_ENV }` applied globally, so every metric carries both tags without repeating them per-`Counter`.
- The module's built-in `/metrics` controller is not used. Cloud Run only routes public traffic to the app container's declared `container_port`; serving `/metrics` there would make it internet-reachable. Instead, `main.ts` exposes the shared `Registry` on a second, internal-only HTTP port via a raw `http.createServer()` — unreachable from outside the instance, reachable by the sidecar over `localhost`.

### Metrics

- `events_requests_total{tier}` — `standard|vip`. Inline `.inc()` call in `EventsController.findAll`/`findAllVip` only (not the detail/register routes), on every request regardless of outcome.
- `login_attempts_total{status}` — `success|failure`. Better Auth's `hooks.after` + `createAuthMiddleware`, checking `ctx.path === '/sign-in/email'` and whether `ctx.context.returned` is an `APIError`. Built as a plain `prom-client` `Counter` at module scope in `auth.ts`, not DI-injected — `auth.ts` constructs its `betterAuth(...)` config at module load, before Nest's container exists, the same reason `PinoLogger.root` (a static accessor) is used there instead of constructor injection.
- The `eventflow.` prefix is applied by the Datadog OpenMetrics check's namespace config, not baked into metric names in application code.

### `NODE_ENV`

New `env.ts` entry: `z.enum(['development', 'production', 'test']).default('development')`. Vitest already sets `test` itself; Cloud Run terraform sets `production` explicitly.

### Datadog Agent as a Cloud Run sidecar

- Full `datadog-agent` image, not Datadog's `serverless-init`. `serverless-init` is a turnkey Node.js image pairing `dd-trace` with DogStatsD distribution metrics — it has no path for scraping arbitrary custom Prometheus counters, which is the actual requirement here.
- An OpenMetrics check on the Agent scrapes the app's internal metrics port.
- The Agent's OTLP receiver is left disabled. No OpenTelemetry SDK instrumentation exists in the app yet; enabling the receiver with nothing sending to it is dead config. Turn it on together with real OTel SDK work later.
- A new `google_secret_manager_secret` (`eventflow-api-datadog-api-key`, matching the existing `eventflow-api-<name>` convention) feeds the sidecar's `DD_API_KEY`. `DD_SITE=us5.datadoghq.com` is a plain (non-secret) env var. Neither reaches the `api` container's own env — the API app process has no Datadog credentials.
- Cloud Run has no bind-mount mechanism for arbitrary config files, so the Agent's `conf.d` (the OpenMetrics scrape target and the TCP log source) is baked into a custom image at build time (`docker/datadog/Dockerfile`, `FROM gcr.io/datadoghq/agent:latest`) rather than mounted. The one thing that differs between docker-compose and Cloud Run — the scrape target's host (`host.docker.internal` locally, `localhost` on Cloud Run, since containers there share the pod's network namespace) — is injected via the Agent's own `METRICS_SCRAPE_HOST` env var and Datadog's `%%env_VARNAME%%` config templating, so the same built image serves both.
- `google_cloud_run_v2_service` declares both containers (`api`, `datadog-agent`) with `name` attributes, no `depends_on`/`startup_probe` between them — `terraform apply` runs before `deploy-datadog-agent` ever pushes the real image, so a probe against the Agent's healthcheck would target a placeholder that can't serve it. Pino's `reconnect`/`recovery` already tolerate the Agent not being up yet, so no startup ordering is needed.
- Both containers bootstrap from the same `hello` placeholder image before their real images land. Cloud Run sidecars share one network namespace, so `datadog-agent` declares its own `ports { container_port = 8081 }` — a distinct port from `api`'s 8080, injected as that container's own `PORT` — rather than both containers competing for the same one.
- `deploy.yml`'s per-release image swap uses `gcloud run services update SERVICE --image=... --container=NAME` (a scoped patch), not `gcloud run deploy` — the latter's multi-container form expects every container respecified via repeated `--container` flags, and using it for a single-container update would have dropped the sidecar from the live revision on the next release.

### Local parity: docker-compose

A real `datadog-agent` container is added to `docker-compose.yml`, forwarding to the same Datadog org as production. `DD_API_KEY` is sourced from a new root-level `.env` (gitignored) — docker-compose auto-loads `.env` from its own directory; `apps/api/.env` is scoped to the Nest app's own Zod-validated env, not infra containers.

### Logs fan out to the same Agent

- `pino.config.ts` gains `base: { service: 'api', env: env.NODE_ENV }` — merges into every log line, the same mechanism already carrying `pid`/`hostname`.
- Delivery: `pino.transport({ targets: [...] })` with two targets — the existing stdout target, plus a `pino-socket` TCP target pointed at a custom TCP log source configured on the Agent (local and Cloud Run sidecar alike, both reachable over `localhost`).
- `DD_API_KEY` stays out of `env.ts` entirely — only the Agent container needs it, keeping Datadog credentials out of the app process for logs the same way as for metrics.

## Alternatives Considered

- **`serverless-init` + `dd-trace`** — Datadog's documented turnkey Node.js Cloud Run pattern. Rejected: no support for arbitrary custom Prometheus counters (DogStatsD distributions only), and pairs with Datadog's own APM tracer instead of vanilla OpenTelemetry.
- **`pino-datadog-transport` direct to Datadog's log intake API** — the mechanism ADR 0005 originally named. Rejected in favor of routing through the sidecar: keeps `DD_API_KEY`/`DD_SITE` out of the app process, and avoids the app depending on Datadog's HTTP intake being reachable independent of the sidecar.
- **OTLP logs ingestion via the Agent** — rejected for now: requires the OpenTelemetry Logs SDK in the app, out of scope until real OTel trace instrumentation is added.
- **Interceptor-based metric increments** — rejected in favor of inline `.inc()` calls; one abstraction for two call sites isn't worth it.
- **Enabling the Agent's OTLP receiver preemptively** — rejected; no sender exists yet, add it alongside actual OTel SDK work.
