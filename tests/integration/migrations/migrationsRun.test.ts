import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createTempMigrationsFolder,
  environmentId,
  readExecutionLog,
  readStatus,
  removeTempMigrationsFolder,
  resetLog,
  run,
  type TempMigrationsFolder,
  writeMigration,
} from "./utils/migrationTestUtils.ts";

let tmp: TempMigrationsFolder;

beforeEach(() => {
  tmp = createTempMigrationsFolder();
});

afterEach(() => {
  removeTempMigrationsFolder(tmp.folder);
});

describe("migrations run", () => {
  it("runs all migrations in ascending order and records their status", async () => {
    // Deliberately created out of order to prove ordering happens at run time.
    writeMigration(tmp, "migration_c", 3);
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2);

    await run(tmp, { all: true });

    expect(readExecutionLog(tmp.logPath)).toEqual([
      "migration_a:run",
      "migration_b:run",
      "migration_c:run",
    ]);

    const environmentStatus = readStatus(tmp.folder)[environmentId] ?? [];
    expect(
      environmentStatus.map((s) => ({ name: s.name, success: s.success, op: s.lastOperation })),
    ).toEqual([
      { name: "migration_a.js", success: true, op: "run" },
      { name: "migration_b.js", success: true, op: "run" },
      { name: "migration_c.js", success: true, op: "run" },
    ]);
  });

  it("rolls migrations back in descending order", async () => {
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2);
    writeMigration(tmp, "migration_c", 3);

    await run(tmp, { all: true });
    resetLog(tmp.logPath);

    await run(tmp, { all: true }, { rollback: true });

    expect(readExecutionLog(tmp.logPath)).toEqual([
      "migration_c:rollback",
      "migration_b:rollback",
      "migration_a:rollback",
    ]);

    const environmentStatus = readStatus(tmp.folder)[environmentId] ?? [];
    expect(environmentStatus.every((s) => s.lastOperation === "rollback")).toBe(true);
  });

  it("skips migrations that already ran on a subsequent run", async () => {
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2);

    await run(tmp, { all: true });
    resetLog(tmp.logPath);

    writeMigration(tmp, "migration_c", 3);

    await run(tmp, { all: true });

    expect(readExecutionLog(tmp.logPath)).toEqual(["migration_c:run"]);
  });

  it("runs only the next N migrations when using the `next` filter", async () => {
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2);
    writeMigration(tmp, "migration_c", 3);

    await run(tmp, { next: 2 });

    expect(readExecutionLog(tmp.logPath)).toEqual(["migration_a:run", "migration_b:run"]);
  });

  it("records a failed migration and keeps going with continueOnError", async () => {
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2, { run: 'throw new Error("boom");' });
    writeMigration(tmp, "migration_c", 3);

    await run(tmp, { all: true }, { continueOnError: true });

    // The failing migration ran, and the later one still executed.
    expect(readExecutionLog(tmp.logPath)).toEqual([
      "migration_a:run",
      "migration_b:run",
      "migration_c:run",
    ]);

    const statusByName = new Map(
      readStatus(tmp.folder)[environmentId]?.map((s) => [s.name, s.success]),
    );
    expect(statusByName.get("migration_a.js")).toBe(true);
    expect(statusByName.get("migration_b.js")).toBe(false);
    expect(statusByName.get("migration_c.js")).toBe(true);
  });
});
