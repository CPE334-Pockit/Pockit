# FEAT-09 Account lifecycle

- Issue [#84](https://github.com/CPE334-Pockit/Pockit/issues/84), Sprint 2 [#82](https://github.com/CPE334-Pockit/Pockit/issues/82)
- Branch `feature/account-lifecycle` from `staging-2` at `4992836eb4d8560bc00026f6386f59670b0871ba`. PR target `staging-2`.
- Status: implemented on the issue branch and awaiting integration review. The contract merged in [PR #94](https://github.com/CPE334-Pockit/Pockit/pull/94) at `0012012`. The product owner directed implementation to continue using those rules on 26 November 2026.
- References: [SRS](../requirements/srs.md), [feature inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md), [Sprint 1 contract](sprint1-feature-contracts.md), [money and date policy](../adr/0001-sprint1-money-and-date-policies.md).

## Feature-Level SDS

FR-04 and BR-01 cover creating and managing the five Account types. BR-05 and BR-06 govern the starting position and classification. FR-02, BR-08, NFR-01, NFR-02, NFR-04 and NFR-05 apply to ownership, persistence, exact money and synthetic evidence. The feature depends on the Sprint 1 session, Account model and persisted reads. FEAT-10 consumes the Accounts created here.

### Lifecycle policy

- Users may create and rename Cash, Loan Given, Loan Taken, Income and Expense Accounts. Trim the name and require at least one non-whitespace character. Account type, owner and THB currency are fixed once created. Allow duplicate names within an owner and distinguish Accounts by ID.
- Users may delete only unused Accounts. An Account with a recorded opening balance or a reference as a transaction source or allocation target is retained to preserve history. Archiving, changing types and retroactively correcting a starting position require a separate scope decision.
- For Cash, Loan Given and Loan Taken, a User may set an optional opening position on creation or set it once before the first posting. Cash and Loan Given are positive assets and Loan Taken is positive debt. Reuse the Sprint 1 positive THB validation with up to two fractional digits. An absent position reads as a zero balance with a null opening balance. Income and Expense use category totals and reject opening amounts.
- Renaming preserves IDs and ledger calculations. Views that resolve present Account names show the new name. Posted Transaction corrections and new allocation operations are outside this feature.

### UI, API and data specifications

| Layer | Behavior |
| --- | --- |
| UI | Add a create form and rename/delete actions to Accounts. Show type on creation and the opening amount only for eligible types. Include Loan Given and Loan Taken in the existing one-time opening balance entry flow when eligible. Confirm delete and show rejection inline. Refresh account and summary reads after a successful mutation. Keep controls keyboard accessible with labels and pending states. |
| API | Add User-only `finance.accounts.create({ name, type, openingBalance? })`, `rename({ accountId, name })` and `delete({ accountId })`. Return the new Account on create, Account ID and name on rename, and Account ID on delete. Extend existing `setOpeningBalance` without changing its input or response. Keep existing list/get response shapes and derive ownership from the authenticated session. |
| Validation | Invalid name, type, money or opening eligibility returns `BAD_REQUEST`. Invalid session returns `UNAUTHORIZED`; forbidden role returns `FORBIDDEN`; a missing or foreign ID returns `NOT_FOUND` without disclosing ownership. Deleting an Account in use returns `CONFLICT`. Concurrent changes must either commit consistently or return the existing retryable conflict; rejected mutations leave financial data unchanged. |
| Persistence | Reuse `FinancialAccount` and its owner relationship, immutable ID/type/currency, nullable text minor units, and existing restrictive foreign keys. No schema, migration or seed changes are planned. Guard opening-balance and delete eligibility inside the same transaction as the write, including both source and allocation references. |

### Acceptance criteria

- **AC-F09-01** A User can create and manage owned Accounts across the five types. Creation and rename persist across reads. Delete follows the approved lifecycle boundary and leaves linked history intact.
- **AC-F09-02** Eligible opening positions contribute exactly to balances and stay out of Income and Expense. Invalid or ineligible changes and unauthorized requests are rejected without side effects.

## Software Test Specification

Use synthetic fixtures with two enabled Users and an Administrator. Compare stored IDs, balances, category totals and persisted history where relevant. API and database cases run against the real PostgreSQL-backed suite.

| Planned test | AC | Level and input | Expected result |
| --- | --- | --- | --- |
| F09-STS-01 | AC-F09-01 | API/database: create each type with a padded name, reload list/get, rename an existing Account and create two same-named Accounts | Five supported types with distinct IDs and the actor as owner. Names are trimmed and renamed values persist without changing linked records or balances. |
| F09-STS-02 | AC-F09-01 | API/database: whitespace-only name, unknown type, delete unused Account, then attempt deletion of Accounts with an opening position, source posting and allocation posting | Invalid inputs are rejected, unused record disappears and retained records plus history are intact. |
| F09-STS-03 | AC-F09-02 | API/database: create a Cash Account with `0.01`, Loan Given with `100.25`, Loan Taken with `75.10`; set an opening balance on another eligible existing Account | Exact persisted asset and debt values with no transactions or allocations added. Income and Expense totals are unchanged. |
| F09-STS-04 | AC-F09-02 | API/database: absent opening position, category with amount, explicit zero, negative, three fractional digits, existing position, posted source and allocation | Absent position has a zero natural balance. Invalid or ineligible writes return `BAD_REQUEST` and preserve previous state. |
| F09-STS-05 | AC-F09-02 | API/database: anonymous and Administrator calls for each mutation; second User calls by foreign ID and lists own Accounts | Anonymous and Administrator mutations are refused. Foreign targets are indistinguishable from missing Accounts and absent from the second User's list. No unauthorized writes. |
| F09-STS-06 | AC-F09-01, AC-F09-02 | API/database concurrency: run competing opening writes and attempt deletion against a posting for the same Account | At most one opening write persists. Concurrent posting and delete cannot leave dangling references or lose posted history. |
| F09-STS-07 | AC-F09-01, AC-F09-02 | UI: add a Cash Account with an opening position, rename it, refresh, exercise a rejected action and delete an unused category with keyboard controls | Correct persisted display, reachable controls, visible rejection and current data after a successful action. |
| F09-STS-08 | AC-F09-01, AC-F09-02 | Regression: Sprint 1 opening bank balance, salary, split card purchase, repayment, balance/summary/history and authorization checks | Original journey and financial isolation still work on the integration commit. |
| F09-STS-09 | AC-F09-01 | UI: open the receive-money form with two Cash Accounts named Bank and choose the second Account | Each choice includes its displayed balance and Account ID. Submission uses the chosen ID. |

### Execution evidence

Local verification used Bun 1.3.9 and a temporary PostgreSQL 17 database. The checked-in migrations were applied with `bun run db:migrate:deploy`. The workflow continues to use the repository's pinned Bun version.

| Revision | Command | Observed result |
| --- | --- | --- |
| `9bf1fe5` | `bun test packages/api/src/routers/finance.test.ts -t 'records an exact opening position'` with disposable `DATABASE_URL` and `NODE_ENV=test` | RED: 0 pass, 1 fail, 13 filtered out. F09-STS-03 reached the API and failed with `BAD_REQUEST: An opening balance can only be set for a Cash Account`. |
| `7004335` | `bun run test` with the same database and `NODE_ENV=test` | GREEN: 67 pass, 0 fail, 0 skipped. Web 16, server 22, API 27, database 2. F09-STS-03 passed with persisted `100.25` on the Loan Given Account. |
| `7004335` | `bun run check-types` and `bun run build` | Both passed. Targeted Biome check on all eight changed TypeScript files and `git diff origin/staging-2...HEAD --check` also passed. |
| `a6ef978` | From `apps/web`, `bun test src/components/finance-dashboard.test.tsx -t F09-STS-09` | RED: 0 pass, 1 fail, 7 filtered out. The picker label contained the name and ID but lacked the visible balance requested for disambiguation. |
| `3e3fa01` | From `apps/web`, `bun test` and `bun run check-types` | GREEN: 17 pass, 0 fail, 0 skipped, including F09-STS-09 in [finance-dashboard.test.tsx](../../apps/web/src/components/finance-dashboard.test.tsx). Web type check and build passed. |

| Acceptance criterion | Executed verification | Result |
| --- | --- | --- |
| AC-F09-01 | F09-STS-01, -02, -06 in [finance.test.ts](../../packages/api/src/routers/finance.test.ts); F09-STS-07 in [account-management.test.tsx](../../apps/web/src/components/account-management.test.tsx); F09-STS-08 continuity in [finance-persistence.test.ts](../../apps/server/src/finance-persistence.test.ts) | Passed on the implementation commit. Component tests simulated refreshed account data. Live browser keyboard and refresh verification and staging acceptance remain open. |
| AC-F09-02 | F09-STS-03 through -06 in [finance.test.ts](../../packages/api/src/routers/finance.test.ts); F09-STS-07 in [finance-dashboard.test.tsx](../../apps/web/src/components/finance-dashboard.test.tsx); F09-STS-08 access and ledger continuity in the finance API and server suites | Passed on the implementation commit. CI, reviewed integration and release evidence are pending. |

## Definition of Done and evidence

- Teammate review records decisions on management operations, deletion eligibility, duplicate names and eligible opening positions before implementation.
- Preserve failing test output before behavior changes, then preserve passing and regression results with the same test IDs, commands, counts and commits.
- Map both acceptance criteria to actual test locations and results, with authenticated UI evidence and backend persistence and denial evidence.
- Keep the issue checklist and board aligned. Record CI, separately reviewed release PR, accepted release commit and any unresolved verification.
