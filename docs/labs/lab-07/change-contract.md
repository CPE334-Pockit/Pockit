# Lab 7 card purchase change contract

[Part A #79](https://github.com/CPE334-Pockit/Pockit/issues/79) · [Implementation #80](https://github.com/CPE334-Pockit/Pockit/issues/80)

Guntee reports that course staff said separate change approval can be skipped. This is a reported waiver of that step, not approval of this rule. MadMax must review this contract before implementation.

## Baseline

Sprint 1 tag `sprint1-v1.0.0` (`e99da77`); accepted Lab 6 deployment `b315c99b7e68ec4061bd131aff016bb19ed6c899`, revision `s4b043a2c-00005-qd5`. Contract base: `staging-2` at `4992836eb4d8560bc00026f6386f59670b0871ba`, which includes Lab 6 account provisioning and report changes. Confirm the actual pre-change commit and deployed version again before RED. In both inspected code revisions, the finance router deduplicates IDs for lookup but keeps the supplied allocation lines for persistence.

## Contract revision

| Area | Old rule | New rule and impact |
| --- | --- | --- |
| SRS FR-06/FR-08; FEAT-06; Feature SDS F6-AC-01/04 | A credit-card purchase accepts one or more valid Expense allocations that sum to the total. The same Expense account can appear more than once. | A credit-card purchase must use each Expense account at most once. Combine amounts for the same category into one line so the purchase has one amount per category. A single line is still valid. |
| System SDS validation; UI and API callers | The card form submits allocation rows to `finance.transactions.create`. | The form explains the duplicate and lets the user correct it. The server rejects the duplicate before any write, even if the total matches. Keep ownership and role checks. |
| Persistence and history | The router saves the transaction and allocation rows together. | Keep atomic writes and existing history, including old duplicate rows. No migration or balance recalculation because this changes validation for new purchases only. |
| Unaffected flows | Salary receipts and repayment have separate rules. | Do not change those rules, owner isolation, Administrator finance denial, or exact minor-unit sums. |

## Sprint 1 test specification revision

| Test | Setup and input | Expected result |
| --- | --- | --- |
| STS-CARD-08; F6-AC-04 | Signed-in owner, owned card and Expense account. Submit 4.00 and 6.00 to the same account for a 10.00 purchase. | Reject with a duplicate-category error. Debt, totals and history remain unchanged. RED must fail because the old server accepts the request. |
| STS-CARD-07; F6-AC-01 | Submit one owned Expense allocation of 10.00. | Save one allocation and increase card debt and Expense by exactly 10.00. |
| STS-CARD-01; F6-AC-01/03 | Split 10.00 as 4.00 and 6.00 across two distinct owned Expense accounts. | Both allocations persist and change the category totals and debt by the exact amounts. |
| Existing finance and authorization regressions | Repeat mismatch, foreign ownership, Administrator denial, salary and repayment checks. | Existing outcomes remain unchanged. |

At release, verify the duplicate rejection and valid split with synthetic data on the corrected deployed revision. Record tested commits, RED/GREEN logs, CI, teammate review, and deployment evidence in Part B.
