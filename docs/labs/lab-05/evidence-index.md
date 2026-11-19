# Lab 5 evidence index — Issue #41

This is the working evidence index for the one-team PDF. A check is complete
only when the linked run or observation proves the required behavior on a
named commit. Do not insert credentials, billing details, or private financial
records. Use synthetic demo data for screenshots.

The university portal provisioned team PEEEEEEJA's resources on 2026-11-19:
project `cpe-se-course-2026`, region `asia-southeast1`, prefix `s4b043a2c`,
and reserved Cloud Run URL
`https://s4b043a2c-4d7hbszvwq-as.a.run.app`. The
[completion screenshot](artifacts/course-ready-2026-11-19.png) and
[resource screenshot](artifacts/course-resources-2026-11-19.png) contain no
credentials. The service still runs a portal placeholder, so this is
infrastructure evidence only. The portal could not connect the non-Starter-Kit
repository; the team is asking the TA to enable GitHub WIF. There is no
Pockit deployment, released revision, or cloud persistence result yet.

## Verified repository evidence

| Check | Command, run, or link | Actual result | Tested commit | Missing proof |
| --- | --- | --- | --- | --- |
| C-01 (R-05) | [PR #50](https://github.com/CPE334-Pockit/Pockit/pull/50), [CI run 44025791559](https://github.com/CPE334-Pockit/Pockit/actions/runs/44025791559) | `test-and-docker` passed; teammate reviewed and PR merged into `lab5`. | `3057e867b379b017da5a16110afd869c29a694f9` | None for the passing PR check. |
| C-02 (R-06) | [Active main ruleset](https://github.com/CPE334-Pockit/Pockit/rules/27470351), [temporary PR #63](https://github.com/CPE334-Pockit/Pockit/pull/63), [failed Actions run 44135270043](https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043), [Issue #39 evidence](https://github.com/CPE334-Pockit/Pockit/issues/39). | A normal PR to `main` ran the required `test-and-docker` check. The intentional test failed at `apps/server/src/merge-gate-demo.test.ts:4`; the PR showed `Required`, `Merging is blocked`, and a disabled merge button. PR #63 was closed without merging; `main` remained at `211bb77fb2a5ccb95027d9d110e0132ff1001918`. | Demo head `198742072b773dde74474c495360ed6ca11c148b` | None for the GitHub merge-gate demonstration; GCP authentication is tracked separately by Issue #39 AC-L5-06-01. |
| C-03 (R-01, R-02) | [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57), separate fresh checkout of `lab5` at `3c7a7e9` with only ignored synthetic `.env` files and the Dockerfile fix: `docker compose -p pockit-lab5-clean build --quiet`, `up`, migration/seed one-off commands and HTTP checks. | Initial fresh build failed because Prisma Client was not generated inside the image. After the fix, both images built, four migrations applied, three synthetic Users and ten accounts seeded; API ready and web HTTP 200. A separate local browser journey verified login, finance actions and allocation rejection. Teammate reviewed and merged PR #57 into `lab5` at `43d471f4bac4d17a4c2a4bd61ae74b6e4aa40e9a`. | `3c7a7e9fba6fec20c50a2e504d7e71fbe720c061` plus Dockerfile fix `42f67d6827000d6ab144f549171be0daf6517219` and evidence head `044438f2de1af59842e7ff1714ef5a0d1d92ea0b` | None for local Docker proof; cloud deployment remains C-04/C-05. |
| C-04 (R-03) | The portal reserved the [team Cloud Run URL](https://s4b043a2c-4d7hbszvwq-as.a.run.app), but it still serves a placeholder. | Pockit public workflow unverified. | None | Deploy Pockit, then capture login, successful financial action, and rejection with the same public URL visible. |
| C-05 (R-04) | Local `docker compose -p pockit-lab5-audit restart server web`, PostgreSQL User count query before/after and `/api/ready`; [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57). | Local synthetic User count stayed 3 and API reconnected to PostgreSQL after application container restart. No cloud restart/redeploy evidence. | `499f02b67c101699a5e302b23fa4adf3fd4e4aa3` | On GCP, capture the same recognizable financial record before/after application restart and redeployment with URLs, screenshots, revisions and commit. |
| C-06 (R-07–R-10) | The earlier deployment workflow is merged into `lab5`, but targets resource names superseded by the university portal. Its single-service adaptation is under review on the existing #38 branch. No release PR into `main` or successful deployment run is linked. | Unverified. | None | Obtain WIF from the TA, then link teammate-reviewed release PR, passing CI on `main`, successful deploy run and Cloud Run revision/image matching full release SHA. |

## Issue #41 acceptance status

- AC-L5-08-01: open — local application restart preserved synthetic Users, but the Lab 5 public deployment still needs before/after financial-record evidence.
- AC-L5-08-02: open — no observed redeployment persistence result.
- AC-L5-08-03: open — C-01 through C-03 have repository/local evidence; C-04 through C-06 still need public deployment, persistence, and release proof.
- AC-L5-08-04: open — deployment and board evidence is incomplete.
- AC-L5-08-05: open — final PDF filename is known, but public URL, release and persistence evidence are missing.

## Capture sequence for the team

1. Record the portal project ID, region, single service URL, Cloud SQL instance, and serving revision in `deployment.md` without secret values.
2. Use a synthetic user to create one clearly identifiable transaction through the public UI. Capture URL, transaction and balance; record the serving revision and commit.
3. Restart the application service without deleting Cloud SQL or its data. Sign in again and capture the same transaction and balance, plus new revision/instance evidence.
4. Release a reviewed change through `lab5` to `main` and the deployment workflow. Confirm the new service revision and full commit SHA; capture the same record once more.
5. Carry the existing failed PR, required-check ruleset, clean-clone Docker run and review links into Answer Parts 0–4 of the final PDF with one- or two-sentence captions.

The requested final filename is `lab5_sec1_PEEEEEEJA.pdf`. Prepare Answer Parts
0–4 after the missing evidence is captured; do not present a draft PDF as final
submission while C-04 through C-06 remain unverified.
