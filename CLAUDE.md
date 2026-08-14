# EventFlow

## Required reading

Before making architectural or dependency decisions, comply with:

- `docs/prds/` — product requirements for this take-home
- `docs/adrs/` — accepted architecture decisions (stack, repo structure, testing, CI/CD)

New ADRs go in `docs/adrs/`, numbered sequentially (`000N-title.md`). If an implementation choice would contradict an accepted ADR, flag it rather than silently deviating.

## Git commits

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, etc.).

Never add a `Co-Authored-By: Claude` trailer, or any other self-attribution, to commit messages.

## Issue tracking

Issues live in the GitHub repo's Issues tab (`gs00s/eventflow`), not as local files or a separate tracker.
