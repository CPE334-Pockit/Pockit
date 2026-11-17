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
| C-03 (R-01, R-02) | [PR #57](https://github.com/ovenmakemeheat/Pockit/pull/57), separate fresh checkout of `lab5` at `3c7a7e9` with only ignored synthetic `.env` files and the Dockerfile fix: `docker compose -p pockit-lab5-clean build --quiet`, `up`, migration/seed one-off commands and HTTP checks. | Initial fresh build failed because Prisma Client was not generated inside the image. After the fix, both images built, four migrations applied, three synthetic Users and ten accounts seeded; API ready and web HTTP 200. A separate local browser journey also verified login, finance actions and allocation rejection. | `3c7a7e9fba6fec20c50a2e504d7e71fbe720c061` plus Dockerfile fix at PR #57 head `42f67d6827000d6ab144f549171be0daf6517219` | Recheck CI on the fixed head and merge PR #57 after teammate review; the initial failing build is preserved as regression evidence. |
| C-04 (R-03) | No public URL or live user journey linked. | Unverified. | None | Record public web/API URLs and screenshots for login, successful financial action, and rejection with URL visible. |
| C-05 (R-04) | Local `docker compose -p pockit-lab5-audit restart server web`, PostgreSQL User count query before/after and `/api/ready`; [PR #57](https://github.com/ovenmakemeheat/Pockit/pull/57). | Local synthetic User count stayed 3 and API reconnected to PostgreSQL after application container restart. No cloud restart/redeploy evidence. | `499f02b67c101699a5e302b23fa4adf3fd4e4aa3` | On GCP, capture the same recognizable financial record before/after application restart and redeployment with URLs, screenshots, revisions and commit. |
| C-06 (R-07–R-10) | [Deployment workflow](https://github.com/ovenmakemeheat/Pockit/blob/lab5/.github/workflows/deploy.yml) is merged into `lab5`; no release PR into `main` or successful deployment run linked. | Unverified. | None | Link teammate-reviewed release PR, passing CI on `main`, successful deploy run and Cloud Run revision/image matching full release SHA. |

## Issue #41 acceptance status

- AC-L5-08-01: open — local application restart preserved synthetic Users, but the Lab 5 public deployment still needs before/after financial-record evidence.
- AC-L5-08-02: open — no observed redeployment persistence result.
- AC-L5-08-03: open — C-02 through C-06 have no complete run/result/commit evidence.
- AC-L5-08-04: open — deployment and board evidence is incomplete.
- AC-L5-08-05: open — final PDF filename is known, but public URL, release and persistence evidence are missing.

## Capture sequence for the team

1. Record project ID, region, two service URLs, Cloud SQL instance, and serving revisions in `deployment.md` without secret values.
2. Use a synthetic user to create one clearly identifiable transaction through the public UI. Capture URL, transaction and balance; record the serving revision and commit.
3. Restart the application service without deleting Cloud SQL or its data. Sign in again and capture the same transaction and balance, plus new revision/instance evidence.
4. Release a reviewed change through `lab5` to `main` and the deployment workflow. Confirm the new service revision and full commit SHA; capture the same record once more.
5. Collect the failed temporary PR, required-check ruleset, clean-clone Docker run and review links. Add direct links and one- or two-sentence captions to Answer Parts 0–4 in the final PDF.

The requested final filename is `lab5_sec1_PEEEEEEJA.pdf`. Prepare Answer Parts
0–4 after the missing evidence is captured; do not present a draft PDF as final
submission while C-02 through C-06 remain unverified.
