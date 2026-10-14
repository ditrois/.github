# .github
Org-level shared workflows and config

Add to project accepts issue events only; PRs are not added or estimated by this workflow.
The reusable job and canonical caller both guard the event type. Reopened issues return
to Todo, and the existing repository-scoped estimate rules are unchanged.

All executable workflow jobs use GitHub-hosted Ubuntu. Merge this shared workflow and
its caller template before the caller PRs in other repositories, so the drift detector
does not restore an outdated template. Existing queued runs use their original workflow
revision and are not proof of the new configuration.
