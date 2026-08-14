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
