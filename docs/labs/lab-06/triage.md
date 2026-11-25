# Lab 6 Part C: Findings and triage

[Issue #54](https://github.com/CPE334-Pockit/Pockit/issues/54) · [Pockit handoff](uat-cases.md) · [Outgoing Pocket Ledger results](peer-uat/evidence/run.md)

Natthawat Primsirikunawut (Team 2-Nor) independently tested Pockit on commit `b315c99b7e68ec4061bd131aff016bb19ed6c899`, Cloud Run revision `s4b043a2c-00005-qd5`. The partner's Lab 6 PDF records five passes, no failures or blocked cases, and an **Accepted** decision on 24 November 2026 for that release.

## Incoming findings on Pockit

| Finding | Case and setup | Expected and observed | Disposition |
| --- | --- | --- | --- |
| #54 / C-01 | UAT-PKT-01. In the signed-in finance journey, open Repay card and follow the repayment instructions. See the partner PDF Part C and run `2026-11-23T15-24-01`. | The handoff asks for a unique repayment description. The form has no Description field and saves the label `Credit-card repayment`. | Not a product defect. The repayment requirement does not require a custom description. Documentation only; Pockit team to correct the instructions. |
| #54 / C-02 | UAT-PKT-03. As a synthetic User, follow the handoff's direct ownership read check. See partner PDF Part C, run `2026-11-23T16-44-44`, step UAT-PKT-03-A2. | The expected result is denial without disclosure. The documented input returned HTTP 400 `invalid_type`; with the corrected input the partner observed HTTP 404. | Not a product defect. The malformed example did not reach the ownership check; corrected input produced the expected denial. Documentation only; Pockit team to correct the example. |

Neither finding affected the partner's acceptance. No product defect has been accepted for a fix. Do not claim a fix deployment or retest. The controlled exercise remains a separate decision for [Part D #55](https://github.com/CPE334-Pockit/Pockit/issues/55).

## Outgoing findings on Pocket Ledger

Guntee Doungmanee tested Pocket Ledger commit `37593da1cb3cd881e6b22845a2b4a929dbf6bc8e`. The [results shared with the partner](https://github.com/CPE334-Pockit/Pockit/issues/53#issuecomment-7137086709) identify no confirmed product defect. Skipped UAT-04/05 write checks and evidence gaps are limitations, not passes or defects. See [the case results](peer-uat/evidence/run.md#case-results) for the evidence and the UAT-07B restart check.
