# .github

Organization-level policy data and shared PR/CI actions.

## Issue operations belong to Property web

Assignment, Project #4 intake/reopen handling, deterministic estimates,
missing-estimate backfill, stale handling and issue alerts run in the Property
web scheduler. The production handoff and first natural tick were verified on
22 October 2026 at 09:15:16 WITA. See
[Property's migration guide](https://github.com/ditrois/property/blob/prod/docs/issue-operations-migration.md).

The retired `add-to-project.yml` and `issue-intake.yml` reusable workflows have
been removed. Callers in the other repositories are retired as well. Tests
prevent restoring issue-triggered workflows or references to those reusables.
Historical caller templates are inert rollback references, not workflows to
install. Restore them only as part of a separately approved coordinated rollback.

Keep `.github/issue-assignment-rules.json` and
`.github/project-estimate-rules.json`: the web worker reads these files from
`main`. The six assignment policies, manager/recurring exclusions and fractional
0.25/0.5-hour estimates are unchanged. Rule changes do not bulk-rewrite existing
Project estimates.

## PR/CI actions remain unchanged

The `ci-scope` composite action skips only confidently irrelevant PR changes.
Pushes to default branches always run full tests. Unknown paths, missing git
history and invalid configuration fail open to full testing. Renames check both
deleted and added paths. Consumers keep an always-running CI gate and pin the
tested shared action commit. Gumchord web and worker scopes remain separate.

This cleanup changes no production settings, tokens, leave data, security
settings or deployment behavior.
