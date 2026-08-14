# EventFlow

## Required reading

Before making architectural or dependency decisions, comply with:

- `docs/prds/` — product requirements for this take-home
- `docs/adrs/` — accepted architecture decisions (stack, repo structure, testing, CI/CD)

New ADRs go in `docs/adrs/`, numbered sequentially (`000N-title.md`). If an implementation choice would contradict an accepted ADR, flag it rather than silently deviating.

## Issue tracking

Issues live in the GitHub repo's Issues tab (`gs00s/eventflow`), not as local files or a separate tracker. Every branch/PR/commit traces back to an issue number.

## Git commits, branches, and PRs

All follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `chore`, `docs`, etc.), scoped to the issue id:

- **Branch**: `<type>/<issue-id>-<slug>`, e.g. `docs/1-record-stack-and-repo-structure-design-decisions`
- **PR title**: `<type>(<issue-id>): <description>`, e.g. `docs(1): record stack and repo structure design decisions`
- **Commit message**: same format as the PR title, e.g. `fix(12): correct VIP guard role check` — the scope already identifies the issue, no need to repeat it in the body

Never add a `Co-Authored-By: Claude` trailer, or any other self-attribution, to commit messages.

## Engineering principles

- **Official docs first.** When adding a new technology or library, implement it the way its official documentation shows, not from memory or blog-post patterns. Check current docs before wiring something in.
- **Minimalism.** Fewer moving parts, less code. Prefer the smallest solution that satisfies the requirement over a more "complete" or extensible one. Simplicity is king — don't add abstraction, config, or dependencies the current scope doesn't need.
- **Latest versions.** Always target the latest stable version of languages, runtimes, and packages — don't pin down or fall back to an older version to sidestep a local environment mismatch; update the environment instead.
- **No unnecessary comments.** Default to no comments. Only add one when the WHY is non-obvious (a hidden constraint, a workaround, invisible default behavior) — never to restate what the code/config already says.
- **Tests live next to the code they test.** Co-locate specs with the production file (e.g. `speakers.service.spec.ts` beside `speakers.service.ts`, `app.module.integration.spec.ts` beside `app.module.ts`). No separate `test/` or `__tests__/` directories, including for integration tests.
- **Test files use `.spec.` everywhere, never `.test.`.** Same convention on both `apps/api` and `apps/web` — don't let backend/frontend drift onto different naming.
