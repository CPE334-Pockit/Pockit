import { createPrismaClient } from "@Pockit/db";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { Context } from "../context";
import { appRouter } from "./index";

const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must point to a disposable PostgreSQL test database.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
const ids = {
  userA: crypto.randomUUID(),
  userB: crypto.randomUUID(),
  administrator: crypto.randomUUID(),
  historyUser: crypto.randomUUID(),
};
const accounts = {
  bank: crypto.randomUUID(),
  card: crypto.randomUUID(),
  salary: crypto.randomUUID(),
  dining: crypto.randomUUID(),
  groceries: crypto.randomUUID(),
  lowCash: crypto.randomUUID(),
  openingOnlyCash: crypto.randomUUID(),
  singleLineCard: crypto.randomUUID(),
  singleLineExpense: crypto.randomUUID(),
  raceCash: crypto.randomUUID(),
  raceCard: crypto.randomUUID(),
  raceExpense: crypto.randomUUID(),
  userBBank: crypto.randomUUID(),
};
function caller(userId: string, role = "User", database = db) {
  const session = {
    session: { id: `session-${userId}`, userId },
    user: {
      id: userId,
      name: `Synthetic ${role}`,
      role,
      isEnabled: true,
    },
  } as NonNullable<Context["session"]>;
  return appRouter.createCaller({ db: database, session });
}

const userCaller = () => caller(ids.userA);
const administratorCaller = () => caller(ids.administrator, "Administrator");

async function expectRejectedWithCode(
  operation: Promise<unknown>,
  code: string,
) {
  let rejection: unknown;
  try {
    await operation;
  } catch (error) {
    rejection = error;
  }
  expect(rejection).toMatchObject({ code });
}

beforeAll(async () => {
  await db.user.createMany({
    data: [
      {
        id: ids.userA,
        name: "Finance User A",
        email: `${ids.userA}@example.test`,
      },
      {
        id: ids.userB,
        name: "Finance User B",
        email: `${ids.userB}@example.test`,
      },
      {
        id: ids.administrator,
        name: "Finance Administrator",
        email: `${ids.administrator}@example.test`,
        role: "Administrator",
      },
      {
        id: ids.historyUser,
        name: "Synthetic History User",
        email: `${ids.historyUser}@example.test`,
      },
    ],
  });

  await db.financialAccount.createMany({
    data: [
      {
        id: accounts.bank,
        ownerId: ids.userA,
        name: "Demo bank",
        type: "CASH",
      },
      {
        id: accounts.card,
        ownerId: ids.userA,
        name: "Demo card",
        type: "LOAN_TAKEN",
      },
      {
        id: accounts.salary,
        ownerId: ids.userA,
        name: "Salary",
        type: "INCOME",
      },
      {
        id: accounts.dining,
        ownerId: ids.userA,
        name: "Dining",
        type: "EXPENSE",
      },
      {
        id: accounts.groceries,
        ownerId: ids.userA,
        name: "Groceries",
        type: "EXPENSE",
      },
      {
        id: accounts.lowCash,
        ownerId: ids.userA,
        name: "Low balance wallet",
        type: "CASH",
      },
      {
        id: accounts.openingOnlyCash,
        ownerId: ids.userA,
        name: "Opening-only synthetic cash",
        type: "CASH",
      },
      {
        id: accounts.singleLineCard,
        ownerId: ids.userA,
        name: "Single-line test card",
        type: "LOAN_TAKEN",
      },
      {
        id: accounts.singleLineExpense,
        ownerId: ids.userA,
        name: "Small purchases",
        type: "EXPENSE",
      },
      {
        id: accounts.raceCash,
        ownerId: ids.userA,
        name: "Snapshot test Cash",
        type: "CASH",
      },
      {
        id: accounts.raceCard,
        ownerId: ids.userA,
        name: "Snapshot test card",
        type: "LOAN_TAKEN",
      },
      {
        id: accounts.raceExpense,
        ownerId: ids.userA,
        name: "Snapshot test Expense",
        type: "EXPENSE",
      },
      {
        id: accounts.userBBank,
        ownerId: ids.userB,
        name: "Private bank",
        type: "CASH",
      },
    ],
  });
});

afterAll(async () => {
  await db.financialTransaction.deleteMany({
    where: { ownerId: { in: Object.values(ids) } },
  });
  await db.financialAccount.deleteMany({
    where: { ownerId: { in: Object.values(ids) } },
  });
  await db.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
  await db.$disconnect();
});

