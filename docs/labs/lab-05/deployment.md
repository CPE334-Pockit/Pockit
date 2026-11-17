# Lab 5 Deployment Record

This document is the evidence record for Lab 5. Update it with actual commands,
links, results, and tested commits as the work is performed. Do not put passwords,
connection strings, API keys, service-account keys, or other secrets here.

## 1. Team and baseline

| Item | Value |
| --- | --- |
| Repository | `https://github.com/CPE334-Pockit/Pockit` |
| Lab 5 staging branch | `lab5` |
| Current Issue | [#41](https://github.com/CPE334-Pockit/Pockit/issues/41) |
| Working branch | `lab5-final-evidence` |
| Sprint 1 baseline commit | `e99da77` |
| GCP project ID | Pending: Free Trial access problem; team reports TA informed on 2026-11-18 and awaits university budget arrangement |
| GCP region | Pending GCP project setup |
| Public service URL | No deployment yet |

## 2.1 GCP deployment plan

Pockit uses separate web and API containers, so the first deployment uses two
Cloud Run services backed by one Cloud SQL PostgreSQL instance:

| Resource | Planned name | Purpose |
| --- | --- | --- |
| Artifact Registry repository | `pockit` | Stores immutable web and API images. |
| Cloud SQL instance | `pockit-pg` | Persistent PostgreSQL data. |
| Cloud Run API service | `pockit-api` | Elysia API, authentication, and tRPC. |
| Cloud Run web service | `pockit-web` | TanStack Start UI. |
| Secret Manager secret | `pockit-database-url` | Cloud SQL connection string. |
| Secret Manager secret | `pockit-auth-secret` | Better Auth signing secret. |

Deployment order:

1. Confirm billing, budget, project, region, and IAM access.
2. Create the Artifact Registry repository and Cloud SQL instance/database.
3. Store the database URL and authentication secret in Secret Manager.
4. Build and deploy the API image, then record its Cloud Run URL.
5. Build the web image with the API URL as `VITE_SERVER_URL` and deploy it.
6. Update API CORS/trusted-origin configuration with the web URL.
7. Run additive migrations before accepting traffic.
8. Verify health, readiness, authentication, the Sprint 1 financial workflow, and
   one rejection/access restriction through the public web URL.

The actual project ID, resource URLs, revisions, image digests, migration result,
and browser evidence must be recorded after the team runs this plan in Cloud
Shell. No GCP resource or secret is created by repository tests.

## 2. GCP setup evidence

Complete these fields only after checking the Google Cloud Console:

The team reported on 2026-11-18 that it had informed the TA about the Free Trial
problem and is awaiting a response. This is a team report, not verified TA
acknowledgement, project access or billing approval. [Issue #35](https://github.com/CPE334-Pockit/Pockit/issues/35)
tracks the blocker.

| Check | Result/evidence |
| --- | --- |
| Approved account used | _Record account type only; do not record credentials_ |
| Billing or Free Trial active | _Record result and date_ |
| Teammate added to project | _Record GitHub/Google identity and role_ |
| Alerts-only budget created | _Record budget name and threshold; hide billing details in screenshots_ |
| Region and quota checked | _Record region and result_ |

## 3. Environment variables

Values below describe the variables currently declared by the repository. Local
values belong in ignored `.env` files; deployed secret values must come from the
GCP runtime secret/configuration mechanism.

| Variable | Used by | Secret? | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | Web/server/database | No | Runtime mode (`development`, `test`, or `production`). |
| `HOST` | Server | No | Listener hostname; Cloud Run uses `0.0.0.0`. |
| `PORT` | Server | No | Listener port supplied by the runtime; local default is `3000`. |
| `BETTER_AUTH_SECRET` | Server/auth | Yes | Session and authentication signing secret. |
| `BETTER_AUTH_URL` | Server/auth | No | Canonical server URL for the environment. |
| `CORS_ORIGIN` | Server/auth | No | Trusted web origin for browser requests. |
| `DATABASE_URL` | Server/database | Yes | PostgreSQL connection string. |
| `POCKIT_DEMO_PASSWORD` | Server seed | Yes | Optional synthetic local demo password; never commit a real value. |
| `VITE_SERVER_URL` | Web | No | Public server URL used by the web client. |

## 4. Local Docker workflow

The full Compose stack runs PostgreSQL, the API server, and the web application.
PostgreSQL data is stored in the named `pockit-postgres-data` volume and is not
stored in either application container.

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
docker compose build
docker compose up -d
docker compose ps
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
```

Apply migrations and seed synthetic local data after PostgreSQL is healthy:

```bash
docker compose run --rm -w /app server bun run db:migrate:deploy
docker compose run --rm -w /app -e NODE_ENV=development server bun run db:seed
```

Set a synthetic local-only `POCKIT_DEMO_PASSWORD` in the ignored
`apps/server/.env` before seeding. The production container image defaults to
`NODE_ENV=production`; the one-off seed command explicitly opts into local
development mode. Run these commands only against a disposable local database.
If port 5432 is already occupied, set `POCKIT_POSTGRES_PORT=15432` for every
Compose command in the same isolated project instead of stopping the existing
database service.

### Local verification on 2026-11-17 (Issue #36)

Tested source commit: `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`.
An isolated Compose project named `pockit-lab5-audit` used host PostgreSQL port
15432 and its own named volume. Ignored local `.env` files contained synthetic
values. The following commands and observations were recorded:

| Command or check | Result |
| --- | --- |
| `docker compose -p pockit-lab5-audit build` | API and web images built successfully, exit 0. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit up -d postgres` | PostgreSQL started healthy. The default 5432 host port was occupied by another service. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit run --rm -w /app server bun run db:migrate:deploy` | Four checked-in migrations applied, exit 0. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit run --rm -e NODE_ENV=development -w /app server bun run db:seed` | Seeded 3 synthetic identities and 10 financial accounts, exit 0. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit up -d server web` | PostgreSQL, API and web containers reached healthy state. |
| `curl --fail http://localhost:3000/api/health`; `curl --fail http://localhost:3000/api/ready`; `curl --fail -o /dev/null -w '%{http_code}' http://localhost:3001/` | `ok`, database `connected`, and web HTTP 200. |
| `POCKIT_POSTGRES_PORT=15432 docker compose -p pockit-lab5-audit run --rm -w /app -e NODE_ENV=test server bun run test` | Web, server, API and PostgreSQL test suites passed; includes valid/invalid login, finance journey and rejection/access checks. |
| Count synthetic Users, restart only `server web`, count again and request `/api/ready` | Count 3 before and 3 after; readiness returned database `connected`. |

The automated finance persistence test also disconnects Prisma, recreates the
server app and database client, and verifies balances, summaries and history.
This local restart is not evidence of GCP redeployment or persistence through a
new Cloud Run revision.

### Local browser journey (AC-L5-03-04)

Using the same isolated Compose stack and synthetic seeded User, the browser
opened `http://localhost:3001/`, signed in, and reached `/dashboard`. The
following actions were observed through the live UI on the production-built
images from source commit `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`:

1. Set Main bank opening balance to THB 1,000.00; cash became THB 1,000.00.
2. Enter a THB 100.00 credit-card purchase split between Dining (THB 65.00)
   and Groceries (THB 35.00); card debt and Expenses became THB 100.00.
3. Before saving, changed the second allocation to THB 34.00; the UI displayed
   `Allocated THB 99.00 / THB 100.00` and disabled `Record card purchase`.
   Restored THB 35.00 and saved the transaction.
4. Recorded THB 1,500.00 salary into Main bank and THB 40.00 repayment from
   Main bank to Credit card.
5. The dashboard showed cash THB 2,460.00, card debt THB 60.00, income
   THB 1,500.00, expenses THB 100.00 and three transactions in history.

This is local browser and database evidence only. It does not prove the public
GCP URL or a cloud restart/redeployment.

### Fresh-checkout Docker regression and fix (AC-L5-03-01)

The first separate checkout of `lab5` at
`3c7a7e9fba6fec20c50a2e504d7e71fbe720c061` failed
`docker compose build server`: the generated Prisma Client import was missing.
Earlier CI and workspace builds had generated that ignored directory before
building the image. Both application Dockerfiles now run `bun run db:generate`
inside the builder stage after installing dependencies; the build-time local
environment remains mounted as a BuildKit secret.

With this Dockerfile fix applied to that same clean checkout and only ignored
synthetic `.env` files added, the isolated `pockit-lab5-clean` Compose project
passed `docker compose build --quiet` for API and web. Four migrations applied
using `run --rm -w /app server bun run db:migrate:deploy`; local seed created
3 synthetic Users and 10 accounts using `run --rm -e NODE_ENV=development
-w /app server bun run db:seed`. PostgreSQL and API reached healthy state,
`/api/health` returned `ok`, `/api/ready` returned `db: connected`, and the web
root returned HTTP 200. Host PostgreSQL used port 15433 to avoid the unrelated
service on 5432. This result proves the fixed images build and run without a
pre-generated Prisma Client in the checkout.

Stop the application without deleting the database volume with `docker compose
down`. Remove the volume only when disposable local data may be deleted.

## 5. Evidence rules

- Record the exact command, result, and tested commit for repository checks.
- Link Issues, PRs, reviews, workflow runs, and deployed revisions directly.
- Use screenshots only when a link cannot prove the result, such as a blocked merge
  button or before/after persistence state.
- Redact secrets and personal billing information before adding screenshots.
- Keep this document updated at each Lab 5 lifecycle transition.

## 6. Planned evidence index

The [Issue #41 evidence index](evidence-index.md) records the actual result,
tested commit, and remaining proof for each C-01 through C-06 check. A passing
CI job is not evidence of a public deployment or persistence after a restart.

| Check | Requirement | Artifact/result |
| --- | --- | --- |
| C-01 | R-05 | _Passing PR and CI run_ |
| C-02 | R-06 | _Failing temporary PR with merge blocked_ |
| C-03 | R-01, R-02 | _Clean-clone Docker build/run_ |
| C-04 | R-03 | _Live URL workflow evidence_ |
| C-05 | R-04 | _Data before/after restart and redeploy_ |
| C-06 | R-07-R-10 | _Reviewed release and running commit_ |

## 7. Pull-request CI

`.github/workflows/ci-docker.yml` runs for pull requests targeting `lab5` or
`main`. The required check name is `test-and-docker`. It starts PostgreSQL,
installs the locked Bun dependencies, generates Prisma Client, applies migrations,
runs the automated tests, checks types, builds the workspaces, validates Compose,
and builds the Docker images.

Record the passing workflow URL, summary, and head commit in Issue #37 and in the
final evidence index.

## 8. Authentication and merge gate

GitHub Actions must authenticate to GCP with Workload Identity Federation or an
equivalent keyless mechanism. Do not download, commit, or place a service-account
JSON key in GitHub Actions secrets. The deployment environment must be restricted
to the `main` branch and must contain only the project, region, provider, and
deployer-service-account identifiers; runtime secrets remain in Secret Manager.

Configure the `main` branch ruleset with:

- Enforcement: active.
- Require a pull request before merging.
- Require the `test-and-docker` status check.
- Require branches to be up to date before merging.
- Empty bypass list.

Evidence for Issue #39 must include a normal, non-draft temporary-branch PR with
one intentionally failing test. Record the failed workflow, the required-check
indicator, and the disabled merge action. Close that PR without merging it and do
not alter the released application.

The active [`main-release-gate` ruleset](https://github.com/CPE334-Pockit/Pockit/rules/27470351)
requires a PR, one approval, the GitHub Actions `test-and-docker` check, and an
up-to-date branch, with no bypass actors. [PR #63](https://github.com/CPE334-Pockit/Pockit/pull/63)
was a normal PR from `lab5-merge-gate-demo` to `main` at head
`198742072b773dde74474c495360ed6ca11c148b`. Its intentionally failing
test at `apps/server/src/merge-gate-demo.test.ts:4` failed in
[Actions run 44135270043](https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043).
The PR UI showed the check as `Required`, `Merging is blocked`, and a disabled
merge button. The PR was closed without merging; `main` remained at
`211bb77fb2a5ccb95027d9d110e0132ff1001918`. This proves the merge gate,
not GitHub-to-GCP authentication, which still awaits project access.

## 9. Release workflow

`.github/workflows/deploy.yml` runs after the `CI and Docker` workflow succeeds on
the exact `main` commit, or by manual dispatch. It authenticates with Workload
Identity Federation, builds API and web images tagged with the full commit SHA,
pushes them to Artifact Registry, creates or updates the migration job with its
explicit command and database configuration, deploys both public Cloud Run
services with explicit container ports, aligns the API trusted origin with the
web URL, and runs public health/readiness smoke checks.

### Repeatable release procedure (AC-L5-07-06)

1. Merge the bounded issue PR into `lab5` after a specific teammate review and
   passing `test-and-docker` check. Record the issue, PR, review and head SHA.
2. Open a separate PR from `lab5` into `main`. Ask the other student to review
   the release diff and the required CI result. Merge only after that review
   and all required checks pass. Record the release PR and merge commit SHA.
3. Confirm `CI and Docker` passed on that exact `main` SHA. The `push: main`
   trigger produces this run; its successful `workflow_run` triggers `deploy.yml`.
   If a manual workflow dispatch is used, confirm its selected ref and SHA
   correspond to the reviewed release and that CI passed for that same SHA.
4. Inspect the deployment run in GitHub Actions. Record its run URL, full image
   tags, migration job result, both Cloud Run revision names, public web/API
   URLs, and read-only health/readiness smoke results. Do not report a release
   complete if migration or smoke test failed.
5. Compare the full release commit SHA from `main` with the image tags and the
   image used by each serving Cloud Run revision. Open the public web URL and
   verify the released change through a synthetic user journey. Record the
   result in the evidence index (C-06) and Issue #40.

These steps describe the procedure only. No successful GCP release has been
recorded while project billing/access remains pending.

Required `production` environment variables are `GCP_PROJECT_ID`, `GCP_REGION`,
`WIF_PROVIDER`, and `WIF_SERVICE_ACCOUNT`. The pre-provisioned runtime service
account must be `pockit-runner@PROJECT_ID.iam.gserviceaccount.com`, and it needs
Cloud SQL access plus access to the `pockit-database-url` and
`pockit-auth-secret` secrets. Runtime database and authentication secrets remain
in Secret Manager. Record the workflow URL, image tags, Cloud Run revisions,
smoke-test result, and serving commit for Issue #40.

