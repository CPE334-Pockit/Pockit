import { Prisma } from "@Pockit/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import {
  allocationKinds,
  allocationRules,
  hasRepeatedExpenseAccount,
} from "../finance/allocations";
import {
  formatCalendarDate,
  formatMinorUnits,
  parseCalendarDate,
  parseMoneyToMinorUnits,
} from "../finance/value";
import { router, userProcedure } from "../index";

const accountIdSchema = z.string().min(1);
const accountLookupSchema = z.object({ accountId: accountIdSchema });
const accountNameSchema = z.string().trim().min(1);
const accountCreateSchema = z.object({
  name: accountNameSchema,
  type: z.enum(["CASH", "LOAN_GIVEN", "LOAN_TAKEN", "INCOME", "EXPENSE"]),
  openingBalance: z.string().optional(),
});
const accountRenameSchema = accountLookupSchema.extend({
  name: accountNameSchema,
});
const openingBalanceSchema = z.object({
  accountId: accountIdSchema,
  amount: z.string(),
});
const transactionFormSchema = z.enum(["PAYMENT_CHARGE", "RECEIVE_MONEY"]);
const historyFilterSchema = z
  .object({
    search: z.string().trim().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    form: transactionFormSchema.optional(),
    accountId: z.string().trim().min(1).optional(),
  })
  .optional();
const transactionSchema = z.object({
  form: transactionFormSchema,
  sourceAccountId: accountIdSchema,
  totalAmount: z.string(),
  transactionDate: z.string(),
  description: z.string().optional(),
  allocations: z
    .array(
      z.object({
        kind: z.enum(allocationKinds),
        accountId: accountIdSchema,
        amount: z.string(),
      }),
    )
    .min(1),
});

const correctionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("REPLACE"),
    transactionId: z.string().min(1),
    reason: z.string().trim().min(1),
    replacement: transactionSchema,
  }),
  z
    .object({
      action: z.literal("VOID"),
      transactionId: z.string().min(1),
      reason: z.string().trim().min(1),
    })
    .strict(),
]);

const activeTransaction = {
  correction: null,
} satisfies Prisma.FinancialTransactionWhereInput;
const allocationNames = {
  allocations: { include: { account: { select: { name: true } } } },
} as const;
const accountActivityCounts = {
  _count: { select: { sourceTransactions: true, allocationLines: true } },
} as const;

type AccountRecord = Awaited<
  ReturnType<Prisma.TransactionClient["financialAccount"]["findFirstOrThrow"]>
>;

type DataClient = Prisma.TransactionClient;

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function missingAccount(): never {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Financial Account not found",
  });
}

function amountInMinorUnits(value: string): bigint {
  try {
    return parseMoneyToMinorUnits(value);
  } catch {
    return badRequest(
      "Amount must be a positive THB value with at most two fractional digits",
    );
  }
}

function transactionDate(value: string): Date {
  try {
    return parseCalendarDate(value);
  } catch {
    return badRequest(
      "Transaction date must be a valid YYYY-MM-DD calendar date",
    );
  }
}

function historyWhere(
  ownerId: string,
  input: z.infer<typeof historyFilterSchema>,
): Prisma.FinancialTransactionWhereInput {
  const { search, fromDate, toDate, form, accountId } = input ?? {};
  const from = fromDate === undefined ? undefined : transactionDate(fromDate);
  const to = toDate === undefined ? undefined : transactionDate(toDate);
  if (from && to && from > to) {
    return badRequest("The start date must be on or before the end date");
  }

  const and: Prisma.FinancialTransactionWhereInput[] = [];
  if (search) {
    // Prisma uses ILIKE for contains with insensitive mode on PostgreSQL.
    const name = {
      contains: search.replace(/[\\%_]/g, "\\$&"),
      mode: "insensitive",
    } as const;
    and.push({
      OR: [
        { description: name },
        { sourceAccount: { name } },
        { allocations: { some: { account: { name } } } },
      ],
    });
  }
  if (accountId) {
    and.push({
      OR: [
        { sourceAccountId: accountId },
        { allocations: { some: { accountId } } },
      ],
    });
  }
  return {
    ...activeTransaction,
    ownerId,
    form,
    transactionDate: from || to ? { gte: from, lte: to } : undefined,
    AND: and,
  };
}

