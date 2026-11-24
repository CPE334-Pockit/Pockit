# Pocket Ledger UAT — in progress

Deployment commit matched handoff: 37593da1cb3cd881e6b22845a2b4a929dbf6bc8e.

UAT-08 partial: Alice 1 reached Overview as User. Evidence: EV-UAT08-01.png and EV-UAT08-02.png. Other identity checks not run.

UAT-01 baseline only: five accounts at THB 0.00; opening-balance form available. No financial changes submitted. No case passes or acceptance recorded.

UAT-01 partial: D=2026-11-22. Opening balance THB 10,000.00 saved (EV-UAT01-02.png). Salary THB 20,000.00 saved; app reported a fresh history read. Receipt screenshot capture timed out. Split charge and repayment not yet run. Preserve A1 state; resume at step 5, do not repeat writes.

UAT-01 continued: verified salary Overview (Bank 30000, Income 20000); saved card charge 1200 split Dining 700 / Groceries 500, then Bank repayment 500. Final Overview: Bank 29500, card 700, Income 20000, Expense 1200, three dated history entries. Detailed history checks and remaining cases not run. Do not repeat writes.

Verified screenshots: EV-UAT01-07 final Overview; EV-UAT01-08 history list; EV-UAT01-08-{repayment,charge,salary} each transaction detail. All three details matched handoff amounts, accounts and date. Earlier timed-out intermediate frames were not reconstructed. No other case result claimed.

UAT-02 receipt rejection observed: THB 100.00 total / 99.00 salary allocation; app replied “Allocations must add up exactly to the total.” Payment rejection and state comparison pending.

UAT-02 payment: credit card THB 1200.00 with Dining 700.00 and Groceries 400.00, dated 2026-11-22. Displayed allocated 1100.00 of 1200.00 and exact-total rejection. EV-UAT02-01.png saved. Final state comparison pending.

UAT-02 final state: verified both mismatch rejections and final Overview equals UAT-01 baseline (Bank 29500, card 700, Salary and Income 20000, Dining 700, Groceries 500, Expense 1200, three unchanged history entries). Evidence: EV-UAT02-01.png, EV-UAT02-03.png, EV-UAT02-final-overview.png. No immediate separate state capture between the two rejects. UAT-07B BLOCKED: no confirmed product-team restart.

UAT-03 step 1: 700.01 card overpayment rejected; EV-UAT03-01.png. Remaining boundaries pending.

UAT-03 step 2: Bank overdraft of THB 29500.01 dated 2026-11-22 rejected as negative balance (EV-UAT03-02.png). Step 1 used form default date 2026-11-23, not fixture date D; record as deviation.

UAT-03 step 6 interrupted: tester screenshot EV-UAT03-06-interrupted.png shows “Sign in to continue” and amount fields with a leading “-- ”. This attempt did not verify the maximum-amount rule. Retest signed in with exactly 1000000000.01 in both fields.

UAT-03 steps 5–6 retested signed in: exact inputs -5.00 and 1000000000.01 in both fields rejected with form validation. EV-UAT03-05-retest.png and EV-UAT03-06-retest.png verified.

Removed two interrupted screenshots showing “Sign in to continue”; signed-in retest screenshots for steps 5–6 replace them.

UAT-03 final: payment date 2026-11-24 exceeds browser max 2026-11-23; receipt rejected with “The date cannot be later than today.” EV-UAT03-08-payment.png and EV-UAT03-08-receipt.png. Final Overview (EV-UAT03-final.png) matches baseline: Bank 29500, card 700, Income 20000, Expense 1200, three unchanged history entries. Earlier step-1 date deviation and missing per-attempt history snapshots remain limitations.

UAT-07A: signed out, closed browser, opened a fresh browser and signed in as A1. Before/after transaction responses matched byte-for-byte; Overview confirmed expected balances. Evidence: UAT07A-before.json, UAT07A-after.json, EV-UAT07A-overview.png.

UAT-07A: all three fresh-session history detail screenshots saved (EV-UAT07A-detail-0 through -2).

UAT-10 partial: B1 Overview and Transaction history show expected empty messages (EV-UAT10-empty-overview.png and EV-UAT10-empty-history.png). Payment form had no page-level horizontal overflow at 390, 768, 1280 px; 390px evidence EV-UAT10-payment-390.png. Keyboard and remaining page checks pending.

UAT-05 UI: Admin 1 Overview showed Administrator role and Manage users, without financial balances, totals, or history. EV-UAT05-admin-overview.png. Direct checks not run.

