# ADR 0007: OpenTelemetry Tracing

## Status

Accepted

## Context

Logs (ADR 0005) and metrics (ADR 0006) reach Datadog through the Agent sidecar; traces are the missing signal. ADR 0006 explicitly deferred this: "The Agent's OTLP receiver is left disabled. No OpenTelemetry SDK instrumentation exists in the app yet ... Turn it on together with real OTel SDK work later." This is that work: request-level and database-call spans, automatic (no hand-written span code at call sites), forwarded through the same sidecar the other two signals already use.

## Decision

### Library: `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node`

- `getNodeAutoInstrumentations()` patches `http`, `express` (what `@nestjs/platform-express` sits on), and `pg` (what `drizzle-orm/node-postgres` sits on) out of the box — request spans and DB-call spans both come from the same one call, matching "automatic" from the requirement. No per-controller or per-repository span code.
- Vanilla OpenTelemetry, not `dd-trace` — ADR 0006 already rejected Datadog's own tracer (`serverless-init` + `dd-trace`) in favor of staying vendor-neutral; this is that decision's other half.

### Bootstrap: a preloaded `tracing.ts`, not app code

- New `apps/api/src/tracing.ts`: builds and starts the `NodeSDK`, nothing else. Instrumentation has to patch `http`/`express`/`pg` before the app's own `require` calls pull them in, so it can't live inside `main.ts` or any Nest provider — those already run after those modules are loaded.
- `start` (`Dockerfile` `CMD`, `package.json`) loads it via `node -r ./dist/src/tracing.js dist/src/main.js` — Node's `-r` preload, executed before `dist/src/main.js` starts. The api app has no `"type": "module"` in `package.json`, so `-r`/CJS is correct here (the ESM equivalent is `--import`, not needed). The leading `./` is load-bearing: `-r` follows `require()` resolution rules, so a bare `dist/src/tracing.js` (no `./`) resolves as a package name against `node_modules` and fails with `MODULE_NOT_FOUND`, not as a relative file path.
- `dev` (`nest start --watch`) has no dist to point `-r` at and manages its own compilation, so it preloads the TS source directly instead: `NODE_OPTIONS='-r tsx/cjs -r ./src/tracing.ts' nest start --watch`. `tsx/cjs` registers a require hook that lets the second `-r` resolve a `.ts` file; `NODE_OPTIONS` applies to the child process Nest's watcher spawns to run the app, same env-inheritance mechanism used everywhere else in this repo's dev tooling.
- `tracing.ts` imports `dotenv/config` itself, first line — it runs before `main.ts`'s own `import 'dotenv/config'`, so without this, `apps/api/.env` wouldn't be loaded yet when `tracing.ts` reads `env.DATADOG_OTLP_HTTP_PORT`. A second `dotenv/config` call is a no-op (existing `process.env` keys aren't overwritten); in Docker/Cloud Run, where there's no `.env` file, both calls are no-ops anyway since real env vars are already set by the platform.

### Exporter: OTLP/HTTP (protobuf), to the Agent's OTLP receiver

- `@opentelemetry/exporter-trace-otlp-proto` — OTLP's own docs and the SDK's own README example use this as the default; JSON (`exporter-trace-otlp-http`) is the alternative, not the default.
- Target: `http://127.0.0.1:${env.DATADOG_OTLP_HTTP_PORT}/v1/traces`. Same fixed-localhost pattern already used for logs (`DATADOG_LOG_TCP_PORT` / `pino-socket`) and the same reasoning: on Cloud Run the `api` and `datadog-agent` containers share the pod's network namespace, so `localhost` reaches the sidecar directly; locally, docker-compose's `ports: ['4318:4318']` on `datadog-agent` publishes the same port to the host's `127.0.0.1`, so the identical URL works whether `api` is running in Cloud Run or on the local host. New `env.ts` entry, `DATADOG_OTLP_HTTP_PORT`, mirrors `DATADOG_LOG_TCP_PORT`'s shape exactly (`z.coerce.number().default(4318)`).

### Datadog Agent: turn the OTLP receiver on

- `DD_OTLP_CONFIG_RECEIVER_PROTOCOLS_HTTP_ENDPOINT=0.0.0.0:4318` and `DD_APM_ENABLED=true` on the `datadog-agent` container, both `infra/cloud-run.tf` and `docker-compose.yml` — `DD_APM_ENABLED` isn't just the OTLP receiver's on/off switch, it's what starts the Agent's `trace-agent` process at all; OTLP-received spans feed into that same pipeline before reaching Datadog, so without it there's a receiver with nowhere to forward what it receives.
- No change to `docker/datadog/conf.d/` — unlike the OpenMetrics scrape target and the TCP log source, OTLP ingestion is configured entirely through Agent env vars, no baked-in config file needed.

### Resource attributes: unified service tagging, matching logs and metrics

- `service.name: 'api'` (via `ATTR_SERVICE_NAME` from `@opentelemetry/semantic-conventions`) and `'deployment.environment.name': env.NODE_ENV` — the same `service`/`env` pair `pino.config.ts` and `metrics/registry.ts` already stamp on every log line and metric, so all three signals correlate under one service in Datadog's UI.
- `deployment.environment.name`, not the older `deployment.environment` — OTel semantic conventions deprecated the latter as of v1.27.0; Datadog Agent 7.58.0+ (this project pins `:latest`) reads the new key.

## Alternatives Considered

- **`dd-trace` (Datadog's own Node tracer)** — turnkey, but vendor-specific; ADR 0006 already ruled this class of tool out for the same reason (`serverless-init` + `dd-trace`), no new argument for revisiting it here.
- **Manual span instrumentation** (hand-written spans in controllers/repositories) — rejected: `getNodeAutoInstrumentations()` already covers both signals the requirement asks for (HTTP requests, DB calls) with zero call-site code; manual spans would be pure duplication until a gap actually shows up that auto-instrumentation can't cover.
- **OTLP gRPC exporter, port 4317** — HTTP was chosen to match the existing sidecar pattern (TCP log source, OpenMetrics scrape are both plain HTTP/TCP, no gRPC anywhere in `docker/datadog/`); no reason to introduce a second protocol for one signal.
- **Log-trace correlation (injecting `trace_id`/`span_id` into pino output)** — genuinely useful, deliberately out of scope here. This ADR is traces existing at all; correlating them with the logs ADR 0005 already ships is a natural follow-up, not a dependency of it.
