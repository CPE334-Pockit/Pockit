# FEAT-13 Transaction favorites and duplication

- Issue [#89](https://github.com/CPE334-Pockit/Pockit/issues/89), Sprint 3 [#83](https://github.com/CPE334-Pockit/Pockit/issues/83)
- Branch `feature/transaction-favorites` from `staging-3` at `8130fd0`. PR target `staging-3`.
- Review status: proposed feature contract. [FR-11, FR-12, BR-09, NFR-02 and NFR-06](../requirements/srs.md) define the baseline. [FEAT-11](feat-11-history-filters.md) supplies owner-scoped active history and [FEAT-12](feat-12-transaction-correction.md) defines active and corrected Transactions.

## Feature-Level SDS

An authenticated User can mark or unmark an active owned Transaction and view their favorites. Saving the same favorite state again succeeds without creating a duplicate record. Favoriting never changes amounts, Account balances, summaries or ledger history.

From an active history entry or a Favorite, a User can copy the source details into the matching payment or receipt form. Prepopulate the primary Account, total, date, description and each allocation. The User may edit the draft or cancel. Opening and cancelling the draft leave persisted data unchanged. Saving uses the existing posting procedure and creates a distinct active Transaction with a new ID. Its balances and totals reflect the entered values. The source, its allocations and its favorite state remain intact. A new post starts without a favorite marker. Current posting validation applies to the draft, including funds, allocation rules and Account ownership. Rejected saves keep the edited values available.

Favorites refer to the exact original record. After replacement or void, the corrected original remains in correction history and drops out of active favorites. A replacement starts unfavorited. The active-only rule and choice to copy the original date are behavior decisions for review on this contract.

### UI, API and data contract

| Layer | Behavior |
| --- | --- |
| History and favorites | Provide keyboard-accessible Favorite and Remove favorite controls with an accessible state. Show a Favorites view with an empty state. Use the existing date/creation/ID ordering. Each active owned entry can start an editable duplicate. History filters continue to work independently. |
| Duplicate editor | Reuse the normal movement form and the same transaction-to-input mapping used to prefill corrections where practical. Label the operation as a new Transaction, provide Cancel, and send user-entered data to `finance.transactions.create` only on Save. Refresh history, favorites and summaries as applicable after a successful request. |
| API | Add User-only `finance.transactions.setFavorite` with `{ transactionId, favorite }`, and `finance.transactions.favorites` returning the existing serialized Transaction data. Constrain active eligibility and ownership on the server. Return `NOT_FOUND` uniformly for missing, foreign or inactive IDs. Guests receive `UNAUTHORIZED` and Administrators receive `FORBIDDEN`. The list exposes only current active owned records and is also the source of favorite state for visible history entries. |
| Persistence | Add a versioned PostgreSQL migration for a favorite link keyed by `(transactionId, ownerId)` with an owner-scoped composite foreign key to the Transaction and an owner index. Existing Transactions start unfavorited. Use an idempotent upsert or delete and the existing serializable write boundary to check active eligibility with the write. The active predicate also applies on reads so a concurrent correction cannot leave an inactive favorite visible. Financial postings and audit records retain their current schema and invariants. |

## Acceptance and Software Test Specification

- **AC-F13-01** An authenticated User can mark, view and remove favorites for active owned Transactions. State survives reload. Role, ownership and correction rules apply and favorite changes leave the ledger unchanged.
- **AC-F13-02** An authenticated User can duplicate an active owned record into a separate editable draft. Saving posts a separately validated Transaction and leaves the source unchanged.

Use two synthetic Users, an Administrator and isolated PostgreSQL.

| Test ID | AC | Level and case | Expected result |
| --- | --- | --- | --- |
| F13-STS-01 | AC-F13-01 | API/database. Favorite an owned Transaction twice, read from a new caller, remove twice, and compare the balance and transaction counts. Repeat concurrent favorite requests. | One favorite link at most, persisted membership, idempotent removal, unchanged ledger. |
| F13-STS-02 | AC-F13-01 | API/database. Attempt to favorite missing and foreign IDs, and list or change favorites as a guest and Administrator. | No foreign disclosure or favorite changes. Expected `NOT_FOUND`, `UNAUTHORIZED` and `FORBIDDEN` responses. |
| F13-STS-03 | AC-F13-01 | API/database. Favorite two transactions, replace one and void the other, then inspect favorites and correction history. | Originals are absent from Favorites but present in the owner's audit. Replacement starts unfavorited and inactive IDs are rejected. |
| F13-STS-04 | AC-F13-02 | API/database. Post an edited copy with changed amount, date and allocations. Read back both records. Submit an invalid split or an overdrawn copy through the same create procedure. | Distinct ID, original fields and favorite untouched, exact effect from the saved copy, and zero writes for invalid input. |
| F13-STS-05 | AC-F13-01, AC-F13-02 | Web. Exercise Favorite/Remove favorite, empty state, opening both prefilled form types, editing, cancellation, and rejection. | UI represents persisted favorite state. Opening or cancelling sends no create request, and rejected input remains editable. |
| F13-STS-06 | AC-F13-01, AC-F13-02 | Integrated acceptance. Apply migrations and use the production build with synthetic records. Use the keyboard to favorite, reload, and post an edited duplicate. Reload and verify history and balances. | Favorite persists and both records, amounts and balances match the edited post. Earlier account, history and correction workflows pass regression. |

## Definition of Done

- Obtain teammate review of this contract and record any changed behavior decisions before implementation.
- Demonstrate targeted RED followed by passing tests on the same issue branch. Record commands, test IDs, results and commit SHAs, including migration, full regression, type check and build.
- Record observed acceptance evidence in #89, check only verified criteria, and link the teammate-reviewed staging integration and Sprint 3 release tracking.
