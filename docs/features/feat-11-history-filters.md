# FEAT-11 Transaction history search and filters

- Issue [#86](https://github.com/CPE334-Pockit/Pockit/issues/86), Sprint 2 [#82](https://github.com/CPE334-Pockit/Pockit/issues/82)
- Branch `feature/history-filters` from `staging-2` at `1458afd`. PR target `staging-2`.
- Status: implemented and awaiting integration review. The contract received teammate approval in [PR #101](https://github.com/CPE334-Pockit/Pockit/pull/101) and merged at `92805b3`. The review confirmed literal search, inclusive calendar dates, matching both Account roles and the empty response for both unknown and foreign Account IDs.
- References: [SRS](../requirements/srs.md), [feature inventory](../requirements/feature-inventory.md), [System-Level SDS](../architecture/system-level-sds.md), [Sprint 1 date policy](../adr/0001-sprint1-money-and-date-policies.md), [FEAT-10](feat-10-money-movement.md).

## Feature-Level SDS

FR-10 and FR-13 cover viewing and searching persisted history. BR-08 and NFR-01 preserve the server-side ownership boundary. NFR-02 and NFR-06 apply to persisted reads and acceptance evidence. FEAT-07 supplies existing history and FEAT-09/10 supply owned Accounts and posted allocation lines. Posted correction belongs to FEAT-12. This proposal resolves OQ-03 only for history ranges.

### Matching rules

| Input | Behavior |
| --- | --- |
| `search` | Trim whitespace. Match a case-insensitive literal substring in the description, the current selected Account name or any current allocation Account name. Blank text is omitted. A percent sign, underscore or backslash in a term is text. A matching allocation includes the entire transaction once. |
| `fromDate`, `toDate` | Optional inclusive lower and upper bounds on the stored transaction date, in `YYYY-MM-DD` format. Either bound may be used alone. Equal bounds match one day. There is no implicit range or timezone conversion. |
| `form` | Optional `PAYMENT_CHARGE` or `RECEIVE_MONEY`. |
| `accountId` | Match the selected Account or any allocation Account by ID. A foreign or unknown Account ID yields an empty result. Different Accounts with the same name remain independently selectable. |

Combine supplied filters with AND. The fields within a text or Account match use OR. Sort by transaction date descending, creation timestamp descending, then ID descending for exact ties. Omitted input or an empty filter object retains the existing all-time history and output shape. The returned rows keep all their allocation lines. All-time balance and summary calculations use the complete ledger.

### UI, API and data specifications

| Layer | Behavior |
| --- | --- |
| UI | Put labeled Search, From, To, Form and Account controls in the history section with Apply and Clear actions. Keep applied filters distinct from edits. Show loading, no matches, and a readable validation or request error while preserving input. Clear resets to full history. Show duplicate Account names with their existing distinguishing labels. Refresh active history after a successful posting. |
| API | Add an optional typed input to `finance.transactions.history` with the five fields above. Preserve calls without input and the current response. Validate dates with the existing calendar parser. A reversed range, malformed date, unknown form or empty Account ID returns `BAD_REQUEST`. UI omits empty controls. |
| Authorization | Derive owner ID from the authenticated User. Apply the owner predicate to the outer transaction query before optional relation matches. Relationships already join to same-owner Accounts. A guest receives `UNAUTHORIZED`; an Administrator receives `FORBIDDEN` for unfiltered and filtered requests alike. |
| Persistence and client state | Use the current PostgreSQL/Prisma models and indexes. No migration, seed change or write is planned. Scope client history query keys to the current User and filter input. Keep the full ledger history available to existing posting prerequisites such as one-time opening balance eligibility. Filtering the visible list must not make a previously used Account eligible for an opening balance. |

### Acceptance criteria

- **AC-F11-01** Applied search and filters return the User's persisted matches with the agreed inclusive date boundaries and deterministic order. Users can apply and clear filters in the dashboard.
- **AC-F11-02** Empty and invalid filters behave as specified. Anonymous, cross-owner and Administrator calls preserve the existing backend privacy boundary, and filtered history leaves summaries and opening balance eligibility intact.

## Software Test Specification

Use synthetic Users with distinct ownership, a synthetic Administrator and real isolated PostgreSQL. Seed or post transactions with explicit stored calendar dates and controlled creation timestamps where required.

| Test ID | AC | Level and input | Expected result |
| --- | --- | --- | --- |
| F11-STS-01 | AC-F11-01 | API/database: use no input, an empty object, whitespace search, and transactions with tied dates and timestamps. | All owned records, original response shape, deterministic order and no filter-induced omission. |
| F11-STS-02 | AC-F11-01 | API/database: include rows immediately before, on, between and after the range bounds. Test one-sided and equal bounds on a leap date. | Exact inclusive dates, no timezone shift, and oldest/newest boundaries as specified. |
| F11-STS-03 | AC-F11-01 | API/database: search case variants in descriptions and current names in both Account roles. Include literal percent, underscore and backslash, renames, duplicate names and a mixed transaction whose multiple lines match. | Correct literal matches and each transaction once with its complete allocations. An Account filter uses the selected ID, even when another name is identical. |
| F11-STS-04 | AC-F11-01, AC-F11-02 | API/database: combine form, Account, text and date conditions. Include a valid filter with no matches. | Only records satisfying all filters are returned. A valid no-match request returns an empty array. |
| F11-STS-05 | AC-F11-02 | API/database: use reversed ranges, invalid calendar dates, timestamp inputs, empty Account ID and unknown form. | `BAD_REQUEST`; no write or disclosure. The original history and summary remain intact. |
| F11-STS-06 | AC-F11-02 | API/database: use a second User with overlapping names and dates. Search foreign-only terms and filter by foreign or unknown Account ID. Call filtered history as anonymous and Administrator. | No foreign transactions, counterpart data or Account existence disclosure. The API refuses both unauthorized roles. |
| F11-STS-07 | AC-F11-01, AC-F11-02 | UI/acceptance: apply filters, verify matching rows and the no-results state, correct a bad range and clear. Hide an existing posting while browsing. | History controls operate by keyboard, show recoverable feedback, and leave summary totals and opening balance eligibility intact. |
| F11-STS-08 | AC-F11-01, AC-F11-02 | Regression: post a valid mixed transaction that satisfies an active filter. Rerun Sprint 1, FEAT-09 and FEAT-10 checks. | The active result refreshes with the saved transaction. Existing finance flows and access rules still hold. |

### Execution evidence

| Revision | Command | Observed result |
| --- | --- | --- |
| `3aa2378` | `bun test packages/api/src/routers/finance.test.ts -t F11-STS-03` with disposable PostgreSQL 17 `DATABASE_URL` and `NODE_ENV=test` | RED: 1 failed, 25 filtered. The original API returned all five owned transactions instead of the single literal match. |
| `a7a67d6` | `bun run test` with the same PostgreSQL database and environment | GREEN: 85 passed, 0 failed, 0 skipped. Web 21, API 40, server 22, database 2. Local Bun 1.3.9. |
| `a7a67d6` | `bun run check-types`, `bun run build`, targeted Biome and `git diff origin/staging-2...HEAD --check` | Passed. Type check finished 6 tasks and build finished 2 tasks. |

- **AC-F11-01:** F11-STS-01–04 and the persisted read in F11-STS-08 passed in [finance.test.ts](../../packages/api/src/routers/finance.test.ts). F11-STS-07/08 in [finance-dashboard.test.tsx](../../apps/web/src/components/finance-dashboard.test.tsx) exercise applying and clearing controls, querying with the applied input and refreshing that query after a post. The dashboard integration test uses a synthetic tRPC transport. Live keyboard/browser acceptance and staging integration remain open.
- **AC-F11-02:** F11-STS-04–06 verify the database matching, empty result, rejected inputs and role/owner boundaries. F11-STS-07/08 verify recovery, continued exclusion of used Accounts from opening balance and preserved overview inputs. The full regression suite includes Sprint 1, FEAT-09 and FEAT-10.

## Definition of Done and evidence

- Record teammate decisions on the proposed search, Account matching, and calendar range behavior.
- Commit behavioral RED evidence before implementation. Record the passing changes and relevant regression commands, outcomes and tested versions, and map both AC to actual files and tests.
- Verify the live history workflow with synthetic data, coordinate reviewed staging integration and CI, and record release evidence and any remaining gaps.
