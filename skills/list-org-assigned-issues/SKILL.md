---
name: list-org-assigned-issues
description: Reliably list GitHub issues assigned to any supplied user across every repository in any supplied organization, then optionally rank the open work from easiest to hardest. Use for requests such as "list all issues assigned to USER in ORG", "show USER's work across all ORG repos", or "sort ORG issues assigned to USER by easiest work". Never trust a single organization-wide connector search when completeness matters; enumerate repositories and search each repository individually.
---

# List Organization Assigned Issues

Reliably collect issues assigned to a dynamic GitHub user across all repositories in a dynamic GitHub organization.

## Inputs

Resolve these values from the user's request:

- `ORG`: GitHub organization login, for example `ditrois`.
- `ASSIGNEE`: exact GitHub username, for example `Premanandaa`.
- `STATE`: `open` by default. Use `closed` or `all` only when requested.
- `SORT_MODE`: `easiest` when the user asks for effort ranking; otherwise use `repository` or `updated` as requested.
- `INCLUDE_PRS`: `false` by default. GitHub issue search can include pull requests, so explicitly exclude PRs from the final result unless requested.

Usernames and organization names are dynamic. Do not hard-code `ditrois`, `Premanandaa`, or `@me`.

## Required tools

Prefer the connected GitHub app for repository discovery and issue inspection. Use GitHub CLI as the authoritative fallback when available.

## Reliability rule

Do not rely on one connector call that searches multiple repositories or an entire organization. Some connectors can return only a partial subset.

For complete results:

1. Enumerate every repository accessible under `ORG`.
2. Search each repository individually for `assignee:ASSIGNEE` and the requested state.
3. Merge and deduplicate results by canonical key `repository_full_name#issue_number`.
4. Exclude pull requests unless `INCLUDE_PRS=true`.
5. Report repositories searched, repositories with matches, result count, and any repository that failed.

A result is not complete unless every discovered repository was searched or explicitly reported as failed/inaccessible.

## Workflow A: GitHub connector

### 1. Resolve the organization installation

- List GitHub App installations.
- Match the installation whose account login equals `ORG`, case-insensitively.
- If there is no matching installation, state that the connected GitHub app cannot access that organization.

### 2. Enumerate every repository

- Call the installation repository listing with pagination.
- Continue until a page returns fewer than the requested page size or no repositories.
- Keep only repositories whose owner login equals `ORG`.
- Include private, public, and archived repositories unless the user asks to exclude archived repositories.
- Record the exact repository count and full names.

### 3. Search one repository at a time

For each repository, call issue search with:

- `repository_full_name`: exactly one repository, never an array.
- `query`: `assignee:ASSIGNEE`.
- `state`: `open` or `closed` when a single state is requested.
- `topn`: high enough to avoid truncation, preferably 100.

When `STATE=all`, run both `open` and `closed` searches per repository and merge them.

Do not put `org:`, `repo:`, `is:issue`, or `is:open` qualifiers inside the connector query when equivalent structured parameters are available.

### 4. Validate matches

For every returned item:

- Confirm its repository belongs to `ORG`.
- Confirm the assignee list contains `ASSIGNEE`, case-insensitively. Fetch the issue when the search result does not include assignees.
- Exclude pull requests. A result with pull-request metadata is not an issue.
- Preserve title, repository, issue number, state, URL, body, labels, assignees, milestone, comments count, created date, and updated date when available.

### 5. Deduplicate

Use this key:

`lower(repository_full_name) + "#" + issue_number`

If duplicates disagree, prefer the fetched issue snapshot over a search snippet.

## Workflow B: GitHub CLI fallback

When GitHub CLI is available and authenticated, use it to cross-check the connector result.

For one state:

```bash
gh search issues \
  --owner "$ORG" \
  --assignee "$ASSIGNEE" \
  --state "$STATE" \
  --limit 1000 \
  --json repository,number,title,state,url,assignees,labels,createdAt,updatedAt,body
```

For all states, omit `--state` and still use `--limit 1000`.

Exclude pull requests by keeping only results returned by `gh search issues`; do not substitute `gh search prs`.

If the CLI count and connector count differ:

1. Treat the CLI result as the completeness cross-check.
2. Identify missing repository/issue keys.
3. Fetch missing issues directly through the connector when possible.
4. Clearly report any unresolved mismatch.

## Effort ranking

Only rank open issues unless the user explicitly requests closed issues to be ranked.

Estimate remaining effort from the current issue body, labels, latest human comments, dependencies, and whether work has already been submitted. Ignore stale-bot or automation comments when estimating substantive progress.

Assign a score from 1 to 5:

### Score 1 — Very easy

- One clear action.
- No external dependency.
- Usually under one hour.
- Examples: update a link, make several posts, fill a known field, confirm access.

### Score 2 — Easy

- Small research, data entry, or a few repetitive actions.
- Limited coordination.
- Usually one to three hours.

### Score 3 — Medium

- Several steps, moderate research, coordination, or a half-day task.
- May depend on another person but can substantially progress now.

### Score 4 — Hard

- Multi-day work, extensive historical review, campaign execution, procurement, or several stakeholders.
- Significant ambiguity or dependencies.

### Score 5 — Very hard / blocked

- Government/legal processes, uncontrolled external waiting, unclear ownership, major technical implementation, or critical missing prerequisites.

Tie-breakers, in order:

1. Fewer blockers first.
2. Smaller remaining scope first.
3. Earlier explicit due date first.
4. Older updated date first.

Always label estimates as judgments, not facts.

## Output format

Start with a completeness summary:

- Organization.
- Assignee.
- Requested state.
- Repositories searched.
- Repositories containing matches.
- Total unique issues.
- Failed or inaccessible repositories, if any.

Then list issues in the requested order. For each issue include:

1. Linked `repository #number — title`.
2. Estimated difficulty and effort range when ranking was requested.
3. A concise description of remaining work.
4. Important blocker, dependency, deadline, or stale/escalation label.

End with a recommended execution order when `SORT_MODE=easiest`.

Do not claim "all repositories" unless repository enumeration completed and every repository was searched or explicitly reported as failed.

## Verification checklist

Before answering, confirm all of the following:

- [ ] `ORG` came from the user or was unambiguously resolved.
- [ ] `ASSIGNEE` came from the user or was unambiguously resolved.
- [ ] Every accessible repository in `ORG` was enumerated with pagination.
- [ ] Each repository was searched individually.
- [ ] Pull requests were excluded unless requested.
- [ ] Results were deduplicated by repository and issue number.
- [ ] Search-result assignees were verified when needed.
- [ ] Counts and failed repositories were disclosed.
- [ ] Effort ranking reflects remaining work, not just title length.
- [ ] A CLI cross-check was used when available, or its absence was disclosed.

## Example requests

- `List all open issues assigned to premanandaa across every repo in ditrois and sort easiest first.`
- `Show all closed issues assigned to Madeersani in ditrois, grouped by repository.`
- `List my open issues across Expensify.`

For `my` or `@me`, resolve the authenticated GitHub username first, then use that exact login as `ASSIGNEE`.