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

## Cost-aware PR/CI actions

The `ci-scope` composite action skips only confidently irrelevant documentation
changes on PRs and default-branch pushes. Pushes inspect the complete event
`before..after` range, so a code commit followed by a documentation commit still
runs the full suite. Force pushes, branch creation/deletion, unknown paths,
missing git history and invalid configuration fail open to full testing. Renames
check both deleted and added paths. Operational Property retirement documents
remain test inputs. Gumchord web and worker scopes remain separate, including
shared contracts that must test both applications.

Consumers keep their existing test commands and always-running CI gates, and pin
the tested shared action commit. Superseded PR checks can be cancelled, but
default-branch CI is not cancelled by a later documentation-only push: the earlier
code change still needs its tests to finish. Manual runs always run full tests.

The organization shares the Free plan's 2,000 included minutes per month; reducing
workflow-file count alone does not reduce runner time. Keep a margin for app PRs,
retain the zero-overage budget, and use the billing dashboard's included-minutes
counter rather than gross minutes (which also include exempt public/Dependabot
usage). These CI optimizations do not guarantee a fixed monthly total at arbitrary
PR volume, and do not restore minutes already spent.

This CI work changes no production settings, tokens, leave data, security
settings or deployment behavior.
