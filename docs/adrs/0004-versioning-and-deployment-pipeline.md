# ADR 0004: Versioning and Deployment Pipeline

## Status

Accepted

## Context

ADR 0001 deferred "CI + deploy" entirely. This picks it up: how a release gets a version, how production infra is provisioned, and how a release reaches production. Recorded as one ADR, not three, since it's one coherent story.

## Decision

### Versioning

Conventional Commits → `semantic-release`, fully automatic: on every push to `main`, it computes the next semver bump (`fix`/`feat`/`BREAKING CHANGE`; `chore`/`docs`/etc. don't release), commits the bump with `[skip ci]`, and pushes a `vX.Y.Z` tag. No manual gate.

The push/tag is authenticated with `RELEASE_TOKEN` (a fine-grained PAT, Contents: Read and write), not the default `GITHUB_TOKEN` — GitHub doesn't let `GITHUB_TOKEN`-authored events trigger other workflows. `deploy.yml` listens for `on: release: types: [published]`, matching what `@semantic-release/github` actually does (calls the Releases API), rather than a tag-push trigger.

One version for the whole monorepo (root `package.json`), not per-app. This repo's commits scope by issue id, not package, so `semantic-release`'s path/scope-based monorepo detection doesn't map on cleanly — and `apps/api`/`apps/web` are tightly coupled via `packages/shared-types` anyway. Every release redeploys both.

No branch protection on `main`. Considered requiring PR + passing checks with a bypass for the release bot's own push, but that needs a Personal Access Token from an admin account — an ongoing credential to manage for a repo with a single maintainer, guarding mainly against that same maintainer's own accidental direct push. Revisit if this becomes a team repo.

ADR 0001's separate "push to main: build only" workflow is dropped — `pr.yml` already builds before every merge. `deploy.yml` covers the actual-release case instead: for now it only builds the API's Docker image (validation, no push); the full push-to-Artifact-Registry-and-deploy steps land once the infra to deploy to exists (see Deployment pipeline, below).

### Infrastructure (Terraform)

Single production environment, `us-east4`, default Firebase/Cloud Run addresses — chosen to colocate with Neon's `aws-us-east-1` (N. Virginia) database region, minimizing DB round-trip latency; GCP has no direct AWS-region equivalent, but `us-east4` (Ashburn, VA) is the closest match, unlike `us-east1` (South Carolina).

**State backend**: Terraform Cloud, execution mode Local — state storage/locking only, `plan`/`apply` run in GitHub Actions. Chosen over a GCS bucket to avoid the chicken-and-egg problem of a backend needing its own storage to exist first; a TFC workspace's creation is a normal one-time manual step, not a self-referential resource.

**Auth**: GitHub → GCP via Workload Identity Federation, no standing key. GitHub → TFC via a static `TF_API_TOKEN` — a **user** API token, not a team token: HCP Terraform's Free plan has no Team management, so there's no way to scope it to a single workspace. OIDC isn't an alternative here either — HCP Terraform's OIDC/dynamic-credentials feature only lets a run _executing inside HCP Terraform_ authenticate _out_ to a cloud provider, not an external CLI (GitHub Actions) authenticate _into_ HCP Terraform's API in place of a static token (verified against HashiCorp's docs, see Alternatives). TFC never holds GCP credentials.

**Bootstrap**: the WIF pool/provider/service-account/IAM-bindings live in their own `infra/bootstrap/` config and HCP Terraform workspace (`eventflow-bootstrap`), separate from the CI-driven `infra/` (`eventflow-cli`). Applied once, manually, as the operator's own already-authenticated identity (Cloud Shell or a local machine with `gcloud`/`terraform` set up — either works, since what matters is a real human identity, not where the terminal runs). GitHub Actions never has a path to this state at all — no secret or workflow references it. This isn't just about seeding the first trusted identity (every cloud IAM system needs that once); it's specifically to avoid a self-lockout risk: if the CI-driven pipeline could touch the resources that authenticate it, a bad apply could destroy its own trust chain with nothing left able to fix it.

Write-level GCP roles are granted to the service account one at a time, in whichever ticket first needs them — it starts with `roles/viewer` only.

**Database**: Neon Postgres, fully declarative via its own Terraform provider.

**Backend**: Cloud Run, public (`allUsers` granted `run.invoker`) — Firebase Hosting's classic `firebase.json`-style rewrite has no per-project service agent to grant `run.invoker` to instead; Google's own docs confirm the rewrite mechanism requires the target service to allow unauthenticated invocations, full stop. (Originally planned to keep Cloud Run private with only the rewrite able to reach it — not achievable with this integration; see Alternatives.) The raw `*.run.app` URL is therefore a second reachable entry point alongside Hosting, same as most Firebase+Cloud Run deployments; the actual security boundary is the API's own auth layer (Better Auth sessions), not network reachability.

