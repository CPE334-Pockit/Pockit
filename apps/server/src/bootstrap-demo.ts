import { createPrismaClient } from "@Pockit/db";

import { bootstrapDemoUsers } from "./bootstrap-demo-data";

if (process.env.POCKIT_DEMO_BOOTSTRAP !== "1") {
  throw new Error(
    "Demo bootstrap requires an explicit POCKIT_DEMO_BOOTSTRAP=1.",
  );
}

const databaseUrl = process.env.DATABASE_URL;
const user = process.env.POCKIT_DEMO_USER_PASSWORD;
const secondUser = process.env.POCKIT_DEMO_USER2_PASSWORD;
const administrator = process.env.POCKIT_DEMO_ADMIN_PASSWORD;
if (!databaseUrl || !user || !secondUser || !administrator) {
  throw new Error(
    "Demo bootstrap requires DATABASE_URL and three secret passwords.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
try {
  const result = await bootstrapDemoUsers(db, {
    user,
    secondUser,
    administrator,
  });
  console.info(
    `Verified three reserved demo identities; ${result.created} created, ${3 - result.created} preserved.`,
  );
} finally {
  await db.$disconnect();
}
