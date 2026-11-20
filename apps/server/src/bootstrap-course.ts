import { createPrismaClient } from "@Pockit/db";

import { bootstrapCourseUser } from "./bootstrap-course-data";

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.POCKIT_BOOTSTRAP_PASSWORD;
if (!databaseUrl || !password) {
  throw new Error(
    "Course bootstrap requires DATABASE_URL and POCKIT_BOOTSTRAP_PASSWORD from Secret Manager.",
  );
}

const db = createPrismaClient({ DATABASE_URL: databaseUrl });
try {
  const result = await bootstrapCourseUser(db, password);
  console.info(
    result.created
      ? "Created the course User and financial accounts."
      : "Course User already exists; credentials and finance data were preserved.",
  );
} finally {
  await db.$disconnect();
}
