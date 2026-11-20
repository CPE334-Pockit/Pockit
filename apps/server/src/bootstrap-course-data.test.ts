import { createAuth } from "@Pockit/auth";
import { createPrismaClient } from "@Pockit/db";
import { afterAll, beforeAll, expect, it } from "bun:test";
import {
  bootstrapCourseUser,
  COURSE_FINANCIAL_ACCOUNTS,
  COURSE_USER,
} from "./bootstrap-course-data";

const databaseUrl = Bun.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must point to a disposable PostgreSQL test database.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
const auth = createAuth(
  {
    BETTER_AUTH_URL: "http://localhost:3000",
    BETTER_AUTH_SECRET: "test-only-course-bootstrap-secret-value",
    CORS_ORIGIN: "http://localhost:3001",
  },
  db,
);

const signIn = (password: string) =>
  auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3001",
      },
      body: JSON.stringify({ email: COURSE_USER.email, password }),
    }),
  );

async function clearCourseFixture() {
  await db.financialTransaction.deleteMany({
    where: { ownerId: COURSE_USER.id },
  });
  await db.financialAccount.deleteMany({ where: { ownerId: COURSE_USER.id } });
  await db.account.deleteMany({ where: { userId: COURSE_USER.id } });
  await db.user.deleteMany({ where: { id: COURSE_USER.id } });
}

beforeAll(clearCourseFixture);
afterAll(async () => {
  await clearCourseFixture();
  await db.$disconnect();
});

it("provisions one course User without replacing credentials or finance data on repeat", async () => {
  expect(await bootstrapCourseUser(db, "course-bootstrap-password-1")).toEqual({
    created: true,
  });
  const user = await db.user.findUniqueOrThrow({
    where: { id: COURSE_USER.id },
  });
  expect(user).toMatchObject({
    email: COURSE_USER.email,
    role: "User",
    isEnabled: true,
  });
  const credential = await db.account.findFirstOrThrow({
    where: { userId: COURSE_USER.id, providerId: "credential" },
  });
  expect(credential.password).toBeTruthy();
  expect(credential.password).not.toBe("course-bootstrap-password-1");
  expect((await signIn("course-bootstrap-password-1")).status).toBe(200);
  expect(
    await db.financialAccount.count({ where: { ownerId: COURSE_USER.id } }),
  ).toBe(COURSE_FINANCIAL_ACCOUNTS.length);

  const bank = COURSE_FINANCIAL_ACCOUNTS[0];
  await db.financialAccount.update({
    where: { id: bank.id },
    data: { openingBalanceMinorUnits: "123400" },
  });
  expect(await bootstrapCourseUser(db, "course-bootstrap-password-2")).toEqual({
    created: false,
  });
  expect(
    (await db.account.findUniqueOrThrow({ where: { id: credential.id } }))
      .password,
  ).toBe(credential.password);
  expect(
    (await db.financialAccount.findUniqueOrThrow({ where: { id: bank.id } }))
      .openingBalanceMinorUnits,
  ).toBe("123400");
  expect((await signIn("course-bootstrap-password-1")).status).toBe(200);
  expect(
    (await signIn("course-bootstrap-password-2")).status,
  ).toBeGreaterThanOrEqual(400);
});

it("rejects a too-short bootstrap password", async () => {
  await expect(bootstrapCourseUser(db, "short")).rejects.toThrow(
    "at least 16 characters",
  );
});
