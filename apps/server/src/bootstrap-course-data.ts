import type { Database } from "@Pockit/db";
import { hashPassword } from "better-auth/crypto";

// A fixed synthetic identity for the course deployment. The password comes
// only from Secret Manager when the one-time bootstrap job runs.
export const COURSE_USER = {
  id: "pockit-course-user",
  name: "Pockit Course User",
  email: "course.user@pockit.test",
  role: "User",
} as const;

export const COURSE_FINANCIAL_ACCOUNTS = [
  { id: "pockit-course-bank", name: "Main bank", type: "CASH" },
  { id: "pockit-course-card", name: "Credit card", type: "LOAN_TAKEN" },
  { id: "pockit-course-salary", name: "Salary", type: "INCOME" },
  { id: "pockit-course-dining", name: "Dining", type: "EXPENSE" },
  { id: "pockit-course-groceries", name: "Groceries", type: "EXPENSE" },
] as const;

export async function bootstrapCourseUser(db: Database, password: string) {
  if (password.length < 16) {
    throw new Error(
      "Course bootstrap password must contain at least 16 characters.",
    );
  }

  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { id: COURSE_USER.id },
    });
    if (existing) {
      if (existing.email !== COURSE_USER.email || existing.role !== "User") {
        throw new Error(
          "Reserved course identity conflicts with an existing User.",
        );
      }
      const credentials = await tx.account.findMany({
        where: { userId: COURSE_USER.id, providerId: "credential" },
      });
      if (
        credentials.length !== 1 ||
        credentials[0]?.accountId !== COURSE_USER.id ||
        !credentials[0]?.password
      ) {
        throw new Error("Reserved course identity has invalid credentials.");
      }
      const accounts = await tx.financialAccount.findMany({
        where: { ownerId: COURSE_USER.id },
        select: { id: true, name: true, type: true, currencyCode: true },
      });
      if (
        COURSE_FINANCIAL_ACCOUNTS.some(
          (expected) =>
            !accounts.some(
              (actual) =>
                actual.id === expected.id &&
                actual.name === expected.name &&
                actual.type === expected.type &&
                actual.currencyCode === "THB",
            ),
        )
      ) {
        throw new Error(
          "Reserved course financial accounts are incomplete or changed.",
        );
      }
      return { created: false };
    }

    await tx.user.create({ data: { ...COURSE_USER, emailVerified: true } });
    await tx.account.create({
      data: {
        id: `pockit-course-credential-${COURSE_USER.id}`,
        accountId: COURSE_USER.id,
        providerId: "credential",
        userId: COURSE_USER.id,
        password: passwordHash,
      },
    });
    await tx.financialAccount.createMany({
      data: COURSE_FINANCIAL_ACCOUNTS.map((account) => ({
        ...account,
        ownerId: COURSE_USER.id,
        currencyCode: "THB",
      })),
    });
    return { created: true };
  });
}
