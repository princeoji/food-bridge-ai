import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test(
  "database migrations enforce account, donation, and contact permissions",
  { timeout: 60000 },
  async (t) => {
    const db = new PGlite();
    try {
      await db.exec(
        await readFile(new URL("../supabase/tests/bootstrap.sql", import.meta.url), "utf8"),
      );
      const directory = new URL("../supabase/migrations/", import.meta.url);
      const migrations = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
      let assertions = 0;
      for (const file of migrations) {
        try {
          await db.exec(await readFile(new URL(file, directory), "utf8"));
        } catch (cause) {
          throw new Error("Migration failed: " + file, { cause });
        }
        const suiteName = file.includes("secure_core_workflows")
          ? "core_workflows.sql"
          : file.includes("volunteer_delivery_workflow")
            ? "volunteer_deliveries.sql"
            : null;
        if (suiteName) {
          const suite = await readFile(
            new URL("../supabase/tests/" + suiteName, import.meta.url),
            "utf8",
          );
          await db.exec(suite);
          assertions += (suite.match(/select pg_temp\.assert_/g) ?? []).length;
        }
      }
      t.diagnostic(
        migrations.length +
          " migrations applied; " +
          assertions +
          " SQL assertions passed in isolated PostgreSQL.",
      );
    } finally {
      await db.close();
    }
  },
);
