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
credentials. The service ran a placeholder until the first manual Pockit
deployment on 2026-11-20. On that date, the TA had enabled a portal
connection path for non-Starter-Kit repositories. The root Dockerfile reached
`main` in separately reviewed release PR #66, and the portal accepted this
repository's WIF connection request and completed WIF setup. GitHub environment
[`demo`](https://github.com/CPE334-Pockit/Pockit/settings/environments/27997376231/edit)
holds the portal's four non-secret variables and is restricted to `main`.
The first deployment run stopped before GCP authentication because the then-current
workflow used a different environment. A later WIF attempt on `main` also
failed at the provider's attribute condition. A reviewed `main` image was
then deployed manually. On 2026-11-22, the portal-aligned workflow reached
`main` through reviewed release PR #72 and completed a keyless GitHub Actions
deployment; the new revision and public readiness were verified.

## Verified repository evidence

| Check | Command, run, or link | Actual result | Tested commit | Missing proof |
| --- | --- | --- | --- | --- |
| C-01 (R-05) | [PR #50](https://github.com/CPE334-Pockit/Pockit/pull/50), [CI run 44025791559](https://github.com/CPE334-Pockit/Pockit/actions/runs/44025791559) | `test-and-docker` passed; teammate reviewed and PR merged into `lab5`. | `3057e867b379b017da5a16110afd869c29a694f9` | None for the passing PR check. |
| C-02 (R-06) | [Active main ruleset](https://github.com/CPE334-Pockit/Pockit/rules/27470351), [temporary PR #63](https://github.com/CPE334-Pockit/Pockit/pull/63), [failed Actions run 44135270043](https://github.com/CPE334-Pockit/Pockit/actions/runs/44135270043), [Issue #39 evidence](https://github.com/CPE334-Pockit/Pockit/issues/39). | A normal PR to `main` ran the required `test-and-docker` check. The intentional test failed at `apps/server/src/merge-gate-demo.test.ts:4`; the PR showed `Required`, `Merging is blocked`, and a disabled merge button. PR #63 was closed without merging; `main` remained at `211bb77fb2a5ccb95027d9d110e0132ff1001918`. | Demo head `198742072b773dde74474c495360ed6ca11c148b` | None for the GitHub merge-gate demonstration; GCP authentication is tracked separately by Issue #39 AC-L5-06-01. |
| C-03 (R-01, R-02) | [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57), separate fresh checkout of `lab5` at `3c7a7e9` with only ignored synthetic `.env` files and the Dockerfile fix: `docker compose -p pockit-lab5-clean build --quiet`, `up`, migration/seed one-off commands and HTTP checks. | Initial fresh build failed because Prisma Client was not generated inside the image. After the fix, both images built, four migrations applied, three synthetic Users and ten accounts seeded; API ready and web HTTP 200. A separate local browser journey verified login, finance actions and allocation rejection. Teammate reviewed and merged PR #57 into `lab5` at `43d471f4bac4d17a4c2a4bd61ae74b6e4aa40e9a`. | `3c7a7e9fba6fec20c50a2e504d7e71fbe720c061` plus Dockerfile fix `42f67d6827000d6ab144f549171be0daf6517219` and evidence head `044438f2de1af59842e7ff1714ef5a0d1d92ea0b` | None for local Docker proof; cloud deployment remains C-04/C-05. |
| C-04 (R-03) | The [team Cloud Run URL](https://s4b043a2c-4d7hbszvwq-as.a.run.app) served Pockit revision `s4b043a2c-00002-82b`. [Deployment record](deployment.md#first-public-pockit-deployment-2026-11-20) shows migration and bootstrap executions, HTTP 200 on home/login/health/readiness, and HTTP 401 on an unauthenticated finance read. A team-provided screenshot shows signed-in `/dashboard`, the synthetic `LAB5-PERSIST-20261120` Salary receipt for THB 123.45, Cash on hand THB 123.45 and Income THB 123.45. The original screenshot remains local because its browser chrome shows unrelated personal tabs/bookmarks. | Public UI/API/DB readiness, signed-in business action and unauthenticated access restriction verified. | `5256b3cd7b9269dc32db5bd10abfe401bbaeb958` | Publish a privacy-safe view of the screenshot in the final PDF. |
| C-05 (R-04) | Local `docker compose -p pockit-lab5-audit restart server web`, PostgreSQL User count query before/after and `/api/ready`; [PR #57](https://github.com/CPE334-Pockit/Pockit/pull/57). Cloud Run was rolled first to `s4b043a2c-lab5restart` and then separately to `s4b043a2c-lab5redeploy`, both using the same reviewed image. Each revision served 100% of traffic and public readiness returned `db: connected`. [Deploy run 44995350059](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059) then created `s4b043a2c-00005-qd5` from a new release commit; the team supplied a new screenshot of the public dashboard after this pipeline deploy. | Local synthetic User count stayed 3. The team observed the same public `LAB5-PERSIST-20261120` transaction and THB 123.45 balance after the restart and both redeployments. The two 2026-11-20 after-stage files are byte-identical and count as one post-manual-redeploy image; the 2026-11-22 after-actions image is separate. | Local `499f02b67c101699a5e302b23fa4adf3fd4e4aa3`; manual cloud `5256b3cd7b9269dc32db5bd10abfe401bbaeb958`; pipeline cloud `b315c99b7e68ec4061bd131aff016bb19ed6c899` | Label first restart as team-observed without a separate image. Include privacy-safe before, post-manual-redeploy and post-actions screenshots in the PDF. |
| C-06 (R-07-R-10) | [Implementation PR #71](https://github.com/CPE334-Pockit/Pockit/pull/71) merged into `lab5` after teammate approval; [separately reviewed release PR #72](https://github.com/CPE334-Pockit/Pockit/pull/72) merged into `main`. [Main CI 44995349976](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995349976) passed on the release SHA; [deploy run 44995350059](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059) passed exact-SHA CI gate, keyless WIF, image build/push, migration, bootstrap, service update and public smoke. Read-only `gcloud run services describe s4b043a2c --project=cpe-se-course-2026 --region=asia-southeast1 --format=json` confirmed the serving image and revision. | Revision `s4b043a2c-00005-qd5` is Ready with 100% traffic; `/api/health` returned `ok`, `/api/ready` returned `ready` with `db: connected`, and web root succeeded. Image tag contains full release SHA. Earlier WIF failures remain historical diagnostic evidence. | `b315c99b7e68ec4061bd131aff016bb19ed6c899` | None for the successful pipeline release. |

## Issue #41 acceptance status

- AC-L5-08-01: checked — team member saw the same financial record and balance after refreshing on fresh Cloud Run revision `s4b043a2c-lab5restart`; command, full-SHA image, 100% traffic and `db: connected` were recorded. The team has no distinct after-restart screenshot; label this as a user-observed result.
- AC-L5-08-02: checked — team member saw the same record and balance after refreshing on separate revision `s4b043a2c-lab5redeploy`; command, full-SHA image, 100% traffic and `db: connected` were recorded. The team supplied a post-redeployment screenshot; its raw version is Git-ignored because it includes unrelated browser chrome.
- AC-L5-08-03: complete in this evidence index — every C-01 through C-06 row now gives a direct run/command/link, result, and tested commit. C-05 distinguishes team-observed restart from separately captured post-redeploy images.
- AC-L5-08-04: open — repository documents and issue/PR state need final review; the user-owned project board remains read-only through the connected account.
- AC-L5-08-05: open — final PDF still needs export and visual inspection. Use privacy-safe screenshot framing, numbered captions and Answer Parts 0-4.

## Capture sequence for the team

1. Record the portal project ID, region, single service URL, Cloud SQL instance, and serving revision in `deployment.md` without secret values.
2. Use a synthetic user to create one clearly identifiable transaction through the public UI. Capture URL, transaction and balance; record the serving revision and commit.
3. Restart the application service without deleting Cloud SQL or its data. Sign in again and capture the same transaction and balance, plus new revision/instance evidence.
4. Release a reviewed change through `lab5` to `main` and the deployment workflow. Confirm the new service revision and full commit SHA; capture the same record once more.
5. Carry the existing failed PR, required-check ruleset, clean-clone Docker run and review links into Answer Parts 0–4 of the final PDF with one- or two-sentence captions.

The requested final filename is `lab5_sec1_PEEEEEEJA.pdf`. C-01 through C-06
now have evidence; export Answer Parts 0-4 with direct links and readable,
privacy-safe screenshots before marking the submission complete.
