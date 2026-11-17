# Lab 5 submission source — Section 1, PEEEEEEJA

Use this source to prepare `lab5_sec1_PEEEEEEJA.pdf` once all checks have
evidence. It is intentionally incomplete; do not submit it as a final PDF.
Every link and result must be rechecked against the release commit before
export. Use synthetic data and remove secret values from any screenshots.

## Answer Part 0: Team and Evidence Index

Topic: 7 — Personal Money and Expense Logging System (Pockit).

| Student | ID | GitHub | Evidence of participation |
| --- | --- | --- | --- |
| Polwarit Watthanahemmarat | 67070501067 | [MadMax168](https://github.com/MadMax168) | [PR #57](https://github.com/ovenmakemeheat/Pockit/pull/57), local Docker and browser verification; [Issue #36](https://github.com/ovenmakemeheat/Pockit/issues/36). |
| Guntee Doungmanee | 67070501003 | [ovenmakemeheat](https://github.com/ovenmakemeheat) | Teammate reviews in [PR #44](https://github.com/ovenmakemeheat/Pockit/pull/44) and [PR #48](https://github.com/ovenmakemeheat/Pockit/pull/48). Add deployment and release contributions after execution. |

- [Public repository](https://github.com/ovenmakemeheat/Pockit).
- Submitted tag or full commit: **pending reviewed release**.
- Public web/API URLs and serving commit: **pending GCP access**.
- [C-01 through C-06 evidence index](evidence-index.md). C-01 verified; C-03
  has local evidence. C-02 and C-04 through C-06 remain incomplete.

## Answer Part 1: CI and Quality Gate

- [CI workflow](https://github.com/ovenmakemeheat/Pockit/blob/lab5/.github/workflows/ci-docker.yml),
  [passing PR #50](https://github.com/ovenmakemeheat/Pockit/pull/50), and
  [passing run 44025791559](https://github.com/ovenmakemeheat/Pockit/actions/runs/44025791559)
  on `3057e867b379b017da5a16110afd869c29a694f9` prove C-01.
- Required check on `main`, failing temporary PR and blocked-merge screenshot:
  **pending repository ruleset administrator access** (C-02).

## Answer Part 2: Docker and Reproducible Configuration

- [Docker Compose](https://github.com/ovenmakemeheat/Pockit/blob/lab5/docker-compose.yml),
  [server image](https://github.com/ovenmakemeheat/Pockit/blob/lab5/apps/server/Dockerfile),
  [web image](https://github.com/ovenmakemeheat/Pockit/blob/lab5/apps/web/Dockerfile),
  [Docker ignore](https://github.com/ovenmakemeheat/Pockit/blob/lab5/.dockerignore).
- [PR #57](https://github.com/ovenmakemeheat/Pockit/pull/57) records local
  image build, four migrations, synthetic seed, healthy API/web/DB, and a
  browser journey on source commit `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`.
  Review and merge are pending; clean-clone full-stack run is still to record.
- [Deployment configuration table](deployment.md) explains environment
  variables and which values must stay secret.

## Answer Part 3: GCP Deployment and Persistence

**Pending university GCP budget/access.** There is no public URL, Cloud SQL
instance, deployed revision, or before/after cloud restart/redeploy screenshot.
The local Compose restart retained three synthetic Users, but this does not
prove C-04 or C-05 on GCP. Add direct URLs and numbered, readable screenshots
with the public URL and serving commit when the cloud workflow is tested.

## Answer Part 4: Repeatable Release Pipeline

- [Deployment workflow](https://github.com/ovenmakemeheat/Pockit/blob/lab5/.github/workflows/deploy.yml)
  is present on `lab5`. [PR #56](https://github.com/ovenmakemeheat/Pockit/pull/56)
  documents the release sequence; review and merge are pending.
- Reviewed release PR `lab5` → `main`, passing CI on the release SHA, successful
  deployment run, Cloud Run revisions, image digests and live smoke result:
  **pending GCP access and release** (C-06).