describe("Sprint 1 financial API", () => {
  it("persists the opening balance, salary, split card purchase, and repayment with correct totals", async () => {
    const api = userCaller();

    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.bank,
      amount: "1000.00",
    });
    await api.finance.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: accounts.bank,
      totalAmount: "1500.00",
      transactionDate: "1999-01-01",
      allocations: [
        { kind: "INCOME", accountId: accounts.salary, amount: "1500.00" },
      ],
    });
    await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.card,
      totalAmount: "100.00",
      transactionDate: "2026-11-02",
      allocations: [
        { kind: "EXPENSE", accountId: accounts.dining, amount: "65.00" },
        { kind: "EXPENSE", accountId: accounts.groceries, amount: "35.00" },
      ],
    });
    await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.bank,
      totalAmount: "40.00",
      transactionDate: "2026-11-03",
      allocations: [
        {
          kind: "LOAN_TAKEN_REPAYMENT",
          accountId: accounts.card,
          amount: "40.00",
        },
      ],
    });

    const accountList = await api.finance.accounts.list();
    expect(accountList.find(({ id }) => id === accounts.bank)?.balance).toBe(
      "2460.00",
    );
    expect(accountList.find(({ id }) => id === accounts.card)?.balance).toBe(
      "60.00",
    );

    const summary = await api.finance.summary.get();
    expect(summary.incomeTotal).toBe("1500.00");
    expect(summary.expenseTotal).toBe("100.00");
    expect(summary.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: accounts.dining, total: "65.00" }),
        expect.objectContaining({
          accountId: accounts.groceries,
          total: "35.00",
        }),
      ]),
    );

    const history = await api.finance.transactions.history();
    expect(history).toHaveLength(3);
    expect(history.map(({ transactionDate }) => transactionDate)).toEqual([
      "2026-11-03",
      "2026-11-02",
      "1999-01-01",
    ]);
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(3);
    expect(
      await db.allocationLine.count({ where: { ownerId: ids.userA } }),
    ).toBe(4);

    const reopenedDb = createPrismaClient({ DATABASE_URL: databaseUrl });
    try {
      const reopenedApi = appRouter.createCaller({
        db: reopenedDb,
        session: {
          session: { id: "reopened-synthetic-session", userId: ids.userA },
          user: {
            id: ids.userA,
            name: "Synthetic User A",
            role: "User",
            isEnabled: true,
          },
        } as NonNullable<Context["session"]>,
      });
      expect(
        (
          await reopenedApi.finance.accounts.get({
            accountId: accounts.bank,
          })
        ).balance,
      ).toBe("2460.00");
      expect(await reopenedApi.finance.transactions.history()).toHaveLength(3);
      expect((await reopenedApi.finance.summary.get()).expenseTotal).toBe(
        "100.00",
      );
    } finally {
      await reopenedDb.$disconnect();
    }
  });

  it("keeps opening balances out of income and expense totals", async () => {
    const api = userCaller();
    const summaryBefore = await api.finance.summary.get();
    const transactionsBefore = await db.financialTransaction.count({
      where: { ownerId: ids.userA },
    });

    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.openingOnlyCash,
      amount: "123.45",
    });

    expect(
      (
        await api.finance.accounts.get({
          accountId: accounts.openingOnlyCash,
        })
      ).balance,
    ).toBe("123.45");
    const summaryAfter = await api.finance.summary.get();
    expect(summaryAfter.incomeTotal).toBe(summaryBefore.incomeTotal);
    expect(summaryAfter.expenseTotal).toBe(summaryBefore.expenseTotal);
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(transactionsBefore);
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.salary,
        amount: "1.00",
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.userBBank,
        amount: "1.00",
      }),
      "NOT_FOUND",
    );
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.openingOnlyCash,
        amount: "0.00",
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.openingOnlyCash,
        amount: "-1.00",
      }),
      "BAD_REQUEST",
    );
    expect(
      (
        await api.finance.accounts.get({
          accountId: accounts.openingOnlyCash,
        })
      ).balance,
    ).toBe("123.45");
  });

  it("rejects invalid transaction inputs without changing ledger state", async () => {
    const api = userCaller();
    const [
      transactionsBefore,
      allocationsBefore,
      summaryBefore,
      bankBefore,
      cardBefore,
    ] = await Promise.all([
      db.financialTransaction.count({ where: { ownerId: ids.userA } }),
      db.allocationLine.count({ where: { ownerId: ids.userA } }),
      api.finance.summary.get(),
      api.finance.accounts.get({ accountId: accounts.bank }),
      api.finance.accounts.get({ accountId: accounts.card }),
    ]);
    const invalidWrites = [
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "10.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "9.99" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.001",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.001" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2025-02-29",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "0.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "0.00" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [],
      },
      {
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.dining,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      },
    ];

    for (const input of invalidWrites) {
      await expectRejectedWithCode(
        api.finance.transactions.create(input as never),
        "BAD_REQUEST",
      );
    }

    const [
      transactionsAfter,
      allocationsAfter,
      summaryAfter,
      bankAfter,
      cardAfter,
    ] = await Promise.all([
      db.financialTransaction.count({ where: { ownerId: ids.userA } }),
      db.allocationLine.count({ where: { ownerId: ids.userA } }),
      api.finance.summary.get(),
      api.finance.accounts.get({ accountId: accounts.bank }),
      api.finance.accounts.get({ accountId: accounts.card }),
    ]);
    expect(transactionsAfter).toBe(transactionsBefore);
    expect(allocationsAfter).toBe(allocationsBefore);
    expect(summaryAfter).toEqual(summaryBefore);
    expect(bankAfter.balance).toBe(bankBefore.balance);
    expect(cardAfter.balance).toBe(cardBefore.balance);
  });

  it("rejects over-repayment, Cash overdraft, and opening-balance rewrites", async () => {
    const api = userCaller();
    const countBefore = await db.financialTransaction.count({
      where: { ownerId: ids.userA },
    });

    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.lowCash,
      amount: "0.01",
    });
    await expectRejectedWithCode(
      api.finance.accounts.setOpeningBalance({
        accountId: accounts.bank,
        amount: "2000.00",
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.bank,
        totalAmount: "60.01",
        transactionDate: "2026-11-04",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: accounts.card,
            amount: "60.01",
          },
        ],
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.lowCash,
        totalAmount: "0.02",
        transactionDate: "2026-11-04",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: accounts.card,
            amount: "0.02",
          },
        ],
      }),
      "BAD_REQUEST",
    );

    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(countBefore);
    expect(
      (await api.finance.accounts.get({ accountId: accounts.bank })).balance,
    ).toBe("2460.00");
    expect(
      (await api.finance.accounts.get({ accountId: accounts.card })).balance,
    ).toBe("60.00");
  });

  it("does not disclose another User account and rejects cross-owner writes", async () => {
    const api = userCaller();
    const countBeforeA = await db.financialTransaction.count({
      where: { ownerId: ids.userA },
    });
    const countBeforeB = await db.financialTransaction.count({
      where: { ownerId: ids.userB },
    });
    expect((await api.finance.accounts.list()).map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        accounts.bank,
        accounts.card,
        accounts.salary,
        accounts.dining,
        accounts.groceries,
        accounts.lowCash,
      ]),
    );
    expect(
      (await caller(ids.userB).finance.accounts.list()).map(({ id }) => id),
    ).toEqual([accounts.userBBank]);
    await expectRejectedWithCode(
      api.finance.accounts.get({ accountId: accounts.userBBank }),
      "NOT_FOUND",
    );

    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.userBBank, amount: "1.00" },
        ],
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.finance.transactions.create({
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.dining, amount: "1.00" },
        ],
      }),
      "BAD_REQUEST",
    );
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userA } }),
    ).toBe(countBeforeA);
    expect(
      await db.financialTransaction.count({ where: { ownerId: ids.userB } }),
    ).toBe(countBeforeB);
  });

  it("accepts a one-line card purchase and sums one-cent allocations exactly", async () => {
    const api = userCaller();
    const expensesBefore = (await api.finance.summary.get()).expenseTotal;
    const oneLinePurchase = await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.singleLineCard,
      totalAmount: "10.00",
      transactionDate: "2026-11-05",
      allocations: [
        {
          kind: "EXPENSE",
          accountId: accounts.singleLineExpense,
          amount: "10.00",
        },
      ],
    });
    expect(oneLinePurchase.allocations).toHaveLength(1);
    expect(oneLinePurchase.allocations[0]?.amount).toBe("10.00");

    const smallAllocations = await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.singleLineCard,
      totalAmount: "0.03",
      transactionDate: "2026-11-05",
      allocations: [
        {
          kind: "EXPENSE",
          accountId: accounts.singleLineExpense,
          amount: "0.01",
        },
        { kind: "EXPENSE", accountId: accounts.dining, amount: "0.01" },
        { kind: "EXPENSE", accountId: accounts.groceries, amount: "0.01" },
      ],
    });
    expect(smallAllocations.allocations.map(({ amount }) => amount)).toEqual([
      "0.01",
      "0.01",
      "0.01",
    ]);
    expect(
      (await api.finance.accounts.get({ accountId: accounts.singleLineCard }))
        .balance,
    ).toBe("10.03");
    expect(
      (await api.finance.summary.get()).categories.find(
        ({ accountId }) => accountId === accounts.singleLineExpense,
      )?.total,
    ).toBe("10.01");
    const expensesAfter = (await api.finance.summary.get()).expenseTotal;
    expect(
      BigInt(expensesAfter.replace(".", "")) -
        BigInt(expensesBefore.replace(".", "")),
    ).toBe(1003n);
  });

  it("reads a Loan Taken balance from one snapshot during concurrent postings", async () => {
    const api = userCaller();
    const concurrentWriterDb = createPrismaClient({
      DATABASE_URL: databaseUrl,
    });
    const concurrentWriter = caller(ids.userA, "User", concurrentWriterDb);
    await api.finance.accounts.setOpeningBalance({
      accountId: accounts.raceCash,
      amount: "200.00",
    });
    await api.finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: accounts.raceCard,
      totalAmount: "100.00",
      transactionDate: "2026-11-07",
      allocations: [
        {
          kind: "EXPENSE",
          accountId: accounts.raceExpense,
          amount: "100.00",
        },
      ],
    });

    let releaseChargeRead!: () => void;
    const chargeReadGate = new Promise<void>((resolve) => {
      releaseChargeRead = resolve;
    });
    let chargeReadReached!: () => void;
    const chargeRead = new Promise<void>((resolve) => {
      chargeReadReached = resolve;
    });
    let releaseAllocationRead!: () => void;
    const allocationReadGate = new Promise<void>((resolve) => {
      releaseAllocationRead = resolve;
    });
    const synchronizedDatabase = db.$extends({
      query: {
        financialTransaction: {
          async findMany({ args, query }) {
            const result = await query(args);
            if (args.where?.sourceAccountId === accounts.raceCard) {
              chargeReadReached();
              await chargeReadGate;
            }
            return result;
          },
        },
        allocationLine: {
          async findMany({ args, query }) {
            if (args.where?.accountId === accounts.raceCard) {
              await allocationReadGate;
            }
            return query(args);
          },
        },
      },
    });
    const racingApi = appRouter.createCaller({
      db: synchronizedDatabase as unknown as typeof db,
      session: {
        session: { id: `session-${ids.userA}`, userId: ids.userA },
        user: {
          id: ids.userA,
          name: "Synthetic User A",
          role: "User",
          isEnabled: true,
        },
      } as NonNullable<Context["session"]>,
    });
    const balanceRead = racingApi.finance.accounts.get({
      accountId: accounts.raceCard,
    });
    let chargeReadTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const chargeReadTimeout = new Promise<void>((_, reject) => {
      chargeReadTimeoutId = setTimeout(
        () => reject(new Error("Loan Taken charge query was not reached")),
        1_000,
      );
    });
    const balanceReadFinishedEarly = balanceRead.then(
      () => {
        throw new Error("Balance read finished before the charge query gate");
      },
      (error: unknown) => {
        throw error;
      },
    );

    try {
      await Promise.race([
        chargeRead,
        chargeReadTimeout,
        balanceReadFinishedEarly,
      ]);
      await concurrentWriter.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.raceCard,
        totalAmount: "50.00",
        transactionDate: "2026-11-07",
        allocations: [
          {
            kind: "EXPENSE",
            accountId: accounts.raceExpense,
            amount: "50.00",
          },
        ],
      });
      await concurrentWriter.finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: accounts.raceCash,
        totalAmount: "150.00",
        transactionDate: "2026-11-07",
        allocations: [
          {
            kind: "LOAN_TAKEN_REPAYMENT",
            accountId: accounts.raceCard,
            amount: "150.00",
          },
        ],
      });
    } finally {
      if (chargeReadTimeoutId !== undefined) {
        clearTimeout(chargeReadTimeoutId);
      }
      releaseChargeRead();
      releaseAllocationRead();
      await concurrentWriterDb.$disconnect();
    }

    expect(await balanceRead).toMatchObject({ balance: "100.00" });
    expect(
      (await api.finance.accounts.get({ accountId: accounts.raceCard }))
        .balance,
    ).toBe("0.00");
  });

  it("denies unauthenticated and Administrator access to every financial read and write", async () => {
    const anonymous = appRouter.createCaller({ db, session: null });
    const administrator = administratorCaller();

    await expect(anonymous.finance.accounts.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(administrator.finance.accounts.list()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(administrator.finance.summary.get()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      administrator.finance.transactions.history(),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      administrator.finance.accounts.setOpeningBalance({
        accountId: accounts.bank,
        amount: "1.00",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      administrator.finance.transactions.create({
        form: "RECEIVE_MONEY",
        sourceAccountId: accounts.bank,
        totalAmount: "1.00",
        transactionDate: "2026-11-04",
        allocations: [
          { kind: "INCOME", accountId: accounts.salary, amount: "1.00" },
        ],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("FEAT-09 account lifecycle", () => {
  const accountTypes = [
    "CASH",
    "LOAN_GIVEN",
    "LOAN_TAKEN",
    "INCOME",
    "EXPENSE",
  ] as const;

  it("F09-STS-01 persists all five types, duplicate names, and renames only the selected Account", async () => {
    const api = caller(ids.userB).finance.accounts;
    const created = await Promise.all(
      accountTypes.map((type) =>
        api.create({ name: "  Same account  ", type }),
      ),
    );
    expect(new Set(created.map(({ id }) => id)).size).toBe(5);
    expect(created.map(({ type }) => type)).toEqual([...accountTypes]);
    for (const account of created) {
      expect(account).toMatchObject({
        name: "Same account",
        currencyCode: "THB",
        openingBalance: null,
      });
      expect(await api.get({ accountId: account.id })).toEqual(account);
    }
    const [first, second] = created;
    if (!first || !second) throw new Error("Expected two created accounts");
    expect(
      await api.rename({ accountId: first.id, name: " Revised " }),
    ).toEqual({
      id: first.id,
      name: "Revised",
    });
    expect(await api.list()).toEqual(
      expect.arrayContaining([{ ...first, name: "Revised" }, second]),
    );
    expect(
      await db.financialAccount.findUnique({ where: { id: first.id } }),
    ).toMatchObject({
      ownerId: ids.userB,
      name: "Revised",
      type: "CASH",
    });
  });

  it("F09-STS-02 deletes unused Accounts and preserves opening positions and posted references", async () => {
    const finance = caller(ids.userB).finance;
    await expectRejectedWithCode(
      finance.accounts.create({ name: "  ", type: "CASH" }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      finance.accounts.create({ name: "Crypto", type: "CRYPTO" as "CASH" }),
      "BAD_REQUEST",
    );
    const unused = await finance.accounts.create({
      name: "Delete me",
      type: "INCOME",
    });
    expect(await finance.accounts.delete({ accountId: unused.id })).toEqual({
      id: unused.id,
    });
    await expectRejectedWithCode(
      finance.accounts.get({ accountId: unused.id }),
      "NOT_FOUND",
    );
    const cash = await finance.accounts.create({
      name: "Opening only",
      type: "CASH",
      openingBalance: "1",
    });
    const card = await finance.accounts.create({
      name: "Card to retain",
      type: "LOAN_TAKEN",
    });
    const expense = await finance.accounts.create({
      name: "Expense to retain",
      type: "EXPENSE",
    });
    const posting = await finance.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: card.id,
      totalAmount: "1.00",
      transactionDate: "2026-11-26",
      allocations: [{ kind: "EXPENSE", accountId: expense.id, amount: "1.00" }],
    });
    for (const { id } of [cash, card, expense]) {
      await expectRejectedWithCode(
        finance.accounts.delete({ accountId: id }),
        "CONFLICT",
      );
      expect((await finance.accounts.get({ accountId: id })).id).toBe(id);
    }
    await expectRejectedWithCode(
      finance.accounts.setOpeningBalance({
        accountId: card.id,
        amount: "2.00",
      }),
      "BAD_REQUEST",
    );
    await finance.accounts.rename({
      accountId: expense.id,
      name: "Renamed expense",
    });
    expect(await finance.transactions.history()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: posting.id,
          sourceAccountId: card.id,
          allocations: [
            expect.objectContaining({
              accountId: expense.id,
              accountName: "Renamed expense",
              amount: "1.00",
            }),
          ],
        }),
      ]),
    );
  });

  it("F09-STS-03 records an exact opening position for an existing loan without changing the summary totals", async () => {
    const api = caller(ids.userB);
    const loan = await db.financialAccount.create({
      data: { ownerId: ids.userB, name: "Loan fixture", type: "LOAN_GIVEN" },
    });
    const before = await api.finance.summary.get();
    const historyBefore = await api.finance.transactions.history();
    const opened = await api.finance.accounts.setOpeningBalance({
      accountId: loan.id,
      amount: "100.25",
    });

    expect(opened).toMatchObject({
      openingBalance: "100.25",
      balance: "100.25",
    });
    expect(await api.finance.accounts.get({ accountId: loan.id })).toEqual(
      opened,
    );
    const after = await api.finance.summary.get();
    expect(after.incomeTotal).toBe(before.incomeTotal);
    expect(after.expenseTotal).toBe(before.expenseTotal);
    expect(await api.finance.transactions.history()).toEqual(historyBefore);
  });

  it("F09-STS-03/04 applies opening positions on creation and rejects invalid baselines atomically", async () => {
    const finance = caller(ids.userB).finance;
    const before = await finance.summary.get();
    const history = await finance.transactions.history();
    for (const [type, amount] of [
      ["CASH", "0.01"],
      ["LOAN_GIVEN", "100.25"],
      ["LOAN_TAKEN", "75.10"],
    ] as const) {
      const account = await finance.accounts.create({
        name: type,
        type,
        openingBalance: amount,
      });
      expect(
        await finance.accounts.get({ accountId: account.id }),
      ).toMatchObject({
        openingBalance: amount,
        balance: amount,
      });
      await expectRejectedWithCode(
        finance.accounts.setOpeningBalance({
          accountId: account.id,
          amount: "9.00",
        }),
        "BAD_REQUEST",
      );
    }
    const noOpening = await finance.accounts.create({
      name: "No starting debt",
      type: "LOAN_TAKEN",
    });
    expect(noOpening).toMatchObject({ openingBalance: null, balance: "0.00" });
    for (const [type, amount] of [
      ["INCOME", "1.00"],
      ["EXPENSE", "1.00"],
      ["CASH", "0.00"],
      ["CASH", "-1.00"],
      ["CASH", "1.001"],
    ] as const) {
      await expectRejectedWithCode(
        finance.accounts.create({
          name: "Invalid opening",
          type,
          openingBalance: amount,
        }),
        "BAD_REQUEST",
      );
    }
    expect(
      (await finance.accounts.list()).some(
        ({ name }) => name === "Invalid opening",
      ),
    ).toBe(false);
    const after = await finance.summary.get();
    expect(after.incomeTotal).toBe(before.incomeTotal);
    expect(after.expenseTotal).toBe(before.expenseTotal);
    expect(await finance.transactions.history()).toEqual(history);
  });

  it("F09-STS-05 rejects unauthenticated, Administrator, and cross-owner writes", async () => {
    const owner = caller(ids.userB).finance.accounts;
    const anonymous = appRouter.createCaller({ db, session: null }).finance
      .accounts;
    const admin = administratorCaller().finance.accounts;
    const other = userCaller().finance.accounts;
    const account = await owner.create({
      name: "Private lifecycle",
      type: "LOAN_GIVEN",
    });
    const input = { accountId: account.id };
    for (const [api, code] of [
      [anonymous, "UNAUTHORIZED"],
      [admin, "FORBIDDEN"],
    ] as const) {
      await expectRejectedWithCode(
        api.create({ name: "Disallowed", type: "CASH" }),
        code,
      );
      await expectRejectedWithCode(
        api.rename({ ...input, name: "Disallowed" }),
        code,
      );
      await expectRejectedWithCode(api.delete(input), code);
      await expectRejectedWithCode(
        api.setOpeningBalance({ ...input, amount: "1" }),
        code,
      );
    }
    await expectRejectedWithCode(
      other.rename({ ...input, name: "Disallowed" }),
      "NOT_FOUND",
    );
    await expectRejectedWithCode(other.delete(input), "NOT_FOUND");
    await expectRejectedWithCode(
      other.setOpeningBalance({ ...input, amount: "1" }),
      "NOT_FOUND",
    );
    expect((await other.list()).some(({ id }) => id === account.id)).toBe(
      false,
    );
    expect(await owner.get(input)).toEqual(account);
  });

  it("F09-STS-06 permits one opening write and preserves any concurrently posted references", async () => {
    const finance = caller(ids.userB).finance;
    const loan = await finance.accounts.create({
      name: "Concurrent opening",
      type: "LOAN_TAKEN",
    });
    const opening = await Promise.allSettled([
      finance.accounts.setOpeningBalance({
        accountId: loan.id,
        amount: "1.00",
      }),
      finance.accounts.setOpeningBalance({
        accountId: loan.id,
        amount: "2.00",
      }),
    ]);
    const successfulWrites = opening.filter(
      (result) => result.status === "fulfilled",
    );
    expect(successfulWrites).toHaveLength(1);
    const [written] = successfulWrites;
    if (!written) throw new Error("Expected one recorded opening balance");
    expect(await finance.accounts.get({ accountId: loan.id })).toEqual(
      written.value,
    );

    const card = await finance.accounts.create({
      name: "Concurrent charge",
      type: "LOAN_TAKEN",
    });
    const expense = await finance.accounts.create({
      name: "Concurrent deletion",
      type: "EXPENSE",
    });
    const [deletion, charge] = await Promise.allSettled([
      finance.accounts.delete({ accountId: expense.id }),
      finance.transactions.create({
        form: "PAYMENT_CHARGE",
        sourceAccountId: card.id,
        totalAmount: "1.00",
        transactionDate: "2026-11-26",
        allocations: [
          { kind: "EXPENSE", accountId: expense.id, amount: "1.00" },
        ],
      }),
    ]);
    expect([deletion.status, charge.status].sort()).toEqual([
      "fulfilled",
      "rejected",
    ]);
    if (charge.status === "fulfilled") {
      expect(
        await finance.accounts.get({ accountId: expense.id }),
      ).toMatchObject({ categoryTotal: "1.00" });
      expect(
        (await finance.transactions.history()).some(
          ({ id }) => id === charge.value.id,
        ),
      ).toBe(true);
    } else {
      await expectRejectedWithCode(
        finance.accounts.get({ accountId: expense.id }),
        "NOT_FOUND",
      );
      expect(await finance.accounts.get({ accountId: card.id })).toMatchObject({
        balance: "0.00",
      });
    }
  });
});

describe("FEAT-10 expanded money movement", () => {
  const date = "2026-11-27";
  const finance = () => caller(ids.userB).finance;

  it("F10-STS-01/02 persists both mixed forms with exact counterpart effects", async () => {
    const api = finance();
    const before = await api.summary.get();
    const [bank, wallet, card, loan, salary, dining] = await Promise.all([
      api.accounts.create({
        name: "Movement bank",
        type: "CASH",
        openingBalance: "1000",
      }),
      api.accounts.create({
        name: "Movement wallet",
        type: "CASH",
        openingBalance: "200",
      }),
      api.accounts.create({
        name: "Movement card",
        type: "LOAN_TAKEN",
        openingBalance: "300",
      }),
      api.accounts.create({
        name: "Movement loan",
        type: "LOAN_GIVEN",
        openingBalance: "100",
      }),
      api.accounts.create({ name: "Movement salary", type: "INCOME" }),
      api.accounts.create({ name: "Movement dining", type: "EXPENSE" }),
    ]);
    const payment = await api.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: bank.id,
      totalAmount: "120",
      transactionDate: date,
      allocations: [
        { kind: "EXPENSE", accountId: dining.id, amount: "40" },
        { kind: "LOAN_TAKEN_REPAYMENT", accountId: card.id, amount: "30" },
        { kind: "LOAN_GIVEN_LENDING", accountId: loan.id, amount: "20" },
        { kind: "TRANSFER_TO_CASH", accountId: wallet.id, amount: "30" },
      ],
    });
    const readBalances = async (client: ReturnType<typeof finance>) =>
      Promise.all(
        [bank, wallet, card, loan].map(
          async ({ id }) =>
            (await client.accounts.get({ accountId: id })).balance,
        ),
      );
    expect(await readBalances(api)).toEqual([
      "880.00",
      "230.00",
      "270.00",
      "120.00",
    ]);
    const receipt = await api.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: bank.id,
      totalAmount: "95",
      transactionDate: date,
      allocations: [
        { kind: "INCOME", accountId: salary.id, amount: "25" },
        { kind: "LOAN_GIVEN_REPAYMENT", accountId: loan.id, amount: "20" },
        { kind: "LOAN_TAKEN_BORROWING", accountId: card.id, amount: "30" },
        { kind: "TRANSFER_FROM_CASH", accountId: wallet.id, amount: "20" },
      ],
    });
    const reopened = createPrismaClient({ DATABASE_URL: databaseUrl });
    try {
      const read = caller(ids.userB, "User", reopened).finance;
      expect(await readBalances(read)).toEqual([
        "975.00",
        "210.00",
        "300.00",
        "100.00",
      ]);
      const summary = await read.summary.get();
      expect(
        BigInt(summary.expenseTotal.replace(".", "")) -
          BigInt(before.expenseTotal.replace(".", "")),
      ).toBe(4000n);
      expect(
        BigInt(summary.incomeTotal.replace(".", "")) -
          BigInt(before.incomeTotal.replace(".", "")),
      ).toBe(2500n);
      expect(summary.categories).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ accountId: dining.id, total: "40.00" }),
          expect.objectContaining({ accountId: salary.id, total: "25.00" }),
        ]),
      );
      expect(await read.transactions.history()).toEqual(
        expect.arrayContaining([payment, receipt]),
      );
    } finally {
      await reopened.$disconnect();
    }
  });

  it("F10-STS-09 keeps the Lab 7 exception for repeated Expense accounts on Loan Taken charges", async () => {
    const api = finance();
    const [card, bank, expense] = await Promise.all([
      api.accounts.create({ name: "Duplicate test card", type: "LOAN_TAKEN" }),
      api.accounts.create({
        name: "Duplicate test bank",
        type: "CASH",
        openingBalance: "5.00",
      }),
      api.accounts.create({ name: "Duplicate test category", type: "EXPENSE" }),
    ]);
    const input = {
      form: "PAYMENT_CHARGE",
      sourceAccountId: card.id,
      totalAmount: "2.00",
      transactionDate: date,
      allocations: [
        { kind: "EXPENSE", accountId: expense.id, amount: "1.00" },
        { kind: "EXPENSE", accountId: expense.id, amount: "1.00" },
      ],
    } as const;
    const history = await api.transactions.history();
    await expectRejectedWithCode(
      api.transactions.create({
        ...input,
        allocations: [...input.allocations],
      }),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.transactions.create({
        ...input,
        totalAmount: "3.00",
        allocations: [
          ...input.allocations,
          { kind: "TRANSFER_TO_CASH", accountId: bank.id, amount: "1.00" },
        ],
      }),
      "BAD_REQUEST",
    );
    expect(await api.transactions.history()).toEqual(history);
    expect(await api.accounts.get({ accountId: card.id })).toMatchObject({
      balance: "0.00",
    });
    await api.transactions.create({
      ...input,
      sourceAccountId: bank.id,
      allocations: [...input.allocations],
    });
    expect(await api.accounts.get({ accountId: expense.id })).toMatchObject({
      categoryTotal: "2.00",
    });
  });

  it("F10-STS-03 posts card-funded transfers and repayments to another card", async () => {
    const api = finance();
    const [source, debt, cash, expense] = await Promise.all([
      api.accounts.create({ name: "Funding card", type: "LOAN_TAKEN" }),
      api.accounts.create({
        name: "Repaid card",
        type: "LOAN_TAKEN",
        openingBalance: "0.02",
      }),
      api.accounts.create({ name: "Cash destination", type: "CASH" }),
      api.accounts.create({ name: "Card expense", type: "EXPENSE" }),
    ]);
    await api.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: source.id,
      totalAmount: "0.03",
      transactionDate: date,
      allocations: [
        { kind: "EXPENSE", accountId: expense.id, amount: "0.01" },
        { kind: "LOAN_TAKEN_REPAYMENT", accountId: debt.id, amount: "0.01" },
        { kind: "TRANSFER_TO_CASH", accountId: cash.id, amount: "0.01" },
      ],
    });
    const persisted = await api.accounts.list();
    expect(persisted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: source.id, balance: "0.03" }),
        expect.objectContaining({ id: debt.id, balance: "0.01" }),
        expect.objectContaining({ id: cash.id, balance: "0.01" }),
        expect.objectContaining({ id: expense.id, categoryTotal: "0.01" }),
      ]),
    );
  });

  it("F10-STS-04/06 denies mismatched, self and foreign allocations without partial writes", async () => {
    const api = finance();
    const [cash, card, income] = await Promise.all([
      api.accounts.create({
        name: "Invalid case cash",
        type: "CASH",
        openingBalance: "10",
      }),
      api.accounts.create({
        name: "Invalid case card",
        type: "LOAN_TAKEN",
        openingBalance: "10",
      }),
      api.accounts.create({ name: "Invalid case income", type: "INCOME" }),
    ]);
    const base = {
      form: "RECEIVE_MONEY",
      sourceAccountId: cash.id,
      totalAmount: "1.00",
      transactionDate: date,
      allocations: [{ kind: "INCOME", accountId: income.id, amount: "1.00" }],
    } as const;
    const post = { ...base, allocations: [...base.allocations] };
    const before = await api.accounts.list();
    const history = await api.transactions.history();
    const allocationCount = await db.allocationLine.count({
      where: { ownerId: ids.userB },
    });
    for (const input of [
      { ...post, allocations: [] },
      { ...post, totalAmount: "1.01" },
      { ...post, totalAmount: "1.001" },
      { ...post, transactionDate: "2026-02-30" },
      {
        ...post,
        allocations: [
          { kind: "INCOME", accountId: income.id, amount: "-1.00" },
        ],
      },
      { ...post, sourceAccountId: card.id },
      {
        ...post,
        allocations: [
          {
            kind: "TRANSFER_TO_CASH",
            accountId: accounts.userBBank,
            amount: "1.00",
          },
        ],
      },
      {
        ...post,
        allocations: [{ kind: "INCOME", accountId: card.id, amount: "1.00" }],
      },
      {
        ...post,
        allocations: [
          { kind: "TRANSFER_FROM_CASH", accountId: cash.id, amount: "1.00" },
        ],
      },
      {
        ...post,
        form: "PAYMENT_CHARGE",
        sourceAccountId: card.id,
        allocations: [
          { kind: "LOAN_TAKEN_REPAYMENT", accountId: card.id, amount: "1.00" },
        ],
      },
      {
        ...post,
        allocations: [
          {
            kind: "TRANSFER_FROM_CASH",
            accountId: accounts.bank,
            amount: "1.00",
          },
        ],
      },
    ] as const) {
      await expectRejectedWithCode(
        api.transactions.create({
          ...input,
          allocations: [...input.allocations],
        }),
        "BAD_REQUEST",
      );
    }
    const mixedForeignCounterpart = {
      ...post,
      totalAmount: "2.00",
      allocations: [
        ...post.allocations,
        {
          kind: "TRANSFER_FROM_CASH" as const,
          accountId: accounts.bank,
          amount: "1.00",
        },
      ],
    };
    await expectRejectedWithCode(
      api.transactions.create(mixedForeignCounterpart),
      "BAD_REQUEST",
    );
    await expectRejectedWithCode(
      api.transactions.create({ ...post, sourceAccountId: accounts.bank }),
      "NOT_FOUND",
    );
    await expectRejectedWithCode(
      api.transactions.create({ ...post, sourceAccountId: "unknown" }),
      "NOT_FOUND",
    );
    await expectRejectedWithCode(
      appRouter
        .createCaller({ db, session: null })
        .finance.transactions.create(mixedForeignCounterpart),
      "UNAUTHORIZED",
    );
    await expectRejectedWithCode(
      administratorCaller().finance.transactions.create(
        mixedForeignCounterpart,
      ),
      "FORBIDDEN",
    );
    expect(await api.accounts.list()).toEqual(before);
    expect(await api.transactions.history()).toEqual(history);
    expect(
      await db.allocationLine.count({ where: { ownerId: ids.userB } }),
    ).toBe(allocationCount);
  });

  it("F10-STS-05 aggregates repeated reductions and permits exact depletion", async () => {
    const api = finance();
    const receiver = await api.accounts.create({
      name: "Limits bank",
      type: "CASH",
      openingBalance: "3.00",
    });
    for (const [type, kind, form] of [
      ["CASH", "TRANSFER_FROM_CASH", "RECEIVE_MONEY"],
      ["LOAN_GIVEN", "LOAN_GIVEN_REPAYMENT", "RECEIVE_MONEY"],
      ["LOAN_TAKEN", "LOAN_TAKEN_REPAYMENT", "PAYMENT_CHARGE"],
    ] as const) {
      const target = await api.accounts.create({
        name: `Limits ${type}`,
        type,
        openingBalance: "1.00",
      });
      const input = {
        form,
        sourceAccountId: receiver.id,
        transactionDate: date,
        totalAmount: "1.01",
        allocations: [
          { kind, accountId: target.id, amount: "0.50" },
          { kind, accountId: target.id, amount: "0.51" },
        ],
      };
      await expectRejectedWithCode(
        api.transactions.create(input),
        "BAD_REQUEST",
      );
      expect(await api.accounts.get({ accountId: target.id })).toMatchObject({
        balance: "1.00",
      });
      await api.transactions.create({
        ...input,
        totalAmount: "1.00",
        allocations: [
          { kind, accountId: target.id, amount: "0.50" },
          { kind, accountId: target.id, amount: "0.50" },
        ],
      });
      expect(await api.accounts.get({ accountId: target.id })).toMatchObject({
        balance: "0.00",
      });
    }
  });

  it("F10-STS-06 prevents concurrent Cash overdrafts and Loan Given overpayments", async () => {
    const api = finance();
    const bank = await api.accounts.create({
      name: "Race receiver",
      type: "CASH",
    });
    for (const [type, kind] of [
      ["CASH", "TRANSFER_FROM_CASH"],
      ["LOAN_GIVEN", "LOAN_GIVEN_REPAYMENT"],
    ] as const) {
      const target = await api.accounts.create({
        name: `Race ${type}`,
        type,
        openingBalance: "1.00",
      });
      const input = {
        form: "RECEIVE_MONEY" as const,
        sourceAccountId: bank.id,
        totalAmount: "0.75",
        transactionDate: date,
        allocations: [{ kind, accountId: target.id, amount: "0.75" }],
      };
      const results = await Promise.allSettled([
        api.transactions.create(input),
        api.transactions.create(input),
      ]);
      expect(results.map(({ status }) => status).sort()).toEqual([
        "fulfilled",
        "rejected",
      ]);
      expect(await api.accounts.get({ accountId: target.id })).toMatchObject({
        balance: "0.25",
      });
      const lines = await db.allocationLine.count({
        where: { accountId: target.id, ownerId: ids.userB },
      });
      expect(lines).toBe(1);
    }
    expect(await api.accounts.get({ accountId: bank.id })).toMatchObject({
      balance: "1.50",
    });
  });
});

