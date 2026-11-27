# FEAT-10 Expanded money movement

- Issue [#85](https://github.com/CPE334-Pockit/Pockit/issues/85), Sprint 2 [#82](https://github.com/CPE334-Pockit/Pockit/issues/82)
- Branch `feature/money-movement` from `staging-2` at `c5799b1`. PR target `staging-2`.
- Status: contract accepted for implementation following [PR #98](https://github.com/CPE334-Pockit/Pockit/pull/98). The [teammate review](https://github.com/CPE334-Pockit/Pockit/pull/98#issuecomment-7202656855) confirms the balance rules and requests the Lab 7 exception below.
- References: [SRS](../requirements/srs.md), [feature inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md), [Sprint 1 money and date policy](../adr/0001-sprint1-money-and-date-policies.md), and [FEAT-09 Account lifecycle](feat-09-account-lifecycle.md).

## Feature-Level SDS

FR-06–FR-09 and BR-02–BR-07 define the two forms, mixed allocations and natural-balance effects. FR-02, FR-05, BR-08, BR-10 and NFR-01–NFR-04 apply to identity, explicit dates, ownership, persistence, atomicity and exact amounts. Use FEAT-09's persisted User-owned Accounts and FEAT-08 evidence rules. FEAT-11 supplies later history filters. FEAT-12 continues to own the posted correction decision.

### Forms and ledger effects

The selected Account changes exactly once by the total. For `PAYMENT_CHARGE`, subtract the total from the selected Cash Account or add it to outstanding debt on the selected Loan Taken Account. For `RECEIVE_MONEY`, add the total to the selected receiving Cash Account. Apply each allocation amount to its counterpart once.

| Form | Allocation kind | Counterpart Account type | Counterpart effect |
| --- | --- | --- | --- |
| Payment/charge | `EXPENSE` | Expense | Increase spending category total |
| Payment/charge | `LOAN_TAKEN_REPAYMENT` | Loan Taken | Decrease outstanding debt |
| Payment/charge | `LOAN_GIVEN_LENDING` | Loan Given | Increase outstanding receivable |
| Payment/charge | `TRANSFER_TO_CASH` | Cash | Increase counterpart Cash balance |
| Receive money | `INCOME` | Income | Increase income category total |
| Receive money | `LOAN_GIVEN_REPAYMENT` | Loan Given | Decrease outstanding receivable |
| Receive money | `LOAN_TAKEN_BORROWING` | Loan Taken | Increase outstanding debt |
| Receive money | `TRANSFER_FROM_CASH` | Cash | Decrease counterpart Cash balance |

Only Income and Expense lines contribute to their respective totals. For a Cash-to-Cash transfer, the transfer portion leaves one Cash Account and enters the other by the exact same amount. For a card-funded Cash allocation, debt rises on the selected Loan Taken Account and Cash rises on the counterpart. Cash balances include both their selected-Account effects and applicable counterpart allocations. Keep both loan balances available through account and summary reads.

### Proposed boundary decisions

- Extend ADR-0001's single-currency THB rules (OQ-01/OQ-02/OQ-07). Accept positive decimal strings up to two fractional digits, reject excess precision without rounding and calculate in integer minor units. Require one or more lines and exact equality with the total. Apply no new amount ceiling or line cap. Retain the explicit calendar date without timezone conversion.
- Apply the full BR-02 allocation list to both allowed payment/charge sources. This permits card-funded transfers and repayments between distinct Loan Taken Accounts. Allow repeated references to valid counterparts, except that a Loan Taken-funded payment/charge must use each Expense Account at most once, including in a mixed transaction. This carries forward [Lab 7 #80](https://github.com/CPE334-Pockit/Pockit/issues/80). Reject an allocation to the selected Account itself, including Cash self-transfers and a Loan Taken Account repaying itself.
- Extend existing insufficient-balance and repayment rules to Cash counterpart outflows and Loan Given repayments. Check the sum of all debits or reductions against each affected Account's committed position in the posting transaction. Exact depletion is valid, overdrafts and negative debt or receivables are rejected. Keep the existing posting-time balance check for explicit backdated dates. Historical as-of balances require a separate decision.

### UI, API and data specifications

| Layer | Proposed behavior |
| --- | --- |
| UI | Expose Payment or charge and Receive money on the financial dashboard. Show an eligible selected Account and an editable list of allocation lines with kind, filtered owned counterpart and exact amount. Support adding/removing lines and display the amount left to allocate. Clear an invalid counterpart when its kind changes. Retain distinct same-name Account labels. Preserve starting balance entry and the original salary, card purchase and repayment journeys. Report server rejections without discarding the form and refresh account, summary and history reads after success. |
| API | Reuse `finance.transactions.create` with `form`, `sourceAccountId`, `totalAmount`, `transactionDate`, optional `description` and `allocations[]` of `kind`, `accountId` and `amount`. On receive, `sourceAccountId` continues to identify the receiving Cash Account. Keep existing account, summary and history response shapes and derive labels and amounts from persisted records. |
| Validation | Use the User session for every selected Account and counterpart. Guests get `UNAUTHORIZED`; Administrators get `FORBIDDEN`. A missing or foreign selected Account returns the existing non-disclosing `NOT_FOUND`. A missing or foreign counterpart or an invalid business rule returns `BAD_REQUEST`. Return a retryable `CONFLICT` for concurrent financial changes without exposing other owners' data. |
| Data and concurrency | Reuse existing `FinancialTransaction`, `AllocationLine` kinds and owner-scoped foreign keys. No schema, migration or seed change is planned. Reuse the serializable write transaction for validation and insertion together, and keep account/summary reads on consistent ledger snapshots. Calculate from the opening balance and persisted effects, with no independent balance update. Existing transactions retain their meaning. |

### Acceptance criteria

- **AC-F10-01** The two forms persist all permitted mixed allocations and expose correct balances and history for Cash, debt and receivables on subsequent reads.
- **AC-F10-02** Only the applicable Income and Expense lines affect their summaries. Invalid amount, form, account, ownership and concurrency cases either reject the whole transaction or preserve every ledger invariant.

## Software Test Specification

Use an isolated PostgreSQL database and synthetic Accounts, two Users, and one Administrator. API tests should compare both returned reads and stored row counts where relevant.

| Test ID | AC | Level and input | Expected result |
| --- | --- | --- | --- |
| F10-STS-01 | AC-F10-01, AC-F10-02 | API/database: start Cash A at 1000.00, Cash B at 200.00, Loan Taken at 300.00, Loan Given at 100.00. Pay 120.00 from A split Expense 40.00, Loan Taken repayment 30.00, lending 20.00, transfer to B 30.00. | Cash A 880.00, Cash B 230.00, debt 270.00, receivable 120.00, Expense 40.00. History persists all four lines. |
| F10-STS-02 | AC-F10-01, AC-F10-02 | API/database: from the state in F10-STS-01, receive 95.00 into A split Income 25.00, Loan Given repayment 20.00, borrowing 30.00, transfer from B 20.00. | Cash A 975.00, Cash B 210.00, debt 300.00, receivable 100.00, Income 25.00 and Expense still 40.00. Reopen the client and retrieve the two posted transactions and balances. |
| F10-STS-03 | AC-F10-01, AC-F10-02 | API/database: charge 3.00 to a Loan Taken Account, split 1.00 Expense, 1.00 repayment to another Loan Taken Account and 1.00 transfer to Cash. | Selected debt increases by 3.00, counterpart debt decreases by 1.00, Cash rises by 1.00, only 1.00 becomes Expense. |
| F10-STS-04 | AC-F10-02 | API/database: omit allocations, supply mismatched totals, excessive precision, zero/negative amount, invalid calendar date, wrong selected type, cross-form kind, wrong counterpart type and self-reference for Cash and Loan Taken. | Reject every invalid transaction without adding a parent or line. Compare balances, totals and history against the pre-request state. Include a valid split using one-satang lines. |
| F10-STS-05 | AC-F10-02 | API/database: repeat the same Cash sender or loan repayment counterpart in separate allocations. Submit exactly the available Cash/debt/receivable and then exceed a fresh fixture's balance by 0.01. Also test Cash selected-account outflow. | Exact depletion reaches zero; a one-satang excess is rejected using the aggregated affected amount. |
| F10-STS-06 | AC-F10-02 | API/database: guest, Administrator and second User attempt a mixed transaction with a missing or foreign selected/counterpart Account. Race two valid outflows that together exceed Cash, and race two repayments against the same outstanding loan. | Denials disclose no financial data. Competing writes cannot overdraw Cash or overpay loans; invalid/rejected writes leave no partial allocation. |
| F10-STS-07 | AC-F10-01, AC-F10-02 | UI/acceptance: enter one mixed payment and one mixed receipt, change allocation kind after selecting an Account, try an incorrect split, then correct and submit. | UI shows eligible typed choices and distinct duplicate labels, presents the rejection or prevents an invalid submit, and displays persisted effects on refreshed account, summary and history views. |
| F10-STS-08 | AC-F10-01, AC-F10-02 | Regression: run the Sprint 1 opening, salary receipt, split charge and repayment journey, plus FEAT-09 lifecycle and API ownership checks. | Existing journeys and stored records retain their behavior and privacy boundaries. |
| F10-STS-09 | AC-F10-02 | Regression: post repeated Expense references on a Loan Taken charge and on a Cash payment. Include a mixed Loan Taken charge. | Refuse repeated Expense references only for Loan Taken funding, with no partial row or effect. Equivalent Cash allocations can post. |

## Definition of Done and evidence

- Record teammate review of the allowed funding combinations, same-account rejection and grouped overdraft/repayment boundaries before behavior changes.
- Preserve a relevant automated failure before implementation and the subsequent passing suite against the actual commits. Link both acceptance criteria to executed test IDs, readable commands and counts, and describe any pending verification.
- Run the staged integration and regression suite, record teammate review and CI output, and identify the release commit and post-deployment verification. Use synthetic evidence only.
