# Lab 5 submission source — Section 1, PEEEEEEJA

Use this source to prepare `lab5_sec1_PEEEEEEJA.pdf` once all checks have
evidence. It is intentionally incomplete; do not submit it as a final PDF.
Every link and result must be rechecked against the release commit before
export. Use synthetic data and remove secret values from any screenshots.

## Answer Part 0: Team and Evidence Index

Topic: 7 — Personal Money and Expense Logging System (Pockit).

| Student | ID | GitHub | Evidence of participation |
| --- | --- | --- | --- |
| Polwarit Watthanahemmarat | 67070501067 | [MadMax168](https://github.com/MadMax168) | [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57), local Docker and browser verification; [Issue #36](https://github.com/CPE334-Pockit/Pockit/issues/36). |
| Guntee Doungmanee | 67070501003 | [ovenmakemeheat](https://github.com/ovenmakemeheat) | Teammate reviews in [PR #44](https://github.com/CPE334-Pockit/Pockit/pull/44) and [PR #48](https://github.com/CPE334-Pockit/Pockit/pull/48). Add deployment and release contributions after execution. |

- [Public repository](https://github.com/CPE334-Pockit/Pockit).
- [PR #58](https://github.com/CPE334-Pockit/Pockit/pull/58) merged the
  preparatory evidence index and report source into `lab5` at
  `9ca079f4f4c48f9d85e1a63861c7de7bf3e54469`; this follow-up records
  the completed C-02 demonstration and repository migration.
- Submitted tag or full commit: **pending reviewed release**.
- Public web/API URLs and serving commit: **pending GCP access**.
- [C-01 through C-06 evidence index](evidence-index.md). C-01 and C-02 are
  verified; C-03 has integrated local Docker evidence. C-04 through C-06 remain
  incomplete until the public GCP release and persistence checks run.

## Answer Part 1: CI and Quality Gate

- [CI workflow](https://github.com/CPE334-Pockit/Pockit/blob/lab5/.github/workflows/ci-docker.yml),
  [passing PR #50](https://github.com/CPE334-Pockit/Pockit/pull/50), and
  [passing run 44025791559](https://github.com/CPE334-Pockit/Pockit/actions/runs/44025791559)
  on `3057e867b379b017da5a16110afd869c29a694f9` prove C-01.
- [Active `main` ruleset](https://github.com/CPE334-Pockit/Pockit/rules/27470351)
  requires PRs, one approval and the `test-and-docker` check. In normal
  [PR #63](https://github.com/CPE334-Pockit/Pockit/pull/63), the intentional
  test failed in [Actions run 44135270043](https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043).
  GitHub displayed the failed check as `Required`, `Merging is blocked`, and a
  disabled merge button. The PR was closed without merging, and `main` stayed
  at `211bb77fb2a5ccb95027d9d110e0132ff1001918` (C-02).

## Answer Part 2: Docker and Reproducible Configuration

- [Docker Compose](https://github.com/CPE334-Pockit/Pockit/blob/lab5/docker-compose.yml),
  [server image](https://github.com/CPE334-Pockit/Pockit/blob/lab5/apps/server/Dockerfile),
  [web image](https://github.com/CPE334-Pockit/Pockit/blob/lab5/apps/web/Dockerfile),
  [Docker ignore](https://github.com/CPE334-Pockit/Pockit/blob/lab5/.dockerignore).
- [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57) records local
  image build, four migrations, synthetic seed, healthy API/web/DB, and a
  browser journey on source commit `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`.
  A separate clean checkout first exposed a missing Prisma Client in the image;
  PR #57 head `42f67d6` generates it during Docker build. The fixed checkout
  built both images, applied migrations, seeded demo data and served healthy
  API/web endpoints. Teammate review passed and PR #57 merged into `lab5` at
  `43d471f4bac4d17a4c2a4bd61ae74b6e4aa40e9a`.
- [Deployment configuration table](deployment.md) explains environment
  variables and which values must stay secret.

## Answer Part 3: GCP Deployment and Persistence

**Pending university GCP budget/access.** On 2026-11-18 the team reported that
it had informed the TA and is awaiting a response; TA acknowledgement and
billing approval have not been verified. There is no public URL, Cloud SQL
instance, deployed revision, or before/after cloud restart/redeploy screenshot.
The local Compose restart retained three synthetic Users, but this does not
prove C-04 or C-05 on GCP. Add direct URLs and numbered, readable screenshots
with the public URL and serving commit when the cloud workflow is tested.

## Answer Part 4: Repeatable Release Pipeline

- [Deployment workflow](https://github.com/CPE334-Pockit/Pockit/blob/lab5/.github/workflows/deploy.yml)
  is present on `lab5`. [PR #56](https://github.com/CPE334-Pockit/Pockit/pull/56)
  documents the release sequence; it was reviewed and merged into `lab5` at
  `30ac9e8a50a28460193a07a3e743179c5965ac6f`.
- Reviewed release PR `lab5` → `main`, passing CI on the release SHA, successful
  deployment run, Cloud Run revisions, image digests and live smoke result:
  **pending GCP access and release** (C-06).
