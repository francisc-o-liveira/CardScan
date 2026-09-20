import { execSync } from "node:child_process";
import path from "node:path";
import { TEST_DATABASE_URL } from "./constants";

/** Creates the test database if needed and applies all migrations to it. */
export default function setup() {
  const schema = path.resolve(__dirname, "../../../prisma/schema.prisma");
  try {
    execSync(`pnpm exec prisma migrate deploy --schema="${schema}"`, {
      cwd: path.resolve(__dirname, "../../.."),
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });
  } catch (error) {
    const output = error instanceof Error && "stderr" in error ? String((error as { stderr: unknown }).stderr) : "";
    throw new Error(
      `Could not prepare the test database (${TEST_DATABASE_URL}). Is Postgres running (pnpm docker:up)?\n${output}`,
    );
  }
}