**Frontend**: Firebase Hosting, `/api/**` rewritten to Cloud Run — gives same-origin cookies for free per ADR 0002, no custom proxy needed.

**Secrets**: `DATABASE_URL` (Neon provider output) and `BETTER_AUTH_SECRET` in Secret Manager, mounted into Cloud Run. `BETTER_AUTH_SECRET`'s value is generated once by hand, not by Terraform — a `random_password` resource getting replaced would silently regenerate it and invalidate every session. `CORS_ORIGIN`/`BETTER_AUTH_URL` are plain env vars pointed at the Hosting URL; no `env.ts` changes needed. `PORT` is not one of them — Cloud Run reserves that name and injects it automatically based on the container's configured port, an explicit `PORT` env var is rejected outright.

**Layout**: flat `infra/` directory, no module hierarchy (single environment). `terraform-plan.yml` on PRs touching `infra/**` lints/validates/plans for review; `apply` itself doesn't run on every push to `main` — it's a step in the tag-triggered deployment pipeline below, so infra changes land in lockstep with the release that needed them rather than on a separate trigger.

### Deployment pipeline

Triggered by `on: release: types: [published]` — the release `semantic-release` publishes. One pipeline, so infra and app changes for a release ship together:

- `terraform plan -out=tfplan` then `terraform apply tfplan` against `infra/`, both in this same job — a fresh plan, not the one computed during the PR's review. Terraform refuses to apply a saved plan against state that's changed since it was computed, and there's no reliable way to hand a specific PR's plan artifact to a tag-triggered run anyway (a release can be cut by a commit that never touched `infra/` at all). The PR's plan is for human review only.
- Migrations run immediately after, while the old revision still serves — requires an expand/contract pattern (additive first) since old code must tolerate the new schema during the overlap. Not run at container startup, to avoid concurrent instances racing to migrate.
- Backend: build a new multi-stage `Dockerfile` for `apps/api` (handles the pnpm workspace), tag with the git tag, push to Artifact Registry, `gcloud run deploy`.
- Frontend: `vite build`, `firebase deploy --only hosting`, after the backend — so the new frontend is never live before the API it expects.
- Same WIF-based service account for every step.
- Rollback is a manual runbook (`gcloud run services update-traffic`, `firebase hosting:rollback`), not automated — deliberate scope cut.

## Alternatives Considered

- **GCS bucket as state backend** — same bootstrap problem, but as a workaround rather than TFC's normal setup flow.
- **Service-account key for GitHub → GCP** — long-lived, unscoped to repo/branch, standing leak risk. WIF instead.
- **OIDC for GitHub → TFC** — doesn't exist for this direction. HCP Terraform's dynamic-credentials feature is for a run inside HCP Terraform authenticating to a cloud provider, not for an external CLI authenticating to HCP Terraform itself.
- **Team-scoped `TF_API_TOKEN`** — not available: Team management is gated behind a paid HCP Terraform plan. The user token is broader-scoped than intended, mitigated only by using a token dedicated to CI (separate from the maintainer's own `terraform login` session) so it can be rotated independently.
- **Separate bootstrap-only service account** — smaller blast radius, but one more identity to reason about than the payoff justifies here.
- **WIF resources managed in the same CI-driven `infra/` state as everything else** — Google's own docs on WIF for deployment pipelines don't address this at all (they assume the pool/provider already exist); the wider Terraform community's converged answer is to keep this in its own state, since letting the automated pipeline manage its own trust chain risks a self-lockout with no path to fix it except manual intervention anyway.
- **`release-please`** — Release-PR model adds a manual gate; the goal here is full continuous deployment.
- **Independent per-app versioning** — this repo's commits scope by issue id, not package, so per-app detection doesn't map on cleanly.
- **TFC VCS-driven execution** — would move pipeline logic out of versioned GitHub Actions config into TFC's own UI settings.
- **Private Cloud Run reachable only via Firebase Hosting's rewrite** — the original plan; abandoned once implementation showed `firebasehosting.googleapis.com` has no generated service agent to grant `run.invoker` to, and Google's own docs confirm the classic Hosting rewrite requires public Cloud Run. Not worth chasing the newer, separate Cloud Run "integrations" feature or a custom proxy just to keep the raw `*.run.app` URL private — the API's own auth layer is the real boundary either way.
- **Automated rollback** — deferred as a future improvement.
- **Custom domain** — deferred; ship on default addresses first.
