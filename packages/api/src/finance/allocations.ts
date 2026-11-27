export const allocationRules = {
  EXPENSE: { form: "PAYMENT_CHARGE", accountType: "EXPENSE", label: "Expense" },
  LOAN_TAKEN_REPAYMENT: {
    form: "PAYMENT_CHARGE",
    accountType: "LOAN_TAKEN",
    label: "Repay loan or card",
  },
  LOAN_GIVEN_LENDING: {
    form: "PAYMENT_CHARGE",
    accountType: "LOAN_GIVEN",
    label: "Lend money",
  },
  TRANSFER_TO_CASH: {
    form: "PAYMENT_CHARGE",
    accountType: "CASH",
    label: "Transfer to Cash",
  },
  INCOME: { form: "RECEIVE_MONEY", accountType: "INCOME", label: "Income" },
  LOAN_GIVEN_REPAYMENT: {
    form: "RECEIVE_MONEY",
    accountType: "LOAN_GIVEN",
    label: "Receive loan repayment",
  },
  LOAN_TAKEN_BORROWING: {
    form: "RECEIVE_MONEY",
    accountType: "LOAN_TAKEN",
    label: "Borrow money",
  },
  TRANSFER_FROM_CASH: {
    form: "RECEIVE_MONEY",
    accountType: "CASH",
    label: "Transfer from Cash",
  },
} as const;

export type AllocationKind = keyof typeof allocationRules;
export const allocationKinds = Object.keys(allocationRules) as AllocationKind[];

export function hasRepeatedExpenseAccount(
  allocations: { kind: AllocationKind; accountId: string }[],
) {
  const seen = new Set<string>();
  for (const { kind, accountId } of allocations) {
    if (kind !== "EXPENSE" || !accountId) continue;
    if (seen.has(accountId)) return true;
    seen.add(accountId);
  }
  return false;
}