UAT-06: Alice 2 enabled initially; Admin 1 disabled only Alice 2; Disabled persisted on reload and sign-in returned Invalid email or password. Re-enabled Alice 2, confirmed Enabled after reload and successful sign-in. Four EV-UAT06 screenshots saved.

UAT-09: Alice 2 started at zero with empty history. Browser double-click on Save receipt for THB 100.00 dated 2026-11-22. Overview shows Bank and Income 100.00, and history has exactly one row. EV-UAT09-overview.png and EV-UAT09-history.png.

UAT-10: sign-in controls focused in order Email → Password → Sign in with focus-visible true; Tab/Enter sign-in succeeded as S1 (password inserted into focused field via automation). Full-page result screenshot visually verified. All six pages had no measured horizontal page overflow at 390/768/1280; clipping/overlap not visually audited for every page/width. B1 empty-state checks captured earlier.

UAT-08: sign-out + Back showed sign-in, direct /overview redirected to /login, known synthetic account with wrong password and unknown formatted email both returned Invalid email or password. EV-UAT08-invalid-login.png shows the unknown-email result. Anonymous accounts, transactions and summary returned 401. Successful sign-in was observed earlier.

UAT-08 evidence supplement: visually verified EV-UAT08-wrong-password.png and EV-UAT08-anonymous-{accounts,transactions,summary}.png. “Sign in to continue” is expected for these three anonymous endpoint responses, unlike the interrupted signed-in UAT-03 attempts.

UAT-05 direct read checks: after fresh Admin 1 sign-in, accounts, transactions and summary endpoints each returned FORBIDDEN, no finance data. EV-UAT05-admin-{accounts,transactions,summary}.png. This does not establish the full role-boundary case.

UAT-10 final visual review: sign-in at 390/768/1280 and payment at 768/1280 captured full-page and visually reviewed. No clipping or overlap observed. Earlier 390px Overview evidence is EV-UAT04-B1-overview.png.

## Final evidence audit (not an acceptance decision)

- UAT-01: finance journey and three details observed; original intermediate screenshots missing.
- UAT-02: both mismatches rejected and final state unchanged; no snapshot between attempts.
- UAT-03: boundary rejections and final state recorded; per-attempt snapshots incomplete, first date deviated.
- UAT-04: UI isolation observed; direct cross-user checks incomplete.
- UAT-05: Administrator UI/read denials observed; remaining role-boundary checks incomplete.
- UAT-06: pass; spare user re-enabled and sign-in verified.
- UAT-07A: pass; identical transaction responses across fresh sessions and full-page detail images.
- UAT-07B: blocked; no partner-confirmed restart.
- UAT-08: sign-in, rejection, signed-out redirect and anonymous 401 checks recorded.
- UAT-09: pass; one receipt after double-click.
- UAT-10: layout, sign-in focus/navigation and empty history observed.

UAT-04 direct read: B1 requested one A1 synthetic transaction detail and received HTTP 404 NOT_FOUND. No transaction fields observed in the recorded result. UAT-05 same check returned 401 with expired Admin session; not role-denial evidence.

UAT-05 Admin transaction detail: after re-login, direct read returned 403 FORBIDDEN; see UAT05-admin-detail.json and EV-UAT05-admin-detail.png.

UAT-04/05 post-read evidence: A1 transaction response byte-identical to UAT07A-after.json; bank 29,500 and card debt 700. No write-denial claim.

UAT-05 regular-User denial repeated on prescribed A1: Manage Users page denied access and API returned 403 FORBIDDEN. EV-UAT05-A1-admin-ui.png; UAT05-A1-admin-api.json.

Supporting evidence (not independent live UAT): Pocket Ledger CI run 44885832238 passed on deployed SHA 37593da1cb3cd881e6b22845a2b4a929dbf6bc8e. CI logs explicitly passed TEST-21 cross-user write denial/no write and TEST-08 Administrator transaction detail/create denial. This does not verify the outstanding opening-balance attempts or replace live UAT-04/05.

UAT-07B: operator reported restart complete. Post-restart health on 37593da1cb3cd881e6b22845a2b4a929dbf6bc8e, database ok. A1 transaction JSON byte-identical to prior baseline; Bank 29500, card debt 700, income 20000, expense 1200. EV-UAT07B-overview.png and UAT07B-after.json. Restart revision/time not independently verified. UAT-04/05 write portions skipped at operator direction, not passed.
