import type { AppRouter } from "@Pockit/api/routers/index";
import { describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { createTRPCClient, type TRPCLink } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { observable } from "@trpc/server/observable";

import { UserFinanceOverview } from "@/routes/_auth/dashboard";
import { TRPCProvider } from "@/utils/trpc";

import { FinanceDashboard, type HistoryFilters } from "./finance-dashboard";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Account = Outputs["finance"]["accounts"]["list"][number];
type Summary = Outputs["finance"]["summary"]["get"];
type Transaction = Outputs["finance"]["transactions"]["history"][number];

const accounts: Account[] = [
  {
    id: "cash-main",
    name: "Everyday bank",
    type: "CASH",
    currencyCode: "THB",
    openingBalance: null,
    balance: "0.00",
    categoryTotal: null,
  },
  {
    id: "card-main",
    name: "Travel card",
    type: "LOAN_TAKEN",
    currencyCode: "THB",
    openingBalance: null,
    balance: "0.00",
    categoryTotal: null,
  },
  {
    id: "income-salary",
    name: "Salary",
    type: "INCOME",
    currencyCode: "THB",
    openingBalance: null,
    balance: null,
    categoryTotal: "0.00",
  },
  {
    id: "expense-dining",
    name: "Dining",
    type: "EXPENSE",
    currencyCode: "THB",
    openingBalance: null,
    balance: null,
    categoryTotal: "0.00",
  },
  {
    id: "expense-groceries",
    name: "Groceries",
    type: "EXPENSE",
    currencyCode: "THB",
    openingBalance: null,
    balance: null,
    categoryTotal: "0.00",
  },
];

const summary: Summary = {
  incomeTotal: "0.00",
  expenseTotal: "0.00",
  balances: [
    {
      accountId: "cash-main",
      accountName: "Everyday bank",
      type: "CASH",
      balance: "0.00",
    },
    {
      accountId: "card-main",
      accountName: "Travel card",
      type: "LOAN_TAKEN",
      balance: "0.00",
    },
  ],
  categories: [
    {
      accountId: "income-salary",
      accountName: "Salary",
      type: "INCOME",
      total: "0.00",
    },
    {
      accountId: "expense-dining",
      accountName: "Dining",
      type: "EXPENSE",
      total: "0.00",
    },
    {
      accountId: "expense-groceries",
      accountName: "Groceries",
      type: "EXPENSE",
      total: "0.00",
    },
  ],
};

const noTransactions: Transaction[] = [];
const setOpeningBalance = mock(
  (_input: Inputs["finance"]["accounts"]["setOpeningBalance"]) =>
    Promise.resolve(),
);
const accountActions = {
  create: mock(async () => {}),
  rename: mock(async () => {}),
  delete: mock(async () => {}),
};
const createTransaction = mock(
  (_input: Inputs["finance"]["transactions"]["create"]) => Promise.resolve(),
);

function renderDashboard(displayedAccounts = accounts) {
  return render(
    <FinanceDashboard
      name="Demo User"
      accounts={displayedAccounts}
      transactions={noTransactions}
      summary={summary}
      accountActions={accountActions}
      onSetOpeningBalance={setOpeningBalance}
      onCreateTransaction={createTransaction}
    />,
  );
}

describe("finance dashboard", () => {
  it("renders persisted API-shaped balances, summaries, categories, and history", () => {
    const displayedAccounts = accounts.map((account) =>
      account.id === "cash-main"
        ? { ...account, openingBalance: "1000.00", balance: "2460.00" }
        : account.id === "card-main"
          ? { ...account, balance: "60.00" }
          : account,
    );
    const [cashBalance, cardBalance] = summary.balances;
    const [salaryCategory, diningCategory, groceryCategory] =
      summary.categories;
    if (
      !cashBalance ||
      !cardBalance ||
      !salaryCategory ||
      !diningCategory ||
      !groceryCategory
    ) {
      throw new Error("Expected the finance summary fixture");
    }
    const displayedSummary: Summary = {
      ...summary,
      incomeTotal: "1500.00",
      expenseTotal: "100.00",
      balances: [
        { ...cashBalance, balance: "2460.00" },
        { ...cardBalance, balance: "60.00" },
      ],
      categories: [
        { ...salaryCategory, total: "1500.00" },
        { ...diningCategory, total: "65.00" },
        { ...groceryCategory, total: "35.00" },
      ],
    };
    const displayedTransactions: Transaction[] = [
      {
        id: "salary-transaction",
        form: "RECEIVE_MONEY",
        totalAmount: "1500.00",
        transactionDate: "2026-11-01",
        sourceAccountId: "cash-main",
        description: "Salary",
        allocations: [
          {
            id: "salary-allocation",
            accountId: "income-salary",
            accountName: "Salary",
            kind: "INCOME",
            amount: "1500.00",
          },
        ],
      },
      {
        id: "purchase-transaction",
        form: "PAYMENT_CHARGE",
        totalAmount: "100.00",
        transactionDate: "2026-11-02",
        sourceAccountId: "card-main",
        description: "Card purchase",
        allocations: [
          {
            id: "dining-allocation",
            accountId: "expense-dining",
            accountName: "Dining",
            kind: "EXPENSE",
            amount: "65.00",
          },
          {
            id: "grocery-allocation",
            accountId: "expense-groceries",
            accountName: "Groceries",
            kind: "EXPENSE",
            amount: "35.00",
          },
        ],
      },
    ];
    const view = render(
      <FinanceDashboard
        name="Demo User"
        accounts={displayedAccounts}
        transactions={displayedTransactions}
        summary={displayedSummary}
        accountActions={accountActions}
        onSetOpeningBalance={setOpeningBalance}
        onCreateTransaction={createTransaction}
      />,
    );

    const overview = view.getByRole("region", { name: "Financial overview" });
    expect(overview.textContent).toContain("฿2460.00");
    expect(overview.textContent).toContain("฿60.00");
    expect(overview.textContent).toContain("฿1500.00");
    expect(overview.textContent).toContain("฿100.00");
    expect(view.getAllByText("Card purchase")).toHaveLength(2);
    expect(view.getByText(/Dining · Groceries/)).toBeTruthy();
    expect(view.getByText("2026-11-01 · Salary")).toBeTruthy();
  });

  it("records an explicit opening balance for the selected Cash account", async () => {
    setOpeningBalance.mockClear();
    const view = renderDashboard();
    fireEvent.input(view.getByLabelText("Opening balance"), {
      target: { value: "25000.50" },
    });
    fireEvent.click(
      view.getByRole("button", { name: /save opening balance/i }),
    );

    await waitFor(() => {
      expect(setOpeningBalance).toHaveBeenCalledWith({
        accountId: "cash-main",
        amount: "25000.50",
      });
    });
  });

  it("F09-STS-07 records an opening balance for an existing Loan Taken account", async () => {
    setOpeningBalance.mockClear();
    const view = renderDashboard();
    fireEvent.change(view.getByRole("combobox", { name: "Account" }), {
      target: { value: "card-main" },
    });
    fireEvent.input(view.getByLabelText("Opening balance"), {
      target: { value: "75.10" },
    });
    fireEvent.click(
      view.getByRole("button", { name: /save opening balance/i }),
    );
    await waitFor(() => {
      expect(setOpeningBalance).toHaveBeenCalledWith({
        accountId: "card-main",
        amount: "75.10",
      });
    });
  });

  it("submits a card purchase split over two Expense categories", async () => {
    createTransaction.mockClear();
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /card purchase/i }));
    fireEvent.input(view.getByLabelText("Purchase total"), {
      target: { value: "850.00" },
    });
    const [diningAllocation, groceryAllocation] =
      view.getAllByLabelText("Allocated amount");
    if (!diningAllocation || !groceryAllocation) {
      throw new Error("Expected two Expense allocation fields");
    }
    fireEvent.input(diningAllocation, { target: { value: "500.00" } });
    fireEvent.input(groceryAllocation, { target: { value: "350.00" } });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(
      view.getByRole("button", { name: /record card purchase/i }),
    );

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith({
        form: "PAYMENT_CHARGE",
        sourceAccountId: "card-main",
        totalAmount: "850.00",
        transactionDate: "2026-11-07",
        description: undefined,
        allocations: [
          { kind: "EXPENSE", accountId: "expense-dining", amount: "500.00" },
          { kind: "EXPENSE", accountId: "expense-groceries", amount: "350.00" },
        ],
      });
    });
  });

  it("records salary income into the selected Cash account", async () => {
    createTransaction.mockClear();
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /income received/i }));
    fireEvent.input(view.getByLabelText("Amount received"), {
      target: { value: "42000.00" },
    });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(view.getByRole("button", { name: "Record income" }));

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith({
        form: "RECEIVE_MONEY",
        sourceAccountId: "cash-main",
        totalAmount: "42000.00",
        transactionDate: "2026-11-07",
        description: "Salary",
        allocations: [
          { kind: "INCOME", accountId: "income-salary", amount: "42000.00" },
        ],
      });
    });
  });

  it("F09-STS-09 distinguishes two Cash accounts named Bank and posts to the selected account", async () => {
    createTransaction.mockClear();
    const firstBank: Account = {
      id: "bank-first",
      name: "Bank",
      type: "CASH",
      currencyCode: "THB",
      openingBalance: "100.00",
      balance: "100.00",
      categoryTotal: null,
    };
    const otherBank = { ...firstBank, id: "bank-second", balance: "250.00" };
    const view = renderDashboard([firstBank, otherBank, ...accounts]);
    fireEvent.click(view.getByRole("button", { name: /income received/i }));

    const picker = view.getByRole("combobox", { name: "Received into" });
    const firstOption = view.getByRole("option", {
      name: "Bank · ฿100.00 · bank-first",
    });
    const secondOption = view.getByRole("option", {
      name: "Bank · ฿250.00 · bank-second",
    });
    expect(firstOption.getAttribute("value")).toBe(firstBank.id);
    const selectedId = secondOption.getAttribute("value");
    expect(selectedId).toBe(otherBank.id);
    fireEvent.change(picker, { target: { value: selectedId } });
    fireEvent.input(view.getByLabelText("Amount received"), {
      target: { value: "15.00" },
    });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(view.getByRole("button", { name: "Record income" }));

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ sourceAccountId: otherBank.id }),
      );
    });
  });

  it("records a card repayment from Cash without an Expense allocation", async () => {
    createTransaction.mockClear();
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /repay card/i }));
    fireEvent.input(view.getByLabelText("Payment amount"), {
      target: { value: "1200.00" },
    });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });
    fireEvent.click(view.getByRole("button", { name: /record repayment/i }));

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledWith({
        form: "PAYMENT_CHARGE",
        sourceAccountId: "cash-main",
        totalAmount: "1200.00",
        transactionDate: "2026-11-07",
        description: "Credit-card repayment",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: "card-main",
            amount: "1200.00",
          },
        ],
      });
    });
  });

  it("keeps submit disabled when allocation amounts do not balance", () => {
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /card purchase/i }));
    fireEvent.input(view.getByLabelText("Purchase total"), {
      target: { value: "850.00" },
    });
    const [diningAllocation, groceryAllocation] =
      view.getAllByLabelText("Allocated amount");
    if (!diningAllocation || !groceryAllocation) {
      throw new Error("Expected two Expense allocation fields");
    }
    fireEvent.input(diningAllocation, { target: { value: "500.00" } });
    fireEvent.input(groceryAllocation, { target: { value: "300.00" } });
    fireEvent.input(view.getByLabelText("Transaction date"), {
      target: { value: "2026-11-07" },
    });

    expect(
      (
        view.getByRole("button", {
          name: /record card purchase/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("F10-STS-07 posts mixed forms and resets incompatible counterpart selections", async () => {
    createTransaction.mockClear();
    const bank = accounts[0];
    if (!bank) throw new Error("Expected a Cash fixture");
    const view = renderDashboard([
      ...accounts,
      { ...bank, id: "cash-other", name: "Wallet" },
    ]);
    const select = (label: string, value: string) => {
      fireEvent.change(view.getByLabelText(label), { target: { value } });
    };
    const enter = (label: string, value: string) => {
      fireEvent.input(view.getByLabelText(label), { target: { value } });
    };
    fireEvent.click(view.getByRole("button", { name: /payment or charge/i }));
    select("Paid from", "cash-main");
    enter("Transaction total", "3.00");
    enter("Transaction date", "2026-11-27");
    select("Allocation account 1", "expense-dining");
    select("Allocation type 1", "TRANSFER_TO_CASH");
    expect(
      (view.getByLabelText("Allocation account 1") as HTMLSelectElement).value,
    ).toBe("");
    expect(view.queryByRole("option", { name: "Dining" })).toBeNull();
    select("Allocation account 1", "cash-other");
    enter("Allocation amount 1", "2.00");
    fireEvent.click(view.getByRole("button", { name: "Add allocation" }));
    select("Allocation account 2", "expense-dining");
    enter("Allocation amount 2", "0.50");
    const payment = view.getByRole("button", {
      name: "Record payment or charge",
    }) as HTMLButtonElement;
    expect(payment.disabled).toBe(true);
    enter("Allocation amount 2", "1.00");
    fireEvent.click(payment);
    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          form: "PAYMENT_CHARGE",
          sourceAccountId: "cash-main",
          totalAmount: "3.00",
          allocations: [
            {
              kind: "TRANSFER_TO_CASH",
              accountId: "cash-other",
              amount: "2.00",
            },
            { kind: "EXPENSE", accountId: "expense-dining", amount: "1.00" },
          ],
        }),
      ),
    );

    fireEvent.click(view.getByRole("button", { name: /^receive money/i }));
    select("Receiving account", "cash-main");
    enter("Transaction total", "3.00");
    enter("Transaction date", "2026-11-27");
    select("Allocation account 1", "income-salary");
    enter("Allocation amount 1", "1.00");
    fireEvent.click(view.getByRole("button", { name: "Add allocation" }));
    select("Allocation type 2", "TRANSFER_FROM_CASH");
    select("Allocation account 2", "cash-other");
    enter("Allocation amount 2", "2.00");
    const receipt = view.getByRole("button", { name: "Record receipt" });
    createTransaction.mockRejectedValueOnce(new Error("Cash balance changed"));
    fireEvent.click(receipt);
    expect((await view.findByRole("alert")).textContent).toBe(
      "Cash balance changed",
    );
    expect(
      (view.getByLabelText("Allocation amount 2") as HTMLInputElement).value,
    ).toBe("2.00");
    fireEvent.click(receipt);
    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledTimes(3);
      expect(view.queryByLabelText("Allocation amount 2")).toBeNull();
      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          form: "RECEIVE_MONEY",
          sourceAccountId: "cash-main",
          totalAmount: "3.00",
          allocations: [
            { kind: "INCOME", accountId: "income-salary", amount: "1.00" },
            {
              kind: "TRANSFER_FROM_CASH",
              accountId: "cash-other",
              amount: "2.00",
            },
          ],
        }),
      );
    });
  });

  it("F10-STS-09 preserves the Lab 7 quick-card purchase safeguards", () => {
    const view = renderDashboard();
    fireEvent.click(view.getByRole("button", { name: /card purchase/i }));
    const addCategory = view.getByRole("button", {
      name: "Add category",
    }) as HTMLButtonElement;
    expect(addCategory.disabled).toBe(true);
    fireEvent.change(view.getByLabelText("Expense category 2"), {
      target: { value: "expense-dining" },
    });
    expect(view.getByRole("alert").textContent).toBe(
      "Use each expense category only once.",
    );
    expect(
      (
        view.getByRole("button", {
          name: /record card purchase/i,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(addCategory);
    expect(
      (view.getByLabelText("Expense category 3") as HTMLSelectElement).value,
    ).toBe("expense-groceries");
  });

  it("F11-STS-07 applies and clears history filters without relaxing opening balance eligibility", () => {
    const posted: Transaction = {
      id: "history-existing",
      form: "RECEIVE_MONEY",
      sourceAccountId: "cash-main",
      totalAmount: "10.00",
      transactionDate: "2024-02-29",
      description: "Already posted salary",
      allocations: [
        {
          id: "history-existing-line",
          accountId: "income-salary",
          accountName: "Salary",
          kind: "INCOME",
          amount: "10.00",
        },
      ],
    };
    const apply = mock((_input?: HistoryFilters) => {});
    const retry = mock(() => {});
    const base = {
      name: "Demo User",
      accounts,
      transactions: [posted],
      summary,
      accountActions,
      onSetOpeningBalance: setOpeningBalance,
      onCreateTransaction: createTransaction,
    };
    const view = render(
      <FinanceDashboard
        {...base}
        historySearch={{
          transactions: [posted],
          apply,
          retry,
          filtered: false,
          pending: false,
        }}
      />,
    );
    const form = within(
      view.getByRole("form", { name: "Transaction history filters" }),
    );
    expect(view.getByText("Already posted salary")).toBeTruthy();
    fireEvent.input(form.getByRole("searchbox"), {
      target: { value: "  salary  " },
    });
    fireEvent.input(form.getByLabelText("From"), {
      target: { value: "2024-03-01" },
    });
    fireEvent.input(form.getByLabelText("To"), {
      target: { value: "2024-02-29" },
    });
    fireEvent.change(form.getByLabelText("Form"), {
      target: { value: "RECEIVE_MONEY" },
    });
    fireEvent.change(form.getByLabelText("Account filter"), {
      target: { value: "income-salary" },
    });
    fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
    expect(form.getByRole("alert").textContent).toContain("start date");
    expect(apply).not.toHaveBeenCalled();

    fireEvent.input(form.getByLabelText("From"), {
      target: { value: "2024-02-29" },
    });
    fireEvent.click(form.getByRole("button", { name: "Apply filters" }));
    expect(apply).toHaveBeenCalledWith({
      search: "salary",
      fromDate: "2024-02-29",
      toDate: "2024-02-29",
      form: "RECEIVE_MONEY",
      accountId: "income-salary",
    });

    view.rerender(
      <FinanceDashboard
        {...base}
        historySearch={{
          transactions: [],
          apply,
          retry,
          filtered: true,
          pending: true,
        }}
      />,
    );
    expect(view.getByText("Loading matching transactions…")).toBeTruthy();
    view.rerender(
      <FinanceDashboard
        {...base}
        historySearch={{
          transactions: [],
          apply,
          retry,
          filtered: true,
          pending: false,
          error: "History temporarily unavailable",
        }}
      />,
    );
    expect(view.getByRole("alert").textContent).toBe(
      "History temporarily unavailable",
    );
    fireEvent.click(view.getByRole("button", { name: "Retry filters" }));
    expect(retry).toHaveBeenCalledTimes(1);
    view.rerender(
      <FinanceDashboard
        {...base}
        historySearch={{
          transactions: [],
          apply,
          retry,
          filtered: true,
          pending: false,
        }}
      />,
    );
    expect(view.getByText("No transactions match these filters.")).toBeTruthy();
    expect(view.queryByText("Already posted salary")).toBeNull();
    const openingAccounts = within(
      view.getByRole("combobox", { name: "Account" }),
    );
    expect(
      openingAccounts.queryByRole("option", { name: "Everyday bank" }),
    ).toBeNull();
    expect(
      openingAccounts.getByRole("option", { name: "Travel card" }),
    ).toBeTruthy();
    expect(
      view.getByRole("region", { name: "Financial overview" }).textContent,
    ).toContain("฿0.00");

    fireEvent.click(form.getByRole("button", { name: "Clear filters" }));
    expect(apply.mock.calls.at(-1)).toEqual([]);
    expect((form.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    expect(
      (form.getByLabelText("Account filter") as HTMLSelectElement).value,
    ).toBe("");
    view.rerender(
      <FinanceDashboard
        {...base}
        historySearch={{
          transactions: [posted],
          apply,
          retry,
          filtered: false,
          pending: false,
        }}
      />,
    );
    expect(view.getByText("Already posted salary")).toBeTruthy();
  });

  it("F11-STS-08 refreshes the active filtered history from the normal dashboard after posting", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let posted: Transaction | undefined;
    const historyQueries: (HistoryFilters | undefined)[] = [];
    const testLink: TRPCLink<AppRouter> =
      () =>
      ({ op }) =>
        observable((observer) => {
          switch (op.path) {
            case "finance.accounts.list":
              observer.next({ result: { data: accounts } });
              break;
            case "finance.summary.get":
              observer.next({ result: { data: summary } });
              break;
            case "finance.transactions.history": {
              const filter = op.input as HistoryFilters | undefined;
              historyQueries.push(filter);
              const matches =
                !filter?.search || posted?.description?.includes(filter.search);
              observer.next({
                result: { data: posted && matches ? [posted] : [] },
              });
              break;
            }
            case "finance.transactions.create": {
              const input =
                op.input as Inputs["finance"]["transactions"]["create"];
              posted = {
                ...input,
                id: "synthetic-new-post",
                description: input.description ?? null,
                allocations: input.allocations.map((line, index) => ({
                  ...line,
                  id: `synthetic-new-line-${index}`,
                  accountName: "Salary",
                })),
              };
              observer.next({ result: { data: posted } });
              break;
            }
            default:
              throw new Error(`Unexpected request: ${op.path}`);
          }
          observer.complete();
        });
    const trpcClient = createTRPCClient<AppRouter>({ links: [testLink] });
    const view = render(
      <QueryClientProvider client={queryClient}>
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          <UserFinanceOverview
            name="Demo User"
            userId="synthetic-history-user"
          />
        </TRPCProvider>
      </QueryClientProvider>,
    );
    try {
      const filters = within(
        await view.findByRole("form", { name: "Transaction history filters" }),
      );
      fireEvent.input(filters.getByRole("searchbox"), {
        target: { value: "filter refresh" },
      });
      fireEvent.click(filters.getByRole("button", { name: "Apply filters" }));
      await view.findByText("No transactions match these filters.");
      expect(
        historyQueries.filter((query) => query?.search === "filter refresh"),
      ).toHaveLength(1);

      fireEvent.click(view.getByRole("button", { name: /income received/i }));
      fireEvent.input(view.getByLabelText("Amount received"), {
        target: { value: "15.00" },
      });
      fireEvent.input(view.getByLabelText("Transaction date"), {
        target: { value: "2024-02-29" },
      });
      fireEvent.input(view.getByLabelText("Description"), {
        target: { value: "filter refresh salary" },
      });
      fireEvent.click(view.getByRole("button", { name: "Record income" }));
      await view.findByText("filter refresh salary");
      expect(
        historyQueries.filter((query) => query?.search === "filter refresh"),
      ).toHaveLength(2);
    } finally {
      view.unmount();
      queryClient.clear();
    }
  });
});
