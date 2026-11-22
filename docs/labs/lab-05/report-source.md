# Lab 5 submission source — Section 1, PEEEEEEJA

Use this source to prepare `lab5_sec1_PEEEEEEJA.pdf`. The report follows the
course's Answer Part 0–4 order, but gives each check a method, actual result,
tested commit and primary link so that the PDF stands on its own. Check the
final layout and links before submission; use synthetic data and exclude
browser chrome and secrets from screenshots.

## Reading guide

The PDF opens with a cover and contents, then presents a C-01–C-06 crosswalk,
the CI gate and its deliberately failing demonstration, a clean Docker build,
the public GCP workflow and persistence observations, and finally the reviewed
release path. A successful test run is identified by its exact GitHub Actions
run and commit. A manual observation is explicitly labelled as such; it is not
represented as a command result or an independent screenshot.

## Answer Part 0: Team and Evidence Index

Topic: 7 — Personal Money and Expense Logging System (Pockit).

| Student | ID | GitHub | Evidence of participation |
| --- | --- | --- | --- |
| Polwarit Watthanahemmarat | 67070501067 | [MadMax168](https://github.com/MadMax168) | [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57), local Docker and browser verification; [Issue #36](https://github.com/CPE334-Pockit/Pockit/issues/36). |
| Guntee Doungmanee | 67070501003 | [ovenmakemeheat](https://github.com/ovenmakemeheat) | Teammate reviews in [PR #44](https://github.com/CPE334-Pockit/Pockit/pull/44), [PR #48](https://github.com/CPE334-Pockit/Pockit/pull/48), and approval of [PR #71](https://github.com/CPE334-Pockit/Pockit/pull/71). |

- [Public repository](https://github.com/CPE334-Pockit/Pockit).
- [PR #58](https://github.com/CPE334-Pockit/Pockit/pull/58) merged the
  preparatory evidence index and report source into `lab5` at
  `9ca079f4f4c48f9d85e1a63861c7de7bf3e54469`; this follow-up records
  the completed C-02 demonstration and repository migration.
- Current reviewed release commit: `b315c99b7e68ec4061bd131aff016bb19ed6c899` ([PR #72](https://github.com/CPE334-Pockit/Pockit/pull/72)).
- Public web/API URL: `https://s4b043a2c-4d7hbszvwq-as.a.run.app`; initial
  manual Pockit revision `s4b043a2c-00002-82b` served the reviewed commit.
  Current pipeline revision `s4b043a2c-00005-qd5` serves the new release image at 100% traffic.
- [C-01 through C-06 evidence index](evidence-index.md): C-01 and C-02 are
  verified; C-03 has integrated local Docker evidence; C-04 is verified by the
  public finance workflow and access restriction; C-05 is supported by cloud
  revision/readiness commands and the team's before/after observations, with
  one distinct before image and one post-redeployment image. There is no
  independent screenshot between the first two rollouts. A separate screenshot
  after the GitHub Actions release shows the same record. C-06 is verified by
  reviewed PR #72, passing main CI and successful deploy run 44995350059.

### Requirement and acceptance crosswalk

| Check / requirement | Verification method | Actual evidence and result |
| --- | --- | --- |
| C-01 / R-05 | Normal PR triggers CI. | PR #50, run 44025791559, head `3057e867`: `test-and-docker` passed. |
| C-02 / R-06 | Deliberately failing PR targets protected `main`. | PR #63, run 44135270043, head `19874207`: required check failed and merge blocked; PR closed unmerged. |
| C-03 / R-01–R-02 | Fresh clone builds images, migrates and seeds an isolated PostgreSQL database, serves web/API. | PR #57, source `3c7a7e9` + fix `42f67d6`: both images built; four migrations, three Users and ten accounts; web/API healthy. |
| C-04 / R-03 | Public login, finance write and unauthenticated read. | Manual revision `s4b043a2c-00002-82b`, commit `5256b3c`: user recorded THB 123.45 Salary; HTTP 200 health/readiness and HTTP 401 unauthenticated finance read. |
| C-05 / R-04 | Compare one synthetic record across service restart and separate redeployments. | Manual `lab5restart`, `lab5redeploy` and pipeline `00005-qd5` Ready/100%; team observed unchanged receipt. Distinct images exist before restart, after manual redeploy and after pipeline deploy, but not immediately after first restart. |
| C-06 / R-07–R-10 | Reviewed release PR, exact-SHA CI, keyless deploy and revision check. | PR #71 and #72, CI 44995349976, deploy 44995350059, SHA `b315c99b`: all stages passed; revision `00005-qd5` serves SHA-tagged image at 100%. |

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
- For the final release, [CI 44995349976](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995349976)
  ran on the exact `main` SHA `b315c99b7e68ec4061bd131aff016bb19ed6c899`.
  Job logs show 14 web, 20 server, 21 API and 2 PostgreSQL tests passed:
  **57 passed, 0 failed**. The deploy workflow waited for this run before
  authenticating to GCP.

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

The clean checkout initially failed at the server image build because Prisma
Client had not been generated in that image. The reviewed Dockerfile fix
generated the client during build. After rebuilding, the team ran
`docker compose -p pockit-lab5-clean build --quiet`, started an isolated
PostgreSQL service, applied checked-in migrations with
`bun run db:migrate:deploy`, seeded synthetic accounts and checked `/api/ready`
and the web page. Local restart was a separate supporting check: the synthetic
User count remained three and readiness returned connected after restarting
web and server containers. See [deployment.md](deployment.md) for exact
environment and command variations.

## Answer Part 3: GCP Deployment and Persistence

The university portal prepared team PEEEEEEJA's resources on 2026-11-19 in
`cpe-se-course-2026` / `asia-southeast1`, including one Cloud SQL instance and
the reserved public URL above. The [portal completion](artifacts/course-ready-2026-11-19.png)
and [resource record](artifacts/course-resources-2026-11-19.png) are setup
evidence. Pockit replaced the placeholder by a manual deployment of reviewed
commit `5256b3c`: migration and course User bootstrap completed, and initial
revision `s4b043a2c-00002-82b` served 100% of traffic. That manual revision was
later replaced by pipeline revision `s4b043a2c-00005-qd5`, which serves the
new SHA-tagged release image at 100% traffic. The public root, login, health
and readiness paths returned HTTP 200; an unauthenticated finance read returned
HTTP 401. A team-provided screenshot shows successful public sign-in to the
dashboard and the `LAB5-PERSIST-20261120` Salary receipt for THB 123.45;
Cash on hand and Income both show THB 123.45. The original screenshot is
kept locally because browser chrome includes unrelated personal tabs and
bookmarks. A fresh application revision `s4b043a2c-lab5restart` served the
same release image and public readiness reported `db: connected`; the team
member reported that the record and balance remained visible after refreshing.
A separate manual redeployment created `s4b043a2c-lab5redeploy` from the
same image; public readiness again reported `db: connected`. The team member
reported that the same record and balance remained visible after refreshing
on both revisions. Issue #41 AC-L5-08-01/02 are checked against these
team-observed results and command/revision evidence. The two images submitted
as after-stage evidence have the same SHA-256 digest and are byte-identical.
The team confirmed it has no separate after-restart screenshot. Retain one as
the post-redeployment image; do not present them as two independent images.
The original browser chrome includes unrelated personal tabs and bookmarks,
so place a privacy-safe view in the PDF.
The local Compose restart retained three synthetic Users as supporting local
evidence. For the final PDF, pair the distinct before and post-redeployment
dashboard images and label the first cloud restart as team-reported, supported
by the named revision and readiness command results. Do not imply that the
byte-identical after-stage files are two separate screenshots.

On 2026-11-22, a separate reviewed release reached `main` at
`b315c99b7e68ec4061bd131aff016bb19ed6c899`. [Main CI 44995349976](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995349976)
passed and [GitHub Actions deploy 44995350059](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059)
completed keyless authentication, migration, bootstrap, Cloud Run update and
public smoke. Revision `s4b043a2c-00005-qd5` is Ready and serves 100% of
traffic with an image tag containing that full SHA. `/api/health` returned
`ok`, `/api/ready` returned `ready` with `db: connected`, and `/` succeeded.
The team supplied a new public dashboard screenshot after this pipeline
deploy, showing the same `LAB5-PERSIST-20261120` transaction and THB 123.45
Cash/Income totals. The raw image is Git-ignored at
`artifacts/private/public-income-after-actions-2026-11-22.png` because its
browser chrome includes bookmarks and account details; frame only the URL
and application content in the PDF.

### Evidence strength and limits

The pre-restart screenshot proves the synthetic record existed before the
rollouts. The two files supplied for the manual after stages had the same
SHA-256 digest; only one is counted as a post-manual-redeploy capture. The
first restart is supported by a named Ready revision, `db: connected` and the
team member's direct observation, but has no separate intermediate screenshot.
The post-actions capture is distinct from the earlier images and shows the
same record after the GitHub Actions release. All published PDF figures are
pixel-exact crops of application content and contain no password or personal
browser tabs.

## Answer Part 4: Repeatable Release Pipeline

- [Deployment workflow](https://github.com/CPE334-Pockit/Pockit/blob/main/.github/workflows/deploy.yml)
  is on `main`. [PR #56](https://github.com/CPE334-Pockit/Pockit/pull/56)
  documents the release sequence; it was reviewed and merged into `lab5` at
  `30ac9e8a50a28460193a07a3e743179c5965ac6f`.
- [Release PR #70](https://github.com/CPE334-Pockit/Pockit/pull/70) merged
  `lab5` → `main` at `5256b3c`; [main CI](https://github.com/CPE334-Pockit/Pockit/actions/runs/44756809917)
  passed. [Automatic deploy](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757283437)
  and [manual dispatch](https://github.com/CPE334-Pockit/Pockit/actions/runs/44757614254)
  both failed at the course WIF provider's attribute condition before updating
  GCP. A separate manual deployment of the same image succeeded and its Cloud
  Run revision/digest are recorded in [deployment.md](deployment.md). These
  earlier failures are retained as diagnostic history.
- [Implementation PR #71](https://github.com/CPE334-Pockit/Pockit/pull/71)
  merged the portal-aligned workflow into `lab5` after teammate approval.
  [Release PR #72](https://github.com/CPE334-Pockit/Pockit/pull/72) merged it
  into `main` at `b315c99b7e68ec4061bd131aff016bb19ed6c899` after a separate
  review. [Main CI 44995349976](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995349976)
  and [deploy run 44995350059](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059)
  passed. Read-only service describe confirmed revision `s4b043a2c-00005-qd5`
  Ready at 100% traffic, image tagged with the full release SHA. Public
  health/readiness/web smoke passed; this verifies C-06.

### Release verification sequence

1. PR #71 merged the portal-aligned workflow into `lab5` after teammate review.
2. Separately reviewed PR #72 merged `lab5` into `main` at full SHA `b315c99b7e68ec4061bd131aff016bb19ed6c899`.
3. Main CI 44995349976 passed 57 tests with no failures, then deploy run 44995350059 passed its exact-SHA CI wait.
4. The deploy run authenticated through WIF without a service-account key, built and pushed the SHA-tagged image, executed migrations and idempotent bootstrap, updated Cloud Run and passed public smoke.
5. Read-only Cloud Run service inspection showed revision `s4b043a2c-00005-qd5` Ready and serving 100% traffic from that image. The team confirmed the synthetic receipt persisted.

The 2026-11-20 runs 44757283437 and 44757614254 failed at the course WIF
attribute condition. The later workflow succeeded; the precise cause of the
earlier rejection was not independently established. Keep both failed runs in
the history as diagnostic context rather than treating them as successful
deployment evidence.