function sumMinorUnits(values: string[]): bigint {
  return values.reduce((total, value) => total + BigInt(value), 0n);
}

function isFinancialWriteConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2034" || error.code === "P2003")
  );
}

async function serializable<T>(
  db: Context["db"],
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await db.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (isFinancialWriteConflict(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A concurrent financial update occurred; retry the operation",
        cause: error,
      });
    }
    throw error;
  }
}

async function findOwnedAccount(
  client: DataClient,
  ownerId: string,
  accountId: string,
) {
  const account = await client.financialAccount.findFirst({
    where: { id: accountId, ownerId },
  });
  if (!account) {
    return missingAccount();
  }
  return account;
}

function canHaveOpeningBalance(type: AccountRecord["type"]) {
  return type === "CASH" || type === "LOAN_GIVEN" || type === "LOAN_TAKEN";
}

async function hasAccountActivity(
  client: DataClient,
  account: AccountRecord,
): Promise<boolean> {
  const [source, allocation] = await Promise.all([
    client.financialTransaction.findFirst({
      where: { ownerId: account.ownerId, sourceAccountId: account.id },
      select: { id: true },
    }),
    client.allocationLine.findFirst({
      where: { ownerId: account.ownerId, accountId: account.id },
      select: { id: true },
    }),
  ]);
  return source !== null || allocation !== null;
}

async function accountBalanceMinorUnits(
  client: DataClient,
  account: NonNullable<AccountRecord>,
): Promise<bigint> {
  const opening = BigInt(account.openingBalanceMinorUnits ?? "0");

  if (account.type === "CASH") {
    const [transactions, transfers] = await Promise.all([
      client.financialTransaction.findMany({
        where: {
          ...activeTransaction,
          ownerId: account.ownerId,
          sourceAccountId: account.id,
        },
        select: { form: true, totalMinorUnits: true },
      }),
      client.allocationLine.findMany({
        where: {
          ownerId: account.ownerId,
          accountId: account.id,
          transaction: activeTransaction,
          kind: { in: ["TRANSFER_TO_CASH", "TRANSFER_FROM_CASH"] },
        },
        select: { kind: true, amountMinorUnits: true },
      }),
    ]);
    const selectedBalance = transactions.reduce((balance, transaction) => {
      const amount = BigInt(transaction.totalMinorUnits);
      return transaction.form === "RECEIVE_MONEY"
        ? balance + amount
        : balance - amount;
    }, opening);
    return transfers.reduce((balance, transfer) => {
      const amount = BigInt(transfer.amountMinorUnits);
      return transfer.kind === "TRANSFER_TO_CASH"
        ? balance + amount
        : balance - amount;
    }, selectedBalance);
  }

  if (account.type === "LOAN_TAKEN") {
    const [transactions, allocations] = await Promise.all([
      client.financialTransaction.findMany({
        where: {
          ...activeTransaction,
          ownerId: account.ownerId,
          sourceAccountId: account.id,
        },
        select: { form: true, totalMinorUnits: true },
      }),
      client.allocationLine.findMany({
        where: {
          ownerId: account.ownerId,
          accountId: account.id,
          transaction: activeTransaction,
          kind: { in: ["LOAN_TAKEN_REPAYMENT", "LOAN_TAKEN_BORROWING"] },
        },
        select: { kind: true, amountMinorUnits: true },
      }),
    ]);
    const charges = transactions.reduce(
      (total, transaction) =>
        transaction.form === "PAYMENT_CHARGE"
          ? total + BigInt(transaction.totalMinorUnits)
          : total,
      opening,
    );
    return allocations.reduce((balance, allocation) => {
      const amount = BigInt(allocation.amountMinorUnits);
      return allocation.kind === "LOAN_TAKEN_REPAYMENT"
        ? balance - amount
        : balance + amount;
    }, charges);
  }

  if (account.type === "LOAN_GIVEN") {
    const allocations = await client.allocationLine.findMany({
      where: {
        ownerId: account.ownerId,
        accountId: account.id,
        transaction: activeTransaction,
        kind: { in: ["LOAN_GIVEN_LENDING", "LOAN_GIVEN_REPAYMENT"] },
      },
      select: { kind: true, amountMinorUnits: true },
    });
    return allocations.reduce((balance, allocation) => {
      const amount = BigInt(allocation.amountMinorUnits);
      return allocation.kind === "LOAN_GIVEN_LENDING"
        ? balance + amount
        : balance - amount;
    }, opening);
  }

  return 0n;
}

