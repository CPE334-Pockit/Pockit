# FEAT-14 All-time category report

- Issue [#88](https://github.com/CPE334-Pockit/Pockit/issues/88), Sprint 3 [#83](https://github.com/CPE334-Pockit/Pockit/issues/83)
- Branch `feature/category-reports` from `staging-3` at `17151a4`. PR target `staging-3`.
- Scope decision: on 28 November 2026 ICT the team confirmed an all-time report of per-category totals under [FR-10](../requirements/srs.md). Theme 7 names category spending summaries and reports. It leaves report periods and formats unspecified. This feature uses the existing all-time reporting basis, including transactions across calendar dates.
- Guntee [approved the contract](https://github.com/CPE334-Pockit/Pockit/pull/110#pullrequestreview-6091876789). PR #110 merged into `staging-3` at `9dfbd70`. Related rules are FR-09, BR-06, BR-07, NFR-02 and NFR-06. Depends on FEAT-07 summaries, [FEAT-10](feat-10-money-movement.md) allocation behavior and [FEAT-12](feat-12-transaction-correction.md) active-posting semantics.

## Feature-Level SDS

On the existing financial overview, expose an identifiable All-time category report. Display each owned Income and Expense Account and its exact THB total under its corresponding group. Display zero for a configured category without active allocations. Provide a group-specific empty state when the User has no categories of that type. Display the category name and formatted amount as text; type and amount are understandable without color. Same-name accounts in different groups remain separate. The report includes the sum of active allocations over all recorded transaction dates and is independent of the transaction-history filter state.

Count only active `INCOME` and `EXPENSE` allocations in the corresponding category. Opening positions, Cash transfers, lending, borrowing, and loan repayments are excluded. A corrected original contributes zero after Replace or Void. A replacement adds its own active allocations once. Favoriting a Transaction has no report effect. A saved duplicate counts as its own active Transaction using the entered allocation values.

| Layer | Contract |
| --- | --- |
| UI | Present an accessible report section on the User dashboard with explicit Income and Expense group labels, category names and exact totals. Use the existing summary query refresh after successful posting, correction or Account changes. |
| API and authorization | Reuse `finance.summary.get` and its current `categories` array (`accountId`, `accountName`, `type`, `total`), User-only role guard, and owner-scoped database queries. Keep the current summary response and owner-scoped query cache. Guests receive `UNAUTHORIZED` and Administrators receive `FORBIDDEN`. Separate Users only receive their own categories and totals. |
| Data | Reuse the persisted Accounts and active allocation records read in the existing summary snapshot. Existing account IDs identify rows, and existing exact minor-unit arithmetic determines amounts. The report requires no migration or additional persistence. |

Approved report scope is all-time category totals. Date-range filtering, scheduling and downloadable formats would require a separate scope decision.

## Acceptance and Software Test Specification

- **AC-F14-01** Record the approved all-time category reporting scope, data, authorization and date semantics under FR-10.
- **AC-F14-02** The User report shows exact persisted, owner-scoped Income and Expense category totals. It reflects active postings across all dates and excludes opening balances, Cash transfers, loans and repayments according to FR-09, BR-06 and BR-07.

Use two synthetic Users, an Administrator and isolated PostgreSQL. Verify the UI with existing dashboard/component test infrastructure. Keep the category report calculations on the server.

| Test ID | AC | Level and case | Expected result |
| --- | --- | --- | --- |
| F14-STS-01 | AC-F14-01 | Audit the team decision in #88, FR-10 mapping and this report contract. | The scope, calculation rules, all-time dates and roles are recorded. |
| F14-STS-02 | AC-F14-02 | PostgreSQL/API. Check summary after posting actual Income and Expense allocations across different dates and verify against both expanded allocation forms. Exercise zero categories and non-category effects including openings, transfers, borrowing and repayments. | Income and Expense category totals match their active allocations exactly. Zero categories are returned. Non-category activity creates no category totals. |
| F14-STS-03 | AC-F14-02 | PostgreSQL/API. Verify active category totals after replacing and voiding postings and after a new saved duplicate. | Corrected originals contribute zero, a replacement or duplicate contributes once, and no amount is lost or counted twice. |
| F14-STS-04 | AC-F14-02 | PostgreSQL/API. Compare two Users' report results and call the summary as guest and Administrator. | Each User receives their own categories only. Guest and Administrator summary access is rejected. |
| F14-STS-05 | AC-F14-02 | Web. Verify both labelled groups, exact amounts and zero rows, same-name categories across groups, and a missing group. Apply or clear history filters with the report visible. | Every row appears under its category type, missing groups have an explicit state, and filtering history leaves the all-time report unchanged. |
| F14-STS-06 | AC-F14-02 | Integrated browser acceptance. Post synthetic Income and Expense on different dates, exercise a non-category money move and reload. Verify report against persisted rows and filter history. | Report totals match the ledger, survive reload and stay all-time while history filters change. |

## Execution evidence

| Revision | Command or observation | Result |
| --- | --- | --- |
| `bf99c2c` | From `apps/web`, `bun test src/components/finance-dashboard.test.tsx -t F14-STS-05` on Bun 1.4.4 | RED: both cases failed because the All-time category report region was missing. |
| `1ffbc7a` | `bun run db:migrate:deploy` on isolated PostgreSQL 17, then `bun run test` on Bun 1.4.4 | GREEN: 101 passed, 0 failed, 0 skipped (Web 28, API 49, server 22, DB 2). |
| `1ffbc7a` | `bun run check-types`, `bun run build`, targeted Biome and `git diff --cached --check` | Passed. |
| `1ffbc7a` | `bun run db:seed`, production `bun run build`, and Chrome on the compiled applications behind a loopback gateway | Candidate browser check passed. Report initially displayed zero for each category. With opening Cash 100.00, Salary 50.05 on 2026-11-27, Dining 10.10 and Groceries 20.25 on 2026-11-28, and a 5.00 card repayment, reload retained all three category amounts. Cash was 145.05 and card debt was 25.35. Filtering history to 2026-11-28 hid Salary from the two-row history result and left the all-time report unchanged. |

- F14-STS-02 and F14-STS-04 use the mixed-movement case and the guest/Administrator denial case in [finance.test.ts](../../packages/api/src/routers/finance.test.ts). The mixed case covers all allocation kinds across two dates, zero categories and both directions of owner isolation.
- F14-STS-03 uses the replacement/void and edited-duplicate cases in [finance.test.ts](../../packages/api/src/routers/finance.test.ts), including the resulting per-category totals.
- F14-STS-05 uses the [dashboard tests](../../apps/web/src/components/finance-dashboard.test.tsx). F14-STS-06 has passing candidate browser evidence. Teammate review and confirmation on `staging-3` remain open for AC-F14-02.

## Definition of Done

- Link the team decision, FR-10 and the reviewed contract to #88.
- Demonstrate a targeted failing web test before adding the report presentation. Reuse existing business-rule regressions with mapped evidence and add coverage if a required classification case is absent. Record commands, outcomes and commit SHAs for the targeted tests and the full suite, type check and build.
- Verify F14-STS-06 and record the reviewed staging merge and release evidence. Check acceptance criteria in #88 when verified.
