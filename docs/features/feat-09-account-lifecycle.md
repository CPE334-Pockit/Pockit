# FEAT-09 Account lifecycle

- Issue [#84](https://github.com/CPE334-Pockit/Pockit/issues/84), Sprint 2 [#82](https://github.com/CPE334-Pockit/Pockit/issues/82)
- Branch `feature/account-lifecycle` from `staging-2` at `4992836eb4d8560bc00026f6386f59670b0871ba`. PR target `staging-2`.
- Status: proposed for teammate review. The lifecycle policy below needs a recorded decision before implementation.
- References: [SRS](../requirements/srs.md), [feature inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md), [Sprint 1 contract](sprint1-feature-contracts.md), [money and date policy](../adr/0001-sprint1-money-and-date-policies.md).

## Feature-Level SDS

FR-04 and BR-01 cover creating and managing the five Account types. BR-05 and BR-06 govern the starting position and classification. FR-02, BR-08, NFR-01, NFR-02, NFR-04 and NFR-05 apply to ownership, persistence, exact money and synthetic evidence. The feature depends on the Sprint 1 session, Account model and persisted reads. FEAT-10 consumes the Accounts created here.

### Proposed lifecycle policy

- Users may create and rename Cash, Loan Given, Loan Taken, Income and Expense Accounts. Trim the name and require at least one non-whitespace character. Account type, owner and THB currency are fixed once created. Allow duplicate names within an owner and distinguish Accounts by ID.
- Propose deleting only unused Accounts. An Account with a recorded opening balance or a reference as a transaction source or allocation target is retained to preserve history. Archiving, changing types and retroactively correcting a starting position require a separate scope decision.
- For Cash, Loan Given and Loan Taken, a User may set an optional opening position on creation or set it once before the first posting. Cash and Loan Given are positive assets and Loan Taken is positive debt. Reuse the Sprint 1 positive THB validation with up to two fractional digits. An absent position reads as a zero balance with a null opening balance. Income and Expense use category totals and reject opening amounts.
- Renaming preserves IDs and ledger calculations. Views that resolve present Account names show the new name. Posted Transaction corrections and new allocation operations are outside this feature.

### UI, API and data specifications

| Layer | Proposed behavior |
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

Planned seams are the finance router tests, PostgreSQL persistence tests and Accounts UI tests. All test IDs above are planned. Actual file/test names, commands, results and tested versions will be recorded here or in the linked execution record.

## Definition of Done and evidence

- Teammate review records decisions on management operations, deletion eligibility, duplicate names and eligible opening positions before implementation.
- Preserve failing test output before behavior changes, then preserve passing and regression results with the same test IDs, commands, counts and commits.
- Map both acceptance criteria to actual test locations and results, with authenticated UI evidence and backend persistence and denial evidence.
- Keep the issue checklist and board aligned. Record CI, separately reviewed release PR, accepted release commit and any unresolved verification.
