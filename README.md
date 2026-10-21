# .github
Org-level shared workflows and config

The issue-intake reusable workflow combines the existing assignment policy for
six allowlisted repositories with the read-only Project workflow. Other callers,
including OpenSID-Issues, retain read-only permissions and never auto-assign.
See `.github/issue-assignment-rules.json`; existing assignees, manager exceptions
and Personal's recurring exclusion are preserved.

The `ci-scope` composite action skips only confidently irrelevant PR changes.
Pushes to default branches always run full tests. Unknown paths, missing git
history and invalid configuration fail open to full testing. Renames check both
deleted and added paths. Every
consumer keeps an always-running CI gate; no workflow-level path skip hides a
required result. Gumchord web and worker scopes remain separate.

Rollout order: merge this shared PR first; then Property's read-only drift
compatibility and the six intake callers; merge General's drift repair changes
last, so repair cannot revert the new caller or activate it before its dependency.
CI scope consumers pin the tested shared commit, not an unreviewed branch.
No live settings, PATs, issue data, scheduler ownership or ledgers are changed
by preparing these PRs.

Add to project accepts issue events only; PRs are not added or estimated by this workflow.
The reusable job and canonical caller both guard the event type. Reopened issues return
to Todo, and the existing repository-scoped estimate rules are unchanged.

The canonical `.github/project-estimate-rules.json` is loaded from `main` by
both issue intake and General's scheduled estimator/backfill. The expired-auction
social-post cleanup, weekly autopost audit and weekly Not Planned review families
use 0.5 hours. The approved Permata Pering photo/price/input task also uses 0.5
hours, matched by its exact title rather than broadly reducing other media work.
These rules do not bulk-rewrite estimates already present on the Project board.
The dated `Tindak lanjuti inquiry Rumah123` daily follow-up family also uses
0.5 hours; the rule does not cover bulk chat exports or differently scoped work.

All executable workflow jobs use GitHub-hosted Ubuntu. Merge this shared workflow and
its caller template before the caller PRs in other repositories, so the drift detector
does not restore an outdated template. Existing queued runs use their original workflow
revision and are not proof of the new configuration.