describe("FEAT-11 history filters", () => {
  const api = caller(ids.historyUser).finance;
  async function prepareHistory() {
    const [bank, wallet, income, expense, card] = await Promise.all([
      api.accounts.create({ name: "Primary bank", type: "CASH" }),
      api.accounts.create({
        name: "Primary bank",
        type: "CASH",
        openingBalance: "100.00",
      }),
      api.accounts.create({ name: "Consulting", type: "INCOME" }),
      api.accounts.create({ name: "Gear", type: "EXPENSE" }),
      api.accounts.create({ name: "Travel card", type: "LOAN_TAKEN" }),
    ]);
    const before = await api.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: bank.id,
      totalAmount: "1.00",
      transactionDate: "2024-02-28",
      description: "Promo 50XXx",
      allocations: [{ kind: "INCOME", accountId: income.id, amount: "1.00" }],
    });
    const leap = await api.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: bank.id,
      totalAmount: "3.00",
      transactionDate: "2024-02-29",
      description: "Leap promo 50%_\\X",
      allocations: [
        { kind: "INCOME", accountId: income.id, amount: "1.00" },
        { kind: "TRANSFER_FROM_CASH", accountId: wallet.id, amount: "2.00" },
      ],
    });
    const charge = await api.transactions.create({
      form: "PAYMENT_CHARGE",
      sourceAccountId: card.id,
      totalAmount: "1.00",
      transactionDate: "2024-02-29",
      description: "Trip gear",
      allocations: [{ kind: "EXPENSE", accountId: expense.id, amount: "1.00" }],
    });
    const middle = await api.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: bank.id,
      totalAmount: "1.00",
      transactionDate: "2024-03-01",
      description: "March receipt",
      allocations: [{ kind: "INCOME", accountId: income.id, amount: "1.00" }],
    });
    const after = await api.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: bank.id,
      totalAmount: "1.00",
      transactionDate: "2024-03-02",
      description: "Later receipt",
      allocations: [{ kind: "INCOME", accountId: income.id, amount: "1.00" }],
    });
    await db.financialTransaction.updateMany({
      where: { ownerId: ids.historyUser, id: { in: [leap.id, charge.id] } },
      data: { createdAt: new Date("2026-11-27T00:00:00.000Z") },
    });
    const foreign = await caller(ids.userB).finance.transactions.create({
      form: "RECEIVE_MONEY",
      sourceAccountId: accounts.userBBank,
      totalAmount: "1.00",
      transactionDate: "2024-02-29",
      description: "Foreign private history marker",
      allocations: [
        {
          kind: "INCOME",
          accountId: (
            await caller(ids.userB).finance.accounts.create({
              name: "Consulting",
              type: "INCOME",
            })
          ).id,
          amount: "1.00",
        },
      ],
    });
    return {
      bank,
      wallet,
      income,
      expense,
      card,
      before,
      leap,
      charge,
      middle,
      after,
      foreign,
    };
  }
  let fixture: Awaited<ReturnType<typeof prepareHistory>>;
  beforeAll(async () => {
    fixture = await prepareHistory();
  });

  it("F11-STS-01 preserves unfiltered history and sorts exact date ties by ID", async () => {
    const { before, leap, charge, middle, after } = fixture;
    const tied = [leap.id, charge.id].sort().reverse();
    const results = await api.transactions.history();
    expect(results.map(({ id }) => id)).toEqual([
      after.id,
      middle.id,
      ...tied,
      before.id,
    ]);
    expect(await api.transactions.history({})).toEqual(results);
    expect(await api.transactions.history({ search: " \t " })).toEqual(results);
  });

  it("F11-STS-02 applies inclusive calendar bounds and supports leap-day and one-sided ranges", async () => {
    const { before, leap, charge, middle, after } = fixture;
    const idsIn = async (range: { fromDate?: string; toDate?: string }) =>
      (await api.transactions.history(range)).map(({ id }) => id);
    const tied = [leap.id, charge.id].sort().reverse();
    expect(
      await idsIn({ fromDate: "2024-02-29", toDate: "2024-03-01" }),
    ).toEqual([middle.id, ...tied]);
    expect(
      await idsIn({ fromDate: "2024-02-29", toDate: "2024-02-29" }),
    ).toEqual(tied);
    expect(await idsIn({ fromDate: "2024-03-01" })).toEqual([
      after.id,
      middle.id,
    ]);
    expect(await idsIn({ toDate: "2024-02-29" })).toEqual([...tied, before.id]);
  });

  it("F11-STS-03 searches literal text and current account names without duplicating rows", async () => {
    const { leap, charge, wallet, expense } = fixture;
    const literal = await api.transactions.history({ search: "  50%_\\x  " });
    expect(literal.map(({ id }) => id)).toEqual([leap.id]);
    expect(literal[0]?.allocations).toHaveLength(2);

    const nameMatches = await api.transactions.history({
      search: "PRIMARY BANK",
    });
    expect(
      nameMatches.map(({ id }) => id).filter((id) => id === leap.id),
    ).toHaveLength(1);
    expect(nameMatches.some(({ id }) => id === charge.id)).toBe(false);
    expect(
      (await api.transactions.history({ accountId: wallet.id })).map(
        ({ id }) => id,
      ),
    ).toEqual([leap.id]);

    await api.accounts.rename({
      accountId: expense.id,
      name: "Outdoor equipment",
    });
    expect(
      (await api.transactions.history({ search: "OUTDOOR" })).map(
        ({ id }) => id,
      ),
    ).toEqual([charge.id]);
  });

  it("F11-STS-04 composes every filter and returns no results for valid nonmatches", async () => {
    const { leap, bank } = fixture;
    const input = {
      form: "RECEIVE_MONEY" as const,
      accountId: bank.id,
      search: "LEAP",
      fromDate: "2024-02-29",
      toDate: "2024-03-01",
    };
    expect((await api.transactions.history(input)).map(({ id }) => id)).toEqual(
      [leap.id],
    );
    expect(
      await api.transactions.history({ ...input, form: "PAYMENT_CHARGE" }),
    ).toEqual([]);
    expect(
      await api.transactions.history({
        ...input,
        search: "No such description",
      }),
    ).toEqual([]);
  });

  it("F11-STS-05 rejects invalid filters and preserves history and summary", async () => {
    const history = await api.transactions.history();
    const summary = await api.summary.get();
    for (const input of [
      { fromDate: "2024-03-01", toDate: "2024-02-29" },
      { fromDate: "2025-02-29" },
      { toDate: "2024-02-29T00:00:00Z" },
      { accountId: "" },
      { form: "TRANSFER" as "RECEIVE_MONEY" },
    ]) {
      await expectRejectedWithCode(
        api.transactions.history(input),
        "BAD_REQUEST",
      );
    }
    expect(await api.transactions.history()).toEqual(history);
    expect(await api.summary.get()).toEqual(summary);
  });

  it("F11-STS-06 protects owner data for filtered queries, including unknown and foreign account IDs", async () => {
    const filter = {
      search: "Consulting",
      fromDate: "2024-02-29",
      toDate: "2024-02-29",
    };
    const recs = await api.transactions.history(filter);
    expect(recs.map(({ id }) => id)).toEqual([fixture.leap.id]);
    expect(recs.some(({ id }) => id === fixture.foreign.id)).toBe(false);
    expect(
      await api.transactions.history({ search: "Foreign private" }),
    ).toEqual([]);
    expect(
      await api.transactions.history({ accountId: accounts.userBBank }),
    ).toEqual([]);
    expect(
      await api.transactions.history({ accountId: "unknown-account" }),
    ).toEqual([]);
    await expectRejectedWithCode(
      appRouter
        .createCaller({ db, session: null })
        .finance.transactions.history(filter),
      "UNAUTHORIZED",
    );
    await expectRejectedWithCode(
      administratorCaller().finance.transactions.history(filter),
      "FORBIDDEN",
    );
  });
});
