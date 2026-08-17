# ADR 0004: Versioning and Deployment Pipeline

## Status

Accepted

## Context

ADR 0001 deferred "CI + deploy" entirely: "no live target defined yet; deferred, not ruled out." This ADR picks that up — how a release gets a version number, how the production infrastructure is provisioned, and how each release actually reaches production.

Three genuinely independent pieces make up this decision: versioning automation, infrastructure-as-code, and the deploy pipeline itself. They're recorded together here (rather than as three separate ADRs) because they form one coherent story — how this app ships to production — mirroring ADR 0001's own breadth.

## Decision

### Versioning

**Conventional Commits drive fully automatic releases via `semantic-release`.** On every push to `main`, it inspects commits since the last tag, computes the next semver bump (`fix`→patch, `feat`→minor, `BREAKING CHANGE`→major — `chore`/`docs`/`refactor`/etc. don't trigger a release by default), bumps the version, commits with `[skip ci]`, and pushes a `vX.Y.Z` tag directly to `main`. No manual release gate — a qualifying merge to `main` is a release.

**One version for the entire monorepo**, tracked in the root `package.json` — not independent per-app versions. This repo's commit convention scopes by issue id (`fix(30): ...`), not by package, so `semantic-release`'s usual path/scope-based monorepo detection doesn't map onto it; splitting would mean bolting on path-based change detection for little payoff, since `apps/api` and `apps/web` are already tightly coupled through `packages/shared-types`. The deploy pipeline (below) redeploys both apps on every release regardless of which one actually changed.

**Branch protection is added to `main`**, requiring PR review and passing checks — since a direct push there can now trigger a real production deploy, and `main` currently has none configured at all. An explicit bypass allowance is carved out for the release bot's own push: its job is to land the version-bump commit immediately after the PR that triggered it already merged and passed.

### Infrastructure (Terraform)

**Single production environment**, GCP region `us-central1`, default Firebase/Cloud Run addresses (no custom domain in this phase).

**State backend: Terraform Cloud, execution mode Local.** TFC is used purely for encrypted state storage and locking — every `plan`/`apply` actually executes in GitHub Actions, not TFC's own runners. Chosen over a GCS-bucket backend specifically to avoid a bootstrap chicken-and-egg problem: a GCS backend needs its bucket to exist before Terraform can point at it, which either means a manual `gsutil`/Console step or a separate bootstrap config with local state; a TFC workspace's creation is a normal one-time manual step through TFC's own UI, not a self-referential resource.

**Two independent, non-overlapping auth boundaries**:

- GitHub Actions → Terraform Cloud: a static `TF_API_TOKEN`. This is a long-lived credential, but narrowly scoped — a dedicated TFC team with access to only this one workspace, not an org-wide token — and TFC's own OIDC-based dynamic-credentials support for GitHub Actions is noted as a future improvement rather than adopted now (see Alternatives).
- GitHub Actions → GCP: Workload Identity Federation. No service-account key stored anywhere, ever.

TFC has no GCP credentials configured on it at all in this mode — it never touches GCP.

**A single GCP service account** handles both the one-time bootstrap and all ongoing operations — no separate bootstrap-only identity. One manual `terraform apply`, run once from Cloud Shell (the operator's own already-authenticated `gcloud` identity, entirely browser-based — no local CLI install required), creates the service account, the WIF pool/provider, and every IAM role binding it needs, in one shot. Every apply after that — including any future change to the service account's own permissions — runs from GitHub Actions via WIF. This is an inherent, unavoidable bootstrap step: some human-authenticated action has to seed the first trusted identity in any cloud's IAM system; the goal here is only to make it a single, disposable, browser-only action rather than an ongoing dependency on local tooling or a standing credential.

**Database: Neon Postgres**, provisioned fully declaratively via its own Terraform provider (`neon_project`/`neon_database` resources) rather than clicked up by hand — keeps the database instance itself inside the same plan/review/state flow as everything else, instead of being untracked external state.

**Backend compute: Cloud Run, deployed `--no-allow-unauthenticated`.** Firebase Hosting's own service account is granted `roles/run.invoker` and is the only caller with a path in — nobody can reach the Cloud Run URL directly, so there's exactly one public entry point to the API instead of two. This doesn't affect local development at all (`pnpm dev` never touches deployed infrastructure) and doesn't block debugging the live service either — any principal explicitly granted `run.invoker` (e.g. the operator's own account) can still call it directly with an identity token; it's a scoped grant, not the same thing as reopening the service to the public.

**Frontend: Firebase Hosting** serving the Vite build, with a `/api/**` rewrite to the Cloud Run service. This is what delivers same-origin cookies for free, satisfying ADR 0002's same-origin requirement without introducing a separate reverse-proxy layer of our own.

**Secrets**: `DATABASE_URL` (Neon provider's own output) and `BETTER_AUTH_SECRET` live in Secret Manager, mounted into Cloud Run as environment variables via `--set-secrets`. `BETTER_AUTH_SECRET`'s *value* is deliberately not Terraform-managed — it's generated once by hand (`openssl rand -base64 32`) and added as a secret version out-of-band; Terraform only owns the `google_secret_manager_secret` container. Letting Terraform generate this value (e.g. via `random_password`) would mean any accidental resource replacement (state drift, a bad apply, a manual taint) silently regenerates it and invalidates every active session, or worse, changes a value whose entire job is staying stable and secret. `CORS_ORIGIN`/`BETTER_AUTH_URL` (the Firebase domain) and `PORT` (Cloud Run's own injected value) are plain, non-secret Cloud Run environment variables — no changes to `env.ts` are needed for any of this.

**Artifact Registry**: one Docker repository, same region as Cloud Run.

**Terraform layout**: a flat `infra/` directory (`main.tf`, `iam.tf`, `secrets.tf`, `cloud-run.tf`, `firebase.tf`, `neon.tf`) rather than a module hierarchy — appropriate at single-environment scale; revisit if a second environment is ever introduced.

**CI**: `terraform-plan.yml` (`pull_request`, paths: `infra/**`) posts a plan for review; `terraform-apply.yml` (push to `main`, same paths) applies it. Both authenticate exactly as described above.

### Deployment pipeline

**Triggered by `push: tags: ['v*']`** — exactly the tags `semantic-release` creates, so a release and a deploy are the same event.

- **Backend**: build a new multi-stage `Dockerfile` for `apps/api` (handles the pnpm workspace so `@eventflow/shared-types` builds in), tag the image with the git tag itself (e.g. `v1.2.0`), push to Artifact Registry, then `gcloud run deploy --image ...`.
- **Migrations** run as an explicit pipeline step immediately before `gcloud run deploy`, while the previous revision is still serving traffic — not inside the new container's own startup. Running them at startup would couple migration timing to Cloud Run's own instance-scheduling (multiple instances could start concurrently and race to migrate, and a slow migration delays the revision's health check). Running them as a pipeline step, before the new revision exists, requires every migration to follow an expand/contract pattern — additive changes first (nullable columns, new tables), backfill and tighten constraints in a later migration — since the *old* code must tolerate the new schema for the duration of the overlap.
- **Frontend**: `vite build`, then `firebase deploy --only hosting`, after the backend deploy. Not because Cloud Run's rolling deploy leaves a traffic gap (it doesn't — the old revision keeps serving until the new one passes its health check), but so the new frontend is never live before the API it expects is.
- Both jobs authenticate via the same WIF-based service account already established for infra — no new credential type introduced for deployment.
- **Rollback is a documented manual runbook** (`gcloud run services update-traffic` to shift back to a prior revision; `firebase hosting:rollback` for the frontend), not automated rollback-on-failure. A deliberate scope cut for this phase, not an oversight.

## Alternatives Considered

- **GCS bucket as the Terraform state backend** — rejected due to the bootstrap chicken-and-egg problem: the bucket must exist before Terraform can use it as a backend, which either means a manual out-of-band step anyway or a separate bootstrap config with local state. TFC's one-time workspace creation is the same shape of manual step, but through its own normal "getting started" flow rather than a workaround.
- **A service-account JSON key for GitHub Actions → GCP** — rejected: a long-lived credential with no expiry and no binding to "this came from this specific repo/branch," a standing risk if it ever leaks via a log line, a fork PR, or a misconfigured secret. Workload Identity Federation was chosen instead.
- **GitHub Actions → Terraform Cloud via OIDC instead of `TF_API_TOKEN`** — TFC does support dynamic, keyless credentials for GitHub Actions here too, but it's a newer, less-documented path than GCP's WIF integration. Deferred as a future improvement rather than adopted now; the static token is narrowly scoped to a single workspace in the meantime.
- **A separate bootstrap-only service account**, distinct from the day-to-day runtime identity — considered for blast-radius reduction (a leaked bootstrap credential would only grant IAM-administration rights, not full infra control), but rejected in favor of a single service account for both roles, accepting a broader one-time manual bootstrap step in exchange for one less identity to reason about.
- **`release-please`** (Release-PR model) — rejected in favor of `semantic-release`'s fully automatic model. `release-please` accumulates pending changes into a standing PR and only cuts a release when that PR is merged, adding a deliberate human checkpoint; the desired shape here is full continuous deployment with no manual gate.
- **Independent per-app versioning** — rejected: this repo's commit convention scopes by issue id, not by package, so the commit-message-based (or even path-based) detection either release tool would need doesn't map cleanly onto it, and the payoff doesn't justify the added tooling at this scale.
- **Terraform Cloud VCS-driven execution** (TFC connects to GitHub directly and runs plan/apply itself, with no GitHub Actions workflow needed for infra at all) — rejected in favor of CLI-driven runs from GitHub Actions, keeping all pipeline logic reviewable as versioned code alongside the app's other workflows, rather than split into TFC's own UI-configured settings.
- **Public (`--allow-unauthenticated`) Cloud Run** — rejected: doubles the API's live public surface area (the Firebase domain and the raw Cloud Run URL both serving the same backend) for no benefit once Firebase Hosting's rewrite already provides the intended single path in.
- **Automated rollback-on-failure** — deferred as a future improvement; a documented manual runbook is the v1 scope.
- **Custom domain** — deferred; ship on the default Firebase/Cloud Run addresses first, add DNS/domain verification once the pipeline itself is proven out.
