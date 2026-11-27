# FEAT-12 Posted Transaction correction

- Issue [#87](https://github.com/CPE334-Pockit/Pockit/issues/87), Sprint 2 [#82](https://github.com/CPE334-Pockit/Pockit/issues/82)
- Branch `feature/transaction-correction` from `staging-2` at `d20e164`. PR target `staging-2`.
- Decision status: OQ-04 approved on 27 November 2026. The project chat confirmed the team's choice of Replace and Void with immutable owner-only history, a required reason, and exact final-balance validation. [PR #104](https://github.com/CPE334-Pockit/Pockit/pull/104) contains the preceding draft review and merged at `8418682`.
- References: [Theme 7 project brief](../assignments/final/group_work_specs_v1.pdf), [SRS FR-13 and OQ-04](../requirements/srs.md), [feature inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md), [FEAT-10 money movement](feat-10-money-movement.md), and [FEAT-11 history](feat-11-history-filters.md).

## OQ-04 decision

Offer the owner two correction actions on an active posted Transaction:

| Action | Ledger result | Audit result |
| --- | --- | --- |
| Replace | Post an edited draft as a new Transaction and remove the original from the active ledger in the same write. Reuse all current form, amount, date, allocation and ownership rules. | Preserve the original fields and allocations and link the new Transaction to it with the actor, recorded time and required nonblank reason. |
| Void | Remove a mistaken or duplicate Transaction from the active ledger without posting a replacement. | Keep the original Transaction, allocations, actor, recorded time and required reason in correction history. |

Treat a posted Transaction and its allocations as immutable. A replacement can be corrected later if active, producing an auditable sequence. Require a confirmation before saving a replacement or void. Retain Account references and resolve their current display names through the existing relationships. The correction time is an audit timestamp. The replacement's entered calendar date is its effective transaction date.

The explicit decision includes both actions as described above. History shows active records by default, with a separate owner-only audit read. Final-balance checks use the existing posting-time policy.

## Feature-Level SDS

FR-13 defines correction. FR-06–FR-10 and BR-02–BR-08 and BR-10 constrain replacement, balance, reporting, exact money and ownership. NFR-01–NFR-04 and NFR-06 apply to privacy, persistence, atomicity, precision and evidence. Depend on FEAT-05, FEAT-06 and FEAT-10's posted money rules and FEAT-11's owner-scoped history.

### Ledger and consistency

- Compute active balances and category totals from opening positions and active posted Transactions and their allocation lines. An original with a committed correction stops contributing. A replacement contributes once. Keep historical references available to the account lifecycle guards, including whether an Account has ever been used.
- Validate the final balances of every Cash, Loan Given and Loan Taken Account affected by the original or replacement. Evaluate the removal and replacement together against the persisted ledger. Zero is valid. Reject a result that would leave negative Cash, receivable or outstanding debt. Apply the current posting-time policy with explicit dates. A correction may change a dated history row without changing that policy.
- Atomically commit any replacement and the audit link using the existing serializable write boundary. One original can have at most one committed correction. A competing request can succeed only if the original is still active and ledger validation passes. Surface a safe conflict and preserve the current ledger and audit history when a request fails.

### UI, API and data contract

| Layer | Behavior |
| --- | --- |
| UI | Open a correction draft from an active history entry. Populate the editable form and allocation lines from that entry for Replace. Require a reason and confirmation for either action. On success refresh active history, Account balances and summaries. Display prior originals and the reason in an owner-only correction history view. Preserve input on rejected corrections. |
| API | Add User-only `finance.transactions.correct` with `transactionId`, `reason`, and a discriminated `REPLACE` or `VOID` action. Replace carries the existing create payload. Void carries no replacement. Return correction ID and replacement ID when present. Add an owner-only read for correction records with the original and any replacement. Keep existing active history filters and response shape. |
| Errors and roles | Return `UNAUTHORIZED` to guests and `FORBIDDEN` to Administrators. Use the same `NOT_FOUND` response for unknown and foreign original Transactions. Reject invalid reasons, replacement inputs, Accounts and final balance violations with `BAD_REQUEST`. Return `CONFLICT` for an already corrected original or an incompatible concurrent write. |
| Data and migration | Add a versioned PostgreSQL migration for an immutable correction link between the owner, original, optional replacement, action, reason and timestamp. Use existing composite owner/Transaction references. Make original unique and enforce action/replacement consistency and distinct original/replacement IDs. Existing Transactions have no correction link and start active. |
| Read paths | Apply the active-Transaction predicate to ordinary history and to every balance/category calculation, including nested allocation queries. Correction history reads both versions. Use owner constraints on original, replacement, allocations and audit access. The account API supplies opening-balance eligibility from all ledger references, including corrected records. |

## Acceptance and Software Test Specification

- **AC-F12-01** Record the approved OQ-04 policy and agree the resulting UI/API/data contract and verification scope.
- **AC-F12-02** Under the approved policy, the owner corrects an active posted Transaction with correct balances, summaries and history, preserving original records and rejecting invalid and unauthorized changes atomically.

Use two synthetic Users, an Administrator and isolated PostgreSQL.

| Test ID | AC | Level and case | Expected result |
| --- | --- | --- | --- |
| F12-STS-01 | AC-F12-01 | Review: record the decisions on Replace, Void, reason, active and audit history, and final-balance validation. | Explicitly approved policy linked to #87 with all applicable cases and any approved scope revision recorded. |
| F12-STS-02 | AC-F12-02 | API/database: from Cash 100.00 post Expense 20.00, then replace it with Expense 12.00 in another category and reopen the client. | Cash 88.00, only 12.00 in the new category, one active replacement and original 20.00 retained with the actor/reason link. |
| F12-STS-03 | AC-F12-02 | API/database: void an otherwise valid replacement from F12-STS-02, then query active and audit history. | Cash 100.00 and zero Expense from that chain. No active row from the chain. Both audit events and prior allocations remain retrievable. |
| F12-STS-04 | AC-F12-02 | API/database: receive 100.00 into zero Cash and spend 80.00. Try voiding the receipt or replacing it with 79.99. Compare with replacement at 80.00. Include an affected loan and an invalid replacement allocation sum. | The invalid actions leave all row counts, balances and history unchanged. The exact-zero valid replacement succeeds. A correction that would leave negative debt or receivable is rejected. |
| F12-STS-05 | AC-F12-02 | API/database: missing/foreign original, foreign Account on a replacement, blank reason, unauthenticated User, Administrator and audit access from a second User. | Requests preserve owner isolation, disclose no financial data and do not add a replacement or audit event. |
| F12-STS-06 | AC-F12-02 | API/database: race two corrections for the same active original and race a correction with a posting that would exhaust its funds. | At most one correction commits per original. Competing operations preserve natural balances and no orphan replacement persists. |
| F12-STS-07 | AC-F12-02 | UI/acceptance: open a posted draft, update and confirm, reload history, inspect the audit entry and exercise a rejected correction. | The new balances and active history reflect the saved correction, the original is visible through audit history, and rejected input stays editable. |
| F12-STS-08 | AC-F12-02 | Migration and regression: apply the versioned migration to a database containing pre-existing Transactions. Rerun Sprint 1 and FEAT-09–11 flows, including Filter by Account and opening-balance eligibility. | Existing records remain active and readable. History filters use corrected active records. Earlier account, allocation and privacy behavior still holds. |

## Execution evidence

| Revision or migration | Command | Observed result |
| --- | --- | --- |
| `5d5e238` | `bun test packages/api/src/routers/finance.test.ts -t F12-STS-02` with isolated PostgreSQL 17 `DATABASE_URL` and `NODE_ENV=test` | RED: 1 failed, 27 filtered. The test posted the original, then the router reported no procedure at `finance.transactions.correct`. |
| `20261127000000_add_financial_transaction_correction` | `bun run db:migrate:deploy`, `bun run db:generate` and a PostgreSQL lookup of the synthetic pre-migration row and its allocation | Migration and client generation passed. The existing row and allocation each still held 1,234 satang, and the new table held no correction for that row. |
| `6e535db` | `bun run test` with migrated PostgreSQL 17 and `NODE_ENV=test` | GREEN: 91 passed, 0 failed, 0 skipped (Web 22, API 45, server 22, database 2). Local Bun 1.3.9. |
| `6e535db` | `bun run check-types`, `bun run build`, targeted Biome and `git diff origin/staging-2...HEAD --check` | Passed. Type check finished 6 tasks and build finished 2 tasks. |

- **AC-F12-01:** F12-STS-01 satisfied by the recorded OQ-04 decision at `5d5e238`. The decisions and the corresponding UI, API, data and verification contract appear above.
- **AC-F12-02:** F12-STS-02–06 and F12-STS-08 passed in [finance.test.ts](../../packages/api/src/routers/finance.test.ts). F12-STS-07 in [finance-dashboard.test.tsx](../../apps/web/src/components/finance-dashboard.test.tsx) verifies UI confirmation, preserving editable input after rejection and the audit view. A live browser acceptance run and staging integration remain open.

## Definition of Done and evidence

- Link the approved policy, any revisions and their rationale to the issue before behavior changes. Mark AC-F12-01 only after that decision is recorded.
- Version any required migration and automated tests. Preserve behavioral RED and passing evidence with the commands, test IDs, counts and tested revisions.
- Link actual tests and live acceptance to AC-F12-02. Record the teammate-reviewed integration and CI, Sprint 2 release version, and outstanding checks.
