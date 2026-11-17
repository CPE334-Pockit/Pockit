# Lab 5 evidence index — Issue #41

This is the working evidence index for the one-team PDF. A check is complete
only when the linked run or observation proves the required behavior on a
named commit. Do not insert credentials, billing details, or private financial
records. Use synthetic demo data for screenshots.

The team reports that GCP setup has not started because its Free Trial access
failed and university budget arrangements are pending. There is no project ID,
region, public URL, deployed revision, or cloud persistence result yet. Treat
C-04 through C-06 as blocked until the funding/access path is confirmed.

## Verified repository evidence

| Check | Command, run, or link | Actual result | Tested commit | Missing proof |
| --- | --- | --- | --- | --- |
| C-01 (R-05) | [PR #50](https://github.com/ovenmakemeheat/Pockit/pull/50), [CI run 44025791559](https://github.com/ovenmakemeheat/Pockit/actions/runs/44025791559) | `test-and-docker` passed; teammate reviewed and PR merged into `lab5`. | `3057e867b379b017da5a16110afd869c29a694f9` | None for the passing PR check. |
| C-02 (R-06) | No failing temporary PR or blocked-merge screenshot linked. | Unverified. | None | Create a normal temporary PR with one intentional failing test; record failed required check and blocked merge, then close without merging. |
| C-03 (R-01, R-02) | CI run above builds images, but no documented clean-clone local run. `docker info --format '{{.ServerVersion}}'` could not connect to Docker Desktop during the Issue #41 audit. | Unverified for clean clone and running stack. | None | Start Docker Desktop; run clean-clone build, migration, synthetic seed, UI/API smoke and record commands/results. |
| C-04 (R-03) | No public URL or live user journey linked. | Unverified. | None | Record public web/API URLs and screenshots for login, successful financial action, and rejection with URL visible. |
| C-05 (R-04) | No before/after restart and redeployment evidence linked. | Unverified. | None | Create recognizable synthetic record; capture before, restart Cloud Run service, capture after; redeploy through workflow and capture after again. Record revision and commit each time. |
| C-06 (R-07–R-10) | [Deployment workflow](https://github.com/ovenmakemeheat/Pockit/blob/lab5/.github/workflows/deploy.yml) is merged into `lab5`; no release PR into `main` or successful deployment run linked. | Unverified. | None | Link teammate-reviewed release PR, passing CI on `main`, successful deploy run and Cloud Run revision/image matching full release SHA. |

## Issue #41 acceptance status

- AC-L5-08-01: open — no observed application restart persistence result.
- AC-L5-08-02: open — no observed redeployment persistence result.
- AC-L5-08-03: open — C-02 through C-06 have no complete run/result/commit evidence.
- AC-L5-08-04: open — deployment and board evidence is incomplete.
- AC-L5-08-05: open — final PDF requires section/group filename, public URL, release and persistence evidence.

## Capture sequence for the team

1. Record project ID, region, two service URLs, Cloud SQL instance, and serving revisions in `deployment.md` without secret values.
2. Use a synthetic user to create one clearly identifiable transaction through the public UI. Capture URL, transaction and balance; record the serving revision and commit.
3. Restart the application service without deleting Cloud SQL or its data. Sign in again and capture the same transaction and balance, plus new revision/instance evidence.
4. Release a reviewed change through `lab5` to `main` and the deployment workflow. Confirm the new service revision and full commit SHA; capture the same record once more.
5. Collect the failed temporary PR, required-check ruleset, clean-clone Docker run and review links. Add direct links and one- or two-sentence captions to Answer Parts 0–4 in the final PDF.

The requested final filename is `lab5_sec1_PEEEEEEJA.pdf`. Prepare Answer Parts
0–4 after the missing evidence is captured; do not present a draft PDF as final
submission while C-02 through C-06 remain unverified.
