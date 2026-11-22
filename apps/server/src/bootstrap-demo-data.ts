import type { Database } from "@Pockit/db";
import { hashPassword } from "better-auth/crypto";

import {
  DEMO_ADMIN,
  DEMO_FINANCIAL_ACCOUNTS,
  DEMO_SECOND_USER,
  DEMO_USER,
} from "./seed-data";

type DemoPasswords = {
  user: string;
  secondUser: string;
  administrator: string;
};

const identities = [
  { user: DEMO_USER, passwordKey: "user" },
  { user: DEMO_SECOND_USER, passwordKey: "secondUser" },
  { user: DEMO_ADMIN, passwordKey: "administrator" },
] as const;

export async function bootstrapDemoUsers(
  db: Database,
  passwords: DemoPasswords,
) {
  const values = Object.values(passwords);
  if (values.some((value) => value.length < 16)) {
    throw new Error(
      "Demo bootstrap passwords must contain at least 16 characters.",
    );
  }
  if (new Set(values).size !== identities.length) {
    throw new Error("Demo bootstrap passwords must be distinct.");
  }

  return db.$transaction(async (tx) => {
    let created = 0;
    for (const { user, passwordKey } of identities) {
      const existing = await tx.user.findUnique({ where: { id: user.id } });
      const emailOwner = await tx.user.findUnique({
        where: { email: user.email },
      });
      if (
        (existing &&
          (existing.email !== user.email || existing.role !== user.role)) ||
        (emailOwner && emailOwner.id !== user.id)
      ) {
        throw new Error(`Reserved demo identity conflict for ${user.id}.`);
      }

      const expectedAccounts = DEMO_FINANCIAL_ACCOUNTS.filter(
        (account) => account.ownerId === user.id,
      );
      if (existing) {
        const credentials = await tx.account.findMany({
          where: { userId: user.id, providerId: "credential" },
        });
        if (
          credentials.length !== 1 ||
          credentials[0]?.accountId !== user.id ||
          !credentials[0]?.password
        ) {
          throw new Error(
            `Reserved demo credentials are invalid for ${user.id}.`,
          );
        }
        const ownedAccounts = await tx.financialAccount.findMany({
          where: { ownerId: user.id },
          select: { id: true, name: true, type: true, currencyCode: true },
        });
        if (
          (user.role === "Administrator" && ownedAccounts.length !== 0) ||
          expectedAccounts.some(
            (expected) =>
              !ownedAccounts.some(
                (actual) =>
                  actual.id === expected.id &&
                  actual.name === expected.name &&
                  actual.type === expected.type &&
                  actual.currencyCode === expected.currencyCode,
              ),
          )
        ) {
          throw new Error(
            `Reserved demo finance accounts conflict for ${user.id}.`,
          );
        }
        continue;
      }

      await tx.user.create({ data: { ...user, emailVerified: true } });
      await tx.account.create({
        data: {
          id: `pockit-demo-credential-${user.id}`,
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: await hashPassword(passwords[passwordKey]),
        },
      });
      if (expectedAccounts.length > 0) {
        await tx.financialAccount.createMany({ data: expectedAccounts });
      }
      created += 1;
    }
    return { created };
  });
}