async function categoryTotalMinorUnits(
  client: DataClient,
  ownerId: string,
  accountId: string,
  kind: "INCOME" | "EXPENSE",
): Promise<bigint> {
  const lines = await client.allocationLine.findMany({
    where: { ownerId, accountId, kind, transaction: activeTransaction },
    select: { amountMinorUnits: true },
  });
  return sumMinorUnits(lines.map(({ amountMinorUnits }) => amountMinorUnits));
}

function serializeAccount(
  account: AccountRecord & {
    _count?: { sourceTransactions: number; allocationLines: number };
  },
  amount: bigint | null,
) {
  const isCategory = account.type === "INCOME" || account.type === "EXPENSE";
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currencyCode: account.currencyCode,
    openingBalance: account.openingBalanceMinorUnits
      ? formatMinorUnits(BigInt(account.openingBalanceMinorUnits))
      : null,
    openingBalanceEligible:
      !isCategory &&
      account.openingBalanceMinorUnits === null &&
      (account._count?.sourceTransactions ?? 0) === 0 &&
      (account._count?.allocationLines ?? 0) === 0,
    balance: isCategory || amount === null ? null : formatMinorUnits(amount),
    categoryTotal:
      !isCategory || amount === null ? null : formatMinorUnits(amount),
  };
}

function serializeTransaction<
  T extends {
    id: string;
    form: string;
    totalMinorUnits: string;
    transactionDate: Date;
    sourceAccountId: string;
    description: string | null;
    allocations: Array<{
      id: string;
      accountId: string;
      kind: string;
      amountMinorUnits: string;
      account?: { name: string };
    }>;
  },
>(transaction: T) {
  return {
    id: transaction.id,
    form: transaction.form,
    totalAmount: formatMinorUnits(BigInt(transaction.totalMinorUnits)),
    transactionDate: formatCalendarDate(transaction.transactionDate),
    sourceAccountId: transaction.sourceAccountId,
    description: transaction.description,
    allocations: transaction.allocations.map((allocation) => ({
      id: allocation.id,
      accountId: allocation.accountId,
      accountName: allocation.account?.name,
      kind: allocation.kind,
      amount: formatMinorUnits(BigInt(allocation.amountMinorUnits)),
    })),
  };
}

function parseTransactionInput(input: z.infer<typeof transactionSchema>) {
  const totalMinorUnits = amountInMinorUnits(input.totalAmount);
  const date = transactionDate(input.transactionDate);
  const allocations = input.allocations.map((allocation) => ({
    ...allocation,
    amountMinorUnits: amountInMinorUnits(allocation.amount),
  }));
  const allocationTotal = allocations.reduce(
    (total, allocation) => total + allocation.amountMinorUnits,
    0n,
  );
  if (allocationTotal !== totalMinorUnits) {
    return badRequest("Allocation amounts must equal the Transaction total");
  }
  return { totalMinorUnits, date, allocations };
}

async function validateTransaction(
  client: DataClient,
  ownerId: string,
  input: z.infer<typeof transactionSchema>,
  parsed: ReturnType<typeof parseTransactionInput>,
) {
  const { totalMinorUnits, allocations } = parsed;
  const source = await findOwnedAccount(client, ownerId, input.sourceAccountId);
  if (
    source.type !== "CASH" &&
    !(input.form === "PAYMENT_CHARGE" && source.type === "LOAN_TAKEN")
  ) {
    return badRequest(
      "This Transaction form is not available for the selected Account type",
    );
  }
  if (source.currencyCode !== "THB") {
    return badRequest("Transactions support THB Accounts only");
  }

  const distinctAccountIds = [
    ...new Set(allocations.map(({ accountId }) => accountId)),
  ];
  const destinations = await client.financialAccount.findMany({
    where: { ownerId, id: { in: distinctAccountIds } },
  });
  const destinationById = new Map(
    destinations.map((account) => [account.id, account]),
  );
  const reductions = new Map<
    string,
    { account: AccountRecord; amount: bigint }
  >();
  if (input.form === "PAYMENT_CHARGE" && source.type === "CASH") {
    reductions.set(source.id, { account: source, amount: totalMinorUnits });
  }

  for (const { accountId, kind, amountMinorUnits } of allocations) {
    const destination = destinationById.get(accountId);
    if (!destination) {
      return badRequest("An allocation Account is unavailable");
    }
    if (destination.id === source.id) {
      return badRequest("Choose a different Account for each allocation");
    }
    if (destination.currencyCode !== "THB") {
      return badRequest("Transactions support THB Accounts only");
    }
    const rule = allocationRules[kind];
    if (rule.form !== input.form || rule.accountType !== destination.type) {
      return badRequest("Allocation type does not match the form and Account");
    }
    if (
      kind === "TRANSFER_FROM_CASH" ||
      kind === "LOAN_TAKEN_REPAYMENT" ||
      kind === "LOAN_GIVEN_REPAYMENT"
    ) {
      reductions.set(accountId, {
        account: destination,
        amount: (reductions.get(accountId)?.amount ?? 0n) + amountMinorUnits,
      });
    }
  }
  if (source.type === "LOAN_TAKEN" && hasRepeatedExpenseAccount(allocations)) {
    return badRequest("Use each expense category only once.");
  }

  return reductions;
}

