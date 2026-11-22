# Lab 6 Part A: Sprint 1 UAT cases and handoff

**Status:** Draft. Cases are prepared, but the handoff is not ready until a second synthetic User, an Administrator account, and a clean test account are provisioned on the deployed release. Do not share credentials in this file.

**Issue:** [#52 — Lab 6 Part A](https://github.com/CPE334-Pockit/Pockit/issues/52), under [Lab 6 #51](https://github.com/CPE334-Pockit/Pockit/issues/51)

## Release and test scope

| Item | Value |
| --- | --- |
| Repository | [CPE334-Pockit/Pockit](https://github.com/CPE334-Pockit/Pockit) |
| Sprint 1 baseline | Tag [`sprint1-v1.0.0`](https://github.com/CPE334-Pockit/Pockit/releases/tag/sprint1-v1.0.0), commit `e99da77c8181a97a32abfddc37b116ff297acf27` |
| Deployed version used for this handoff | `main` commit `b315c99b7e68ec4061bd131aff016bb19ed6c899`; deployment [run 44995350059](https://github.com/CPE334-Pockit/Pockit/actions/runs/44995350059) succeeded |
| Deployed revision | `s4b043a2c-00005-qd5`, serving 100% of traffic per the [Lab 5 deployment record](../lab-05/deployment.md) |
| UAT URL | [https://s4b043a2c-4d7hbszvwq-as.a.run.app](https://s4b043a2c-4d7hbszvwq-as.a.run.app) |
| Accepted-for-test scope | Implemented Sprint 1 only: login/logout; opening Cash balance; salary receipt; split credit-card purchase; repayment; balances, income/expense totals, categories and history; User ownership and Administrator finance denial. See the [Sprint 1 feature contract](../../features/sprint1-feature-contracts.md) and [test specification](../../testing/sprint1-software-test-specification.md). |
| Product Team | Pockit: Polwarit Watthanahemmarat (67070501067) and Guntee Doungmanee (67070501003). |
| UAT Team | **TBD.** Record partner team and both testers before execution. |

The deployed commit is newer than the Sprint 1 tag because it includes Lab 5 deployment work. The Lab 5 deployment record identifies no change to the accepted Sprint 1 product scope. UAT results apply only to the deployed commit and revision in the table above, and only to Sprint 1 behavior.

## Accounts, data and safety

| Label | Role | Use/status |
| --- | --- | --- |
| Pockit Course User | User | Existing public synthetic account. Its password is provided privately by the Product Team. Financial data may already exist, so each case records a fresh before-state and checks changes as deltas. |
| UAT User B | User | Required to verify cross-User isolation. Not currently provisioned on the public course deployment. |
| Pockit Administrator | Administrator | Required to verify forbidden finance access. Not currently provisioned on the public course deployment. |
| Fresh UAT User | User | Required for the one-time opening-balance case. Must have no prior activity and owned Main bank, Credit card, Salary, Dining and Groceries accounts. Not currently provisioned on the public course deployment. |

The deployed bootstrap currently provisions only one User with Main bank (Cash), Credit card (Loan Taken), Salary (Income), Dining and Groceries (Expense). The application has no public self-registration or account-creation workflow. Local seed identities are not available on the public service. Therefore, the cross-User, Administrator and fresh-opening-balance cases are **blocked until safe synthetic accounts are provisioned**. Do not claim these cases passed or send the UAT Team a handoff as complete before resolving this.

Use only synthetic data. Do not reset or delete the shared course database. Do not reuse an account with prior activity for the opening-balance case. Give passwords to the named testers through a private channel; never put them in this document, Issues, PRs, screenshots or Git. Since there is no safe production reset, cases that add financial records use unique descriptions beginning `LAB6-UAT-<date>-<case-id>`. Capture account balances, category totals and history immediately before each write and verify the expected delta afterward. Product Team must approve the scheduled window and confirm the test User is available before the partner writes to the shared synthetic account.

## Execution rules

1. Confirm the deployed commit, revision and URL still match the release table before testing. If they changed, record the new version and obtain Product Team confirmation that Sprint 1 scope is unchanged.
2. Record tester names, team, date/time, exact version, inputs, actual outcome, PASS/FAIL/BLOCKED and evidence IDs for every case. Never copy an expected result into the actual result.
3. Use cases UAT-PKT-01 through UAT-PKT-03 independently. UAT-PKT-04 follows UAT-PKT-01 and checks that its writes remain persisted. UAT-PKT-05 requires the separate Fresh UAT User.
4. Use the deployed UI for user-visible workflows. The access case uses read-only tRPC queries in the same-origin browser session to try known synthetic IDs directly; do not expose session cookies or submit a finance mutation as another User or Administrator.
5. Do not create, alter, or delete GCP resources or production records beyond the synthetic actions listed here. Report blocked account provisioning to the Product Team and instructor/TA; do not substitute the Product Team's own tests for independent UAT.

## UAT-PKT-01: Salary, split card purchase and repayment

**Category:** Normal finance journey. **Sequence:** Independent.
**References:** FR-06–FR-10; F5-AC-01–05, F6-AC-01–05, F7-AC-01–03; STS-RECEIVE-01, STS-CARD-01, STS-CARD-03, STS-CARD-05, STS-VIEW-01–03.

- **Purpose:** Verify that a User can record the implemented receipt, split card purchase and repayment, and that balances and totals change by the correct amounts.
- **Role:** Pockit Course User (User).
- **Preconditions:** The tester can log in. Main bank, Credit card, Salary, Dining and Groceries are visible. No one else is writing to this account during the test. Capture the current Cash balance `B0`, card debt `D0`, Income total `I0`, Expense total `E0`, Dining total `N0`, Groceries total `G0`, and history. All inputs are THB.
- **Inputs:** Salary `1,500.00`; card purchase `100.00`, Dining `65.00`, Groceries `35.00`; repayment `40.00`; explicit date `2026-11-22` (or record the actual selected `YYYY-MM-DD`); unique descriptions `LAB6-UAT-<date>-01-salary`, `...-01-purchase`, and `...-01-repayment`.
- **Actions:**
  1. Sign in as the User and open `/dashboard`.
  2. Select **Income received**. Set **Received into** to Main bank, **Income category** to Salary, **Amount received** to THB 1,500.00, and enter the specified date and unique description. Select **Record income**.
  3. Select **Card purchase**. Set **Charged to** to Credit card and **Purchase total** to THB 100.00. Set the two Expense categories to Dining and Groceries with THB 65.00 and THB 35.00. Enter the date and unique description, then select **Record card purchase**.
  4. Select **Repay card**. Set **Pay from** to Main bank, **Repay card** to Credit card, and **Payment amount** to THB 40.00. Enter the date and select **Record repayment**.
  5. Reload the dashboard and inspect account balances, summary, category totals and transaction history.
- **Expected results:** All three transactions are accepted and appear in history with the chosen date and allocations. Cash becomes `B0 + 1,460.00`; card debt becomes `D0 + 60.00`; Income becomes `I0 + 1,500.00`; Expense becomes `E0 + 100.00`; Dining becomes `N0 + 65.00`; Groceries becomes `G0 + 35.00`. Repayment changes neither Income nor Expense. No result is rounded or counted twice.

## UAT-PKT-02: Reject a split purchase with an allocation mismatch

**Category:** Business-rule/boundary. **Sequence:** Independent.
**References:** BR-04, BR-07; F6-AC-01, F6-AC-04, F8-AC-02; STS-CARD-02, STS-INT-01.

- **Purpose:** Verify that allocation lines must add up to the transaction total and an invalid purchase has no financial effect.
- **Role:** Pockit Course User (User).
- **Preconditions:** Signed in; the three named accounts are available. Capture card debt, Dining and Groceries totals, and transaction history before the attempt.
- **Inputs:** Credit card total THB 100.00, Dining THB 65.00, Groceries THB 34.00, explicit date, unique description `LAB6-UAT-<date>-02-mismatch`.
- **Actions:**
  1. Select **Card purchase** and set **Charged to** to Credit card.
  2. Enter **Purchase total** THB 100.00. Set the two Expense categories to Dining and Groceries with allocated amounts THB 65.00 and THB 34.00. Enter an explicit date and the unique description.
  3. Observe the allocation validation. If **Record card purchase** is still enabled, submit once and record the response.
  4. Reload the dashboard/history and compare with the before-state.
- **Expected results:** The UI shows allocated THB 99.00 of THB 100.00 and prevents submission, or the server rejects the request. No matching transaction appears. Card debt, category totals and history remain unchanged. No partial allocation or balance change is visible.

## UAT-PKT-03: Deny cross-User and Administrator finance reads

**Category:** Forbidden role/ownership. **Sequence:** Independent; requires UAT User B and Pockit Administrator.
**References:** FR-02, BR-08, BR-11; F2-AC-01–05, F7-AC-03, F8-AC-03; STS-AUTHZ-03, STS-AUTHZ-07, STS-AUTHZ-08, STS-VIEW-04.

- **Purpose:** Verify that one User cannot read another User's financial records and an Administrator cannot read any financial data.
- **Roles:** Pockit Course User (User), UAT User B (User), Pockit Administrator (Administrator).
- **Preconditions:** The Product Team privately provides valid synthetic credentials and the account ID of UAT User B's Main bank. Confirm both Users have financial data and the Administrator account is active. Before testing, capture User A's and User B's account lists, balances, summary totals and history IDs while signed in as each owner. No password or session token is included in evidence.
- **Read-only request method:** While logged into the deployed app, use the browser's same-origin DevTools console. For a direct account lookup, run the following with User B's supplied synthetic account ID:

  ```js
  const input = encodeURIComponent(JSON.stringify({ "0": { json: { accountId: "<User B Main bank ID>" } } }));
  const response = await fetch(`/trpc/finance.accounts.get?batch=1&input=${input}`, { credentials: "include" });
  console.log(response.status, await response.json());
  ```

  For a no-input read, use this helper and pass one of `finance.accounts.list`, `finance.summary.get`, `finance.transactions.history`, or `admin.users.list`:

  ```js
  async function readProcedure(name) {
    const input = encodeURIComponent(JSON.stringify({ "0": { json: null } }));
    const response = await fetch(`/trpc/${name}?batch=1&input=${input}`, { credentials: "include" });
    return { status: response.status, body: await response.json() };
  }
  await readProcedure("finance.accounts.list");
  ```

  Do not copy cookies or tokens from DevTools.
- **Actions:**
  1. Sign in as the Course User and confirm the account list contains only that User's accounts. Record User A's account balances, summary totals and history IDs for comparison.
  2. Run the direct `finance.accounts.get` query for UAT User B's Main bank ID.
  3. As User A, re-read the account list, balances, summary and history; compare them with User A's pre-test snapshot. Sign out.
  4. Sign in as the Administrator. Run no-input reads for `finance.accounts.list`, `finance.summary.get` and `finance.transactions.history`, and run the direct account lookup for a known account ID.
  5. Inspect each response. Call `admin.users.list` and confirm it contains identity/access fields only. Sign out.
  6. Sign in as UAT User B and compare the account list, balances, summary totals and history IDs with User B's pre-test snapshot.
- **Expected results:** User A's account list excludes User B. The direct foreign-account lookup is denied without revealing whether the account exists or returning financial data. The response status and error shape may vary; do not require a specific `NOT_FOUND` or `FORBIDDEN` response. Administrator finance queries are denied without returning account, transaction, balance, category or summary content. The Administrator User list contains no finance fields. User A's and User B's post-test snapshots match their pre-test snapshots; the attempts cause no financial state changes.

**Blocker:** This case is designed but not executable on the current deployed account set. Do not check AC-L6-A-03 until both identities and their synthetic records are provisioned on the tested release and this case is independently run.

## UAT-PKT-04: Confirm persisted history after a new session

**Category:** State/history/persistence. **Sequence:** Run immediately after UAT-PKT-01 using that case's unique descriptions and recorded post-state.
**References:** FR-09, FR-10; F5-AC-02, F6-AC-03, F7-AC-01–04; STS-RECEIVE-06, STS-CARD-05, STS-VIEW-03, STS-VIEW-05.

- **Purpose:** Verify that accepted transactions and calculated balances remain after leaving the authenticated session and returning through the deployed application.
- **Role:** Pockit Course User (User).
- **Preconditions:** UAT-PKT-01 passed. Record its exact post-state and the three unique transaction descriptions.
- **Actions:**
  1. Sign out.
  2. Sign in again as the same User in a fresh browser page or session.
  3. Reload the dashboard and history.
  4. Find the three UAT-PKT-01 descriptions and compare balances, summary and category totals with the recorded post-state.
- **Expected results:** All three transactions and their allocations remain in history. Cash, card debt, Income, Expense, Dining and Groceries match UAT-PKT-01's post-state exactly. The same records are not duplicated by reload or sign-in.

## UAT-PKT-05: Record an opening balance on an unused Cash account

**Category:** Business-rule/boundary and starting position. **Sequence:** Independent; requires a Fresh UAT User with no financial activity.
**References:** FR-05; F4-AC-01–05, F7-AC-01–02; STS-OPEN-01, STS-OPEN-02, STS-OPEN-06.

- **Purpose:** Verify that the owner can record a one-time opening Cash balance and that it is not counted as Income or Expense.
- **Role:** Fresh UAT User (User).
- **Preconditions:** Fresh UAT User is provisioned on the tested release, has a Main bank Cash account with no opening balance or financial activity, and can log in. Capture balances, totals and history.
- **Inputs:** Opening balance THB 1,000.00.
- **Actions:**
  1. Sign in as Fresh UAT User and open `/dashboard`.
  2. Select **Starting balance**, choose Main bank, enter THB 1,000.00, and select **Save opening balance**.
  3. Reload the account and summary views and inspect history.
  4. Select **Starting balance** again and try to record a second opening balance of THB 2,000.00 on Main bank. If the completed state hides the form, record that the UI prevents a second submission. If the form remains available, submit once and record the rejection.
  5. Reload the account and summary views again and compare them with the post-opening-balance state from step 3.
- **Expected results:** Main bank Cash balance and opening balance equal THB 1,000.00. Income, Expense, category totals and transaction history are unchanged. The UI shows the opening balance is already recorded and does not offer a second submission, or the server rejects the second attempt. The opening balance and all financial totals remain unchanged after step 4.

**Blocker:** The existing public Main bank has already recorded financial activity, so it cannot safely serve as a fresh opening-balance account. Do not reset it. This case remains blocked until the Fresh UAT User/account is provisioned.

## Execution record

Leave these fields blank until the partner executes the cases. A design document is not execution evidence.

| Case | Tester/team | Date/time | Tested version | Actual result and evidence IDs | Result |
| --- | --- | --- | --- | --- | --- |
| UAT-PKT-01 | TBD | TBD | TBD | TBD | Not run |
| UAT-PKT-02 | TBD | TBD | TBD | TBD | Not run |
| UAT-PKT-03 | TBD | TBD | TBD | TBD | Blocked: User B and Administrator not provisioned |
| UAT-PKT-04 | TBD | TBD | TBD | TBD | Not run; depends on UAT-PKT-01 |
| UAT-PKT-05 | TBD | TBD | TBD | TBD | Blocked: fresh User/account not provisioned |

## Part A completion checklist

- [x] Five cases have stable IDs, Sprint 1 requirement/AC references, roles, preconditions, synthetic inputs, numbered actions and specific expected results.
- [x] Cases cover the required normal journey, rule rejection, forbidden access, and persistence/history categories.
- [x] Expected financial deltas and the clean-fixture expected values are calculated explicitly.
- [x] Release, deployed revision, URL, scope, account labels, dependencies and safe handling instructions are recorded.
- [ ] Provision UAT User B, Administrator and Fresh UAT User/accounts on a safe tested deployment; privately share credentials.
- [ ] Confirm the partner UAT Team and both tester names.
- [ ] Both students review this handoff; record specific review feedback.
- [ ] Confirm account provisioning and instructions with the UAT Team, then update the execution record from actual observations.

**Part A is not complete or ready for partner execution** until the unchecked setup/review items above are resolved. No password, private account detail, production secret or real financial data is included here.
