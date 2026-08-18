# ADR 0004: Versioning and Deployment Pipeline

## Status

Accepted

## Context

ADR 0001 deferred "CI + deploy" entirely. This picks it up: how a release gets a version, how production infra is provisioned, and how a release reaches production. Recorded as one ADR, not three, since it's one coherent story.

## Decision

### Versioning

Conventional Commits → `semantic-release`, fully automatic: on every push to `main`, it computes the next semver bump (`fix`/`feat`/`BREAKING CHANGE`; `chore`/`docs`/etc. don't release), commits the bump with `[skip ci]`, and pushes a `vX.Y.Z` tag. No manual gate.

One version for the whole monorepo (root `package.json`), not per-app. This repo's commits scope by issue id, not package, so `semantic-release`'s path/scope-based monorepo detection doesn't map on cleanly — and `apps/api`/`apps/web` are tightly coupled via `packages/shared-types` anyway. Every release redeploys both.

No branch protection on `main`. Considered requiring PR + passing checks with a bypass for the release bot's own push, but that needs a Personal Access Token from an admin account — an ongoing credential to manage for a repo with a single maintainer, guarding mainly against that same maintainer's own accidental direct push. Revisit if this becomes a team repo.

### Infrastructure (Terraform)

Single production environment, `us-central1`, default Firebase/Cloud Run addresses.

**State backend**: Terraform Cloud, execution mode Local — state storage/locking only, `plan`/`apply` run in GitHub Actions. Chosen over a GCS bucket to avoid the chicken-and-egg problem of a backend needing its own storage to exist first; a TFC workspace's creation is a normal one-time manual step, not a self-referential resource.

**Auth**: GitHub → GCP via Workload Identity Federation, no standing key. GitHub → TFC via a static `TF_API_TOKEN` scoped to a single-workspace team (TFC's OIDC support for this is newer/less proven — deferred, see Alternatives). TFC never holds GCP credentials.

**Bootstrap**: one GCP service account for both bootstrap and ongoing use. One manual `terraform apply` from Cloud Shell (browser-based, no local install) creates the account, WIF pool/provider, and role bindings; everything after runs from GitHub Actions via WIF. Some human-authenticated action has to seed the first trusted identity in any cloud's IAM — the goal is making it a single disposable browser action, not a standing dependency.

**Database**: Neon Postgres, fully declarative via its own Terraform provider.

**Backend**: Cloud Run, `--no-allow-unauthenticated`. Only Firebase Hosting's rewrite (granted `run.invoker`) can reach it — one public entry point, not two. Doesn't affect local dev (`pnpm dev` never touches deployed infra) or direct debugging (any principal explicitly granted `run.invoker` can still call it with an identity token).

**Frontend**: Firebase Hosting, `/api/**` rewritten to Cloud Run — gives same-origin cookies for free per ADR 0002, no custom proxy needed.

**Secrets**: `DATABASE_URL` (Neon provider output) and `BETTER_AUTH_SECRET` in Secret Manager, mounted into Cloud Run. `BETTER_AUTH_SECRET`'s value is generated once by hand, not by Terraform — a `random_password` resource getting replaced would silently regenerate it and invalidate every session. `CORS_ORIGIN`/`BETTER_AUTH_URL`/`PORT` are plain env vars; no `env.ts` changes needed.

**Layout**: flat `infra/` directory, no module hierarchy (single environment). `terraform-plan.yml` on PRs touching `infra/**` lints/validates/plans for review; `apply` itself doesn't run on every push to `main` — it's a step in the tag-triggered deployment pipeline below, so infra changes land in lockstep with the release that needed them rather than on a separate trigger.

### Deployment pipeline

Triggered by `push: tags: ['v*']` — the same tags `semantic-release` creates. One pipeline, so infra and app changes for a release ship together:

- `terraform apply` against `infra/`.
- Migrations run immediately after, while the old revision still serves — requires an expand/contract pattern (additive first) since old code must tolerate the new schema during the overlap. Not run at container startup, to avoid concurrent instances racing to migrate.
- Backend: build a new multi-stage `Dockerfile` for `apps/api` (handles the pnpm workspace), tag with the git tag, push to Artifact Registry, `gcloud run deploy`.
- Frontend: `vite build`, `firebase deploy --only hosting`, after the backend — so the new frontend is never live before the API it expects.
- Same WIF-based service account for every step.
- Rollback is a manual runbook (`gcloud run services update-traffic`, `firebase hosting:rollback`), not automated — deliberate scope cut.

## Alternatives Considered

- **GCS bucket as state backend** — same bootstrap problem, but as a workaround rather than TFC's normal setup flow.
- **Service-account key for GitHub → GCP** — long-lived, unscoped to repo/branch, standing leak risk. WIF instead.
- **OIDC for GitHub → TFC** — newer/less-documented than GCP's WIF path. Deferred, not adopted.
- **Separate bootstrap-only service account** — smaller blast radius, but one more identity to reason about than the payoff justifies here.
- **`release-please`** — Release-PR model adds a manual gate; the goal here is full continuous deployment.
- **Independent per-app versioning** — this repo's commits scope by issue id, not package, so per-app detection doesn't map on cleanly.
- **TFC VCS-driven execution** — would move pipeline logic out of versioned GitHub Actions config into TFC's own UI settings.
- **Public Cloud Run** — doubles the API's live public surface for no benefit once Firebase's rewrite exists.
- **Automated rollback** — deferred as a future improvement.
- **Custom domain** — deferred; ship on default addresses first.
