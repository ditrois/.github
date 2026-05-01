# Welcome to ditrois 👋

  This repo (`ditrois/.github`) hosts org-wide workflows and shared config.
  This README is the front door for org members.

  ## ✅ Where to find your work

  **The org project board is the single source of truth for everything that
  needs doing.** Issues and pull requests across every repo in `ditrois`
  are auto-added to it.

  > 🔗 **My open todos:** <https://github.com/orgs/ditrois/projects/4/views/5?filterQuery=assignee%3A%40me+is%3Aopen>

  Bookmark that link. It shows every open issue/PR assigned to **you**,
  across every repo. Check it daily.

  Other useful project links:

  - [📋 All open items](https://github.com/orgs/ditrois/projects/4) — the full board
  - [⚙️ Workflows](https://github.com/orgs/ditrois/projects/4/workflows) — board automation rules

  ## 📥 How items end up on the project

  Every active repo in the org runs a tiny GitHub Actions workflow
  (`.github/workflows/add-to-project.yml`) that calls a shared, reusable
  workflow in this repo. When you:

  - **Open** an issue or pull request,
  - **Reopen**, **edit**, **label**, or **assign** an existing one,
  - **Transfer** an issue between repos,
  - Mark a PR **ready for review**,

  …it lands on Project #4 automatically within a few seconds. You don't
  need to add anything by hand.

  ## 📝 Filing work

  - **Bug or task in a specific repo?** Open an issue there. It'll show up
    on the project under that repo's grouping.
  - **Generic todo or org-level thing?** Open an issue in
    [`ditrois/general`](https://github.com/ditrois/general/issues).
  - **Recurring personal/household tasks for Jyo?** They live in
    [`ditrois/personal-jyo`](https://github.com/ditrois/personal-jyo) and
    are auto-created on schedule by the recurring-issues workflow there.
    See that repo's README for the full task table.

  ## 🔧 What lives in this repo

  | Path | Purpose |
  |---|---|
  | `.github/workflows/add-to-project.yml` | Reusable workflow that adds issues/PRs to Project #4. Called by every other repo's caller workflow. |
  | `templates/add-to-project-caller.yml` | Canonical caller content used by the org-wide drift detector. Don't edit unless you know what you're doing. |

  Drift detection lives in `ditrois/general` and runs every Monday — if a
  repo loses its caller workflow, it gets restored automatically.

  ## 🔑 Maintenance notes

  Two PATs power org-wide automation:

  - **`ADD_TO_PROJECT_PAT`** — used by every repo to write to Project #4.
    Stored as a per-repo secret because Free-plan org secrets don't reach
    private repos.
  - **`DRIFT_DETECTOR_PAT`** — used only by `ditrois/general` to scan and
    fix drift across repos.

  A scheduled reminder in `ditrois/general` opens an issue 30 / 14 / 7 / 1
  days before either PAT expires, with the exact rotation steps. Watch
  that repo's issues; act on the reminder.

  ## 🆘 Something's broken?

  - **My issue isn't showing up on the project** — check that the repo has
    `.github/workflows/add-to-project.yml`. The drift detector restores it
    Mondays; you can also trigger it manually:
    ```bash
    gh workflow run drift-detector.yml --repo ditrois/general
  - Auto-add is failing across the org — the PAT has probably expired.
  Check ditrois/general for an open pat-expiry issue.
  - Anything else — file an issue in ditrois/general.
