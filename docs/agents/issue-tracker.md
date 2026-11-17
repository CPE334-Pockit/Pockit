# Issue tracker: GitHub

Issues and specs for Pockit live in GitHub Issues in `CPE334-Pockit/Pockit`. Use the `gh` CLI for issue operations.

## Conventions

- Create an issue with `gh issue create --repo CPE334-Pockit/Pockit --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- Read an issue with `gh issue view <number> --repo CPE334-Pockit/Pockit --comments`.
- List issues with `gh issue list --repo CPE334-Pockit/Pockit --state open --json number,title,body,labels,comments`.
- Comment with `gh issue comment <number> --repo CPE334-Pockit/Pockit --body "..."`.
- Apply or remove labels with `gh issue edit <number> --repo CPE334-Pockit/Pockit --add-label "..."` or `--remove-label "..."`.
- Close with `gh issue close <number> --repo CPE334-Pockit/Pockit --comment "..."`.
- Keep issue bodies aligned with the repository's Sprint/Epic and Work item/Sub-issue templates.

## Pull requests as a request surface

**No.** Pull requests are not treated as incoming feature requests for triage.

## When a skill says “publish to the issue tracker”

Create a GitHub issue in `CPE334-Pockit/Pockit`.

## When a skill says “fetch the relevant ticket”

Run `gh issue view <number> --repo CPE334-Pockit/Pockit --comments`.

## Sub-issues and dependencies

Use GitHub's native sub-issues to link bounded work to a parent issue. Use GitHub's native issue dependencies for blocking relationships when available; otherwise record `Blocked by: #<number>` in the issue body.