async function requireAvailableFunds(
  client: DataClient,
  reductions: Iterable<{ account: AccountRecord; amount: bigint }>,
) {
  for (const { account, amount } of reductions) {
    if (amount > (await accountBalanceMinorUnits(client, account))) {
      return badRequest(
        account.type === "CASH"
          ? "Cash outflow cannot exceed the available balance"
          : account.type === "LOAN_GIVEN"
            ? "Loan repayment cannot exceed the outstanding receivable"
            : "Loan repayment cannot exceed outstanding debt",
      );
    }
  }
}

function createTransactionRecord(
  client: DataClient,
  ownerId: string,
  input: z.infer<typeof transactionSchema>,
  parsed: ReturnType<typeof parseTransactionInput>,
) {
  return client.financialTransaction.create({
    data: {
      ownerId,
      form: input.form,
      totalMinorUnits: parsed.totalMinorUnits.toString(),
      transactionDate: parsed.date,
      sourceAccountId: input.sourceAccountId,
      description: input.description,
      allocations: {
        create: parsed.allocations.map((allocation) => ({
          account: {
            connect: { id_ownerId: { id: allocation.accountId, ownerId } },
          },
          kind: allocation.kind,
          amountMinorUnits: allocation.amountMinorUnits.toString(),
        })),
      },
    },
    include: allocationNames,
  });
}

