# Lab 6 UAT account provisioning

Issue: [#75](https://github.com/CPE334-Pockit/Pockit/issues/75). This is a
bounded production setup for the three synthetic identities required by the
partner UAT handoff in [#52](https://github.com/CPE334-Pockit/Pockit/issues/52).
It does not reset the existing `course.user@pockit.test` record or any finance
transactions.

## Contract and verification

| ID | Expected result | Evidence to record |
| --- | --- | --- |
| AC-DEMO-01 | `demo.user@pockit.test` and `demo.user2@pockit.test` are Users with five synthetic accounts each; `demo.admin@pockit.test` is an Administrator with no finance accounts. | Successful job execution, role/owner query using a read-only verification command, and private sign-in results. |
| AC-DEMO-02 | Each identity has a different password of at least 16 characters. Secret values stay in team slots 3, 4 and 5, never in Git or logs. | Job configuration displays secret *references* only; no values are printed. |
| AC-DEMO-03 | Repeating the bootstrap creates zero Users and preserves credentials, balances and transactions. A conflict aborts the transaction. | `seed-data.test.ts` PostgreSQL test and second job execution. |
| AC-DEMO-04 | All three accounts sign in; Administrator finance access and cross-User finance access are denied. | Private UI/API checks with expected 403/authorization result and unchanged record counts. |
| AC-DEMO-05 | The reviewed release, command, execution and handoff are linked in #75 and #52. | PR/CI/release links and test record. |

The bootstrap reads the reserved identity and account fixtures from
`apps/server/src/seed-data.ts`, but uses a separate production-safe command
`apps/server/src/bootstrap-demo.ts`. It creates missing identities once and
preserves existing password hashes and finance data on later runs. Existing
records with conflicting emails, roles, credentials or required account
fixtures abort the whole transaction. The Administrator must have zero
financial accounts.

## Private secret setup

The team member stores three **distinct** 16-character-or-longer passwords in
the pre-provisioned team Secret Manager slots. The course portal's Project Kit
provides the hidden-input command from its extracted folder:

```sh
./kit.sh doctor
./kit.sh secrets add 3  # demo.user@pockit.test
./kit.sh secrets add 4  # demo.user2@pockit.test
./kit.sh secrets add 5  # demo.admin@pockit.test
```

Keep the values in a password manager and share them privately with the UAT
tester. Do not paste them into a shell argument, issue, PR, screenshot or PDF.
Record only that slots 3–5 contain a version. Do not retrieve their values.

## Reviewed release and one-time job

First merge the reviewed implementation PR into `lab6`, then a separately
reviewed release PR into `main`. Wait for the exact-SHA CI and automatic deploy
to finish. Use the resulting team image URI from the deploy run. The following
commands update only the pre-provisioned `s4b043a2c-migrate` job in the team
project; substitute the verified full-SHA image URI for `<IMAGE>`:

```sh
gcloud run jobs describe s4b043a2c-migrate \
  --project=cpe-se-course-2026 --region=asia-southeast1
gcloud run jobs update s4b043a2c-migrate \
  --image='<IMAGE>' --command=bun --args=apps/server/src/bootstrap-demo.ts \
  --update-env-vars=NODE_ENV=production,POCKIT_DEMO_BOOTSTRAP=1 \
  --update-secrets=POCKIT_DEMO_USER_PASSWORD=s4b043a2c-app-secret-3:latest,POCKIT_DEMO_USER2_PASSWORD=s4b043a2c-app-secret-4:latest,POCKIT_DEMO_ADMIN_PASSWORD=s4b043a2c-app-secret-5:latest \
  --project=cpe-se-course-2026 --region=asia-southeast1
gcloud run jobs execute s4b043a2c-migrate \
  --wait --project=cpe-se-course-2026 --region=asia-southeast1
```

The success log should say that three reserved identities were verified and
three created. A second execution should report zero created and three
preserved. A nonzero exit means no acceptance check is complete; inspect
the job error without printing secret values. After verification, restore the
job's migration command so the team's shared job remains ready for releases:

```sh
gcloud run jobs update s4b043a2c-migrate \
  --command=bun --args=run,db:migrate:deploy \
  --update-env-vars=POCKIT_DEMO_BOOTSTRAP=0 \
  --remove-secrets=POCKIT_DEMO_USER_PASSWORD,POCKIT_DEMO_USER2_PASSWORD,POCKIT_DEMO_ADMIN_PASSWORD \
  --project=cpe-se-course-2026 --region=asia-southeast1
```

Do not run the local `seed:demo` command against production: it deliberately
rejects production and its local fixture behavior can rewrite credential
hashes. The production bootstrap above preserves existing credentials.

## UAT checks and handoff

Log in separately at
`https://s4b043a2c-4d7hbszvwq-as.a.run.app/login` with each synthetic email
and its private password. Confirm the two Users see only their own five
financial accounts. Confirm the Administrator can view/manage platform User
accounts but cannot view financial accounts or summaries. Check one
cross-User finance request is denied without changing the target User's data.
Record the tested release SHA, revision, job execution ID, account labels and
role results in #75 and #52. Keep passwords out of those records.

## Local test evidence

The first test run failed because `./bootstrap-demo-data` did not exist (TDD
red). After implementation, `DATABASE_URL=<disposable local PostgreSQL URL>
bun test apps/server/src/seed-data.test.ts` passed 3 tests, 0 failed, using
four checked-in migrations. The combined bootstrap, course bootstrap and
authentication regression command passed **15 tests, 0 failed, 92 assertions**:

```sh
DATABASE_URL=<disposable local PostgreSQL URL> bun test \
  apps/server/src/seed-data.test.ts \
  apps/server/src/bootstrap-course-data.test.ts \
  apps/server/src/auth.test.ts
```

The tests cover initial roles/accounts, distinct hashed credentials,
repeat-run preservation of a synthetic transaction and opening balance,
rejection of weak/reused passwords and a conflicting Administrator role,
plus login and server-side role restrictions. `bun run check-types` and
targeted `biome check` passed. Repository-wide `bun run check` still fails on
unrelated pre-existing formatting in `.claude/skills/shadcn` and `packages/ui`;
the three changed TypeScript files pass the targeted check. Cloud results
will be added after the reviewed release and private secret setup.

The PR also adds `lab6` to the `ci-docker.yml` pull-request branch filter so
the existing `test-and-docker` gate runs on Lab 6 implementation PRs before
they reach the separately reviewed `main` release PR.