export const financeRouter = router({
  accounts: router({
    create: userProcedure
      .input(accountCreateSchema)
      .mutation(async ({ ctx, input }) => {
        if (
          input.openingBalance !== undefined &&
          !canHaveOpeningBalance(input.type)
        ) {
          return badRequest("Category Accounts cannot have an opening balance");
        }
        const opening =
          input.openingBalance === undefined
            ? null
            : amountInMinorUnits(input.openingBalance);
        const account = await ctx.db.financialAccount.create({
          data: {
            ownerId: ctx.session.user.id,
            name: input.name,
            type: input.type,
            openingBalanceMinorUnits: opening?.toString() ?? null,
          },
        });
        return serializeAccount(account, opening ?? 0n);
      }),
    rename: userProcedure
      .input(accountRenameSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await ctx.db.financialAccount.updateMany({
          where: { id: input.accountId, ownerId: ctx.session.user.id },
          data: { name: input.name },
        });
        if (result.count === 0) {
          return missingAccount();
        }
        return { id: input.accountId, name: input.name };
      }),
    delete: userProcedure
      .input(accountLookupSchema)
      .mutation(({ ctx, input }) =>
        serializable(ctx.db, async (tx) => {
          const account = await findOwnedAccount(
            tx,
            ctx.session.user.id,
            input.accountId,
          );
          if (
            account.openingBalanceMinorUnits !== null ||
            (await hasAccountActivity(tx, account))
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "An Account with an opening balance or activity cannot be deleted",
            });
          }
          await tx.financialAccount.delete({
            where: { id: account.id, ownerId: account.ownerId },
          });
          return { id: account.id };
        }),
      ),
    list: userProcedure.query(async ({ ctx }) =>
      ctx.db.$transaction(
        async (tx) => {
          const ownerId = ctx.session.user.id;
          const accounts = await tx.financialAccount.findMany({
            where: { ownerId },
            include: accountActivityCounts,
            orderBy: [{ type: "asc" }, { name: "asc" }],
          });
          return Promise.all(
            accounts.map(async (account) => {
              const balance =
                account.type === "INCOME"
                  ? await categoryTotalMinorUnits(
                      tx,
                      ownerId,
                      account.id,
                      "INCOME",
                    )
                  : account.type === "EXPENSE"
                    ? await categoryTotalMinorUnits(
                        tx,
                        ownerId,
                        account.id,
                        "EXPENSE",
                      )
                    : await accountBalanceMinorUnits(tx, account);
              return serializeAccount(account, balance);
            }),
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      ),
    ),
    get: userProcedure
      .input(accountLookupSchema)
      .query(async ({ ctx, input }) =>
        ctx.db.$transaction(
          async (tx) => {
            const account = await tx.financialAccount.findFirst({
              where: { id: input.accountId, ownerId: ctx.session.user.id },
              include: accountActivityCounts,
            });
            if (!account) {
              return missingAccount();
            }
            const balance =
              account.type === "INCOME"
                ? await categoryTotalMinorUnits(
                    tx,
                    ctx.session.user.id,
                    account.id,
                    "INCOME",
                  )
                : account.type === "EXPENSE"
                  ? await categoryTotalMinorUnits(
                      tx,
                      ctx.session.user.id,
                      account.id,
                      "EXPENSE",
                    )
                  : await accountBalanceMinorUnits(tx, account);
            return serializeAccount(account, balance);
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
        ),
      ),
    setOpeningBalance: userProcedure
      .input(openingBalanceSchema)
      .mutation(async ({ ctx, input }) => {
        const amountMinorUnits = amountInMinorUnits(input.amount);
        return serializable(ctx.db, async (tx) => {
          const account = await findOwnedAccount(
            tx,
            ctx.session.user.id,
            input.accountId,
          );
          if (!canHaveOpeningBalance(account.type)) {
            return badRequest(
              "Category Accounts cannot have an opening balance",
            );
          }
          if (account.openingBalanceMinorUnits !== null) {
            return badRequest("The opening balance has already been recorded");
          }
          if (await hasAccountActivity(tx, account)) {
            return badRequest(
              "An opening balance cannot be changed after financial activity",
            );
          }
          const updated = await tx.financialAccount.update({
            where: { id: account.id, ownerId: account.ownerId },
            data: { openingBalanceMinorUnits: amountMinorUnits.toString() },
          });
          return serializeAccount(updated, amountMinorUnits);
        });
      }),
  }),
  transactions: router({
    create: userProcedure
      .input(transactionSchema)
      .mutation(async ({ ctx, input }) => {
        const parsed = parseTransactionInput(input);
        return serializable(ctx.db, async (tx) => {
          const ownerId = ctx.session.user.id;
          const reductions = await validateTransaction(
            tx,
            ownerId,
            input,
            parsed,
          );
          await requireAvailableFunds(tx, reductions.values());
          return serializeTransaction(
            await createTransactionRecord(tx, ownerId, input, parsed),
          );
        });
      }),
    correct: userProcedure.input(correctionSchema).mutation(({ ctx, input }) =>
      serializable(ctx.db, async (tx) => {
        const ownerId = ctx.session.user.id;
        const original = await tx.financialTransaction.findFirst({
          where: { id: input.transactionId, ownerId },
          include: {
            correction: { select: { id: true } },
            allocations: { select: { accountId: true } },
          },
        });
        if (!original) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Transaction not found",
          });
        }
        if (original.correction) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This Transaction has already been corrected",
          });
        }

        let replacementId: string | null = null;
        const affectedIds = new Set([
          original.sourceAccountId,
          ...original.allocations.map(({ accountId }) => accountId),
        ]);
        if (input.action === "REPLACE") {
          const parsed = parseTransactionInput(input.replacement);
          try {
            await validateTransaction(tx, ownerId, input.replacement, parsed);
          } catch (error) {
            if (error instanceof TRPCError && error.code === "NOT_FOUND") {
              return badRequest("A replacement Account is unavailable");
            }
            throw error;
          }
          const replacement = await createTransactionRecord(
            tx,
            ownerId,
            input.replacement,
            parsed,
          );
          replacementId = replacement.id;
          affectedIds.add(replacement.sourceAccountId);
          for (const { accountId } of replacement.allocations) {
            affectedIds.add(accountId);
          }
        }
        let correction: { id: string; replacementId: string | null };
        try {
          correction = await tx.financialTransactionCorrection.create({
            data: {
              ownerId,
              originalId: original.id,
              replacementId,
              action: input.action,
              reason: input.reason,
            },
            select: { id: true, replacementId: true },
          });
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "P2002"
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "This Transaction has already been corrected",
              cause: error,
            });
          }
          throw error;
        }

        // The projected ledger already contains both changes inside this transaction.
        const affected = await tx.financialAccount.findMany({
          where: {
            ownerId,
            id: { in: [...affectedIds] },
            type: { in: ["CASH", "LOAN_GIVEN", "LOAN_TAKEN"] },
          },
        });
        for (const account of affected) {
          if ((await accountBalanceMinorUnits(tx, account)) < 0n) {
            return badRequest(
              "Correction would leave an Account with a negative balance",
            );
          }
        }
        return correction;
      }),
    ),
    correctionHistory: userProcedure.query(async ({ ctx }) => {
      const entries = await ctx.db.financialTransactionCorrection.findMany({
        where: { ownerId: ctx.session.user.id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          original: { include: allocationNames },
          replacement: { include: allocationNames },
        },
      });
      return entries.map((entry) => ({
        id: entry.id,
        actorId: entry.ownerId,
        action: entry.action,
        reason: entry.reason,
        recordedAt: entry.createdAt.toISOString(),
        original: serializeTransaction(entry.original),
        replacement: entry.replacement
          ? serializeTransaction(entry.replacement)
          : null,
      }));
    }),
    history: userProcedure
      .input(historyFilterSchema)
      .query(async ({ ctx, input }) => {
        const transactions = await ctx.db.financialTransaction.findMany({
          where: historyWhere(ctx.session.user.id, input),
          orderBy: [
            { transactionDate: "desc" },
            { createdAt: "desc" },
            { id: "desc" },
          ],
          include: allocationNames,
        });
        return transactions.map(serializeTransaction);
      }),
  }),
  summary: router({
    get: userProcedure.query(async ({ ctx }) =>
      ctx.db.$transaction(
        async (tx) => {
          const ownerId = ctx.session.user.id;
          const accounts = await tx.financialAccount.findMany({
            where: { ownerId },
            orderBy: [{ type: "asc" }, { name: "asc" }],
          });
          const [incomeLines, expenseLines] = await Promise.all([
            tx.allocationLine.findMany({
              where: {
                ownerId,
                kind: "INCOME",
                transaction: activeTransaction,
              },
              select: { amountMinorUnits: true },
            }),
            tx.allocationLine.findMany({
              where: {
                ownerId,
                kind: "EXPENSE",
                transaction: activeTransaction,
              },
              select: { amountMinorUnits: true },
            }),
          ]);
          const categories = await Promise.all(
            accounts
              .filter(
                (account) =>
                  account.type === "INCOME" || account.type === "EXPENSE",
              )
              .map(async (account) => ({
                accountId: account.id,
                accountName: account.name,
                type: account.type,
                total: formatMinorUnits(
                  await categoryTotalMinorUnits(
                    tx,
                    ownerId,
                    account.id,
                    account.type === "INCOME" ? "INCOME" : "EXPENSE",
                  ),
                ),
              })),
          );
          const balances = await Promise.all(
            accounts
              .filter(
                (account) =>
                  account.type === "CASH" ||
                  account.type === "LOAN_GIVEN" ||
                  account.type === "LOAN_TAKEN",
              )
              .map(async (account) => ({
                accountId: account.id,
                accountName: account.name,
                type: account.type,
                balance: formatMinorUnits(
                  await accountBalanceMinorUnits(tx, account),
                ),
              })),
          );
          return {
            incomeTotal: formatMinorUnits(
              sumMinorUnits(
                incomeLines.map(({ amountMinorUnits }) => amountMinorUnits),
              ),
            ),
            expenseTotal: formatMinorUnits(
              sumMinorUnits(
                expenseLines.map(({ amountMinorUnits }) => amountMinorUnits),
              ),
            ),
            balances,
            categories,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
      ),
    ),
  }),
});
