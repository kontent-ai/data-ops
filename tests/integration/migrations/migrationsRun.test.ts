import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Status } from "../../../src/modules/migrations/models/status.ts";
import {
  type RunMigrationFilterParams,
  runMigrations,
} from "../../../src/modules/migrations/run.ts";

const environmentId = "00000000-0000-0000-0000-000000000000";

// Each test gets its own temp folder so dynamically-imported migration modules
// never collide in Node's module cache between tests.
let folder: string;
let logPath: string;

beforeEach(() => {
  folder = fs.mkdtempSync(path.join(os.tmpdir(), "dataops-migrations-"));
  logPath = path.join(folder, "execution.log");
  // Make the folder a self-contained ESM package so `.js` mock migrations are
  // loaded as ES modules, exactly like a real user's migrations project.
  fs.writeFileSync(path.join(folder, "package.json"), JSON.stringify({ type: "module" }));
});

afterEach(() => {
  fs.rmSync(folder, { recursive: true, force: true });
});

type CustomCode = Readonly<{ run?: string; rollback?: string }>;

/**
 * Writes a mock migration file. By default each operation only records that it
 * ran (and with which operation) by appending to a shared log file, so the flow
 * stays offline and never touches the injected management client. Extra
 * statements can be injected into the `run`/`rollback` bodies via `customCode`,
 * e.g. to make an operation throw.
 */
const writeMigration = (name: string, order: number, customCode: CustomCode = {}): void => {
  const content = `import { appendFileSync } from "node:fs";
const LOG = ${JSON.stringify(logPath)};
export default {
  order: ${order},
  run: async () => {
    appendFileSync(LOG, ${JSON.stringify(`${name}:run`)} + "\\n");
    ${customCode.run ?? ""}
  },
  rollback: async () => {
    appendFileSync(LOG, ${JSON.stringify(`${name}:rollback`)} + "\\n");
    ${customCode.rollback ?? ""}
  },
};
`;
  fs.writeFileSync(path.join(folder, `${name}.js`), content);
};

const run = async (filter: RunMigrationFilterParams, rollback = false): Promise<void> =>
  runMigrations({
    environmentId,
    apiKey: "dummy-api-key",
    migrationsFolder: folder,
    rollback,
    logLevel: "none",
    ...filter,
  });

const readExecutionLog = (): ReadonlyArray<string> =>
  fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean) : [];

// Clears the execution log so a subsequent run/rollback can be asserted in isolation.
const resetLog = (): void => fs.writeFileSync(logPath, "");

const readStatus = (): Status =>
  JSON.parse(fs.readFileSync(path.join(folder, "status.json"), "utf8")) as Status;

describe("migrations run", () => {
  it("runs all migrations in ascending order and records their status", async () => {
    // Deliberately created out of order to prove ordering happens at run time.
    writeMigration("migration_c", 3);
    writeMigration("migration_a", 1);
    writeMigration("migration_b", 2);

    await run({ all: true });

    expect(readExecutionLog()).toEqual(["migration_a:run", "migration_b:run", "migration_c:run"]);

    const environmentStatus = readStatus()[environmentId] ?? [];
    expect(
      environmentStatus.map((s) => ({ name: s.name, success: s.success, op: s.lastOperation })),
    ).toEqual([
      { name: "migration_a.js", success: true, op: "run" },
      { name: "migration_b.js", success: true, op: "run" },
      { name: "migration_c.js", success: true, op: "run" },
    ]);
  });

  it("rolls migrations back in descending order", async () => {
    writeMigration("migration_a", 1);
    writeMigration("migration_b", 2);
    writeMigration("migration_c", 3);

    await run({ all: true });
    resetLog();

    await run({ all: true }, true);

    expect(readExecutionLog()).toEqual([
      "migration_c:rollback",
      "migration_b:rollback",
      "migration_a:rollback",
    ]);

    const environmentStatus = readStatus()[environmentId] ?? [];
    expect(environmentStatus.every((s) => s.lastOperation === "rollback")).toBe(true);
  });

  it("skips migrations that already ran on a subsequent run", async () => {
    writeMigration("migration_a", 1);
    writeMigration("migration_b", 2);

    await run({ all: true });
    resetLog();

    writeMigration("migration_c", 3);

    await run({ all: true });

    expect(readExecutionLog()).toEqual(["migration_c:run"]);
  });

  it("runs only the next N migrations when using the `next` filter", async () => {
    writeMigration("migration_a", 1);
    writeMigration("migration_b", 2);
    writeMigration("migration_c", 3);

    await run({ next: 2 });

    expect(readExecutionLog()).toEqual(["migration_a:run", "migration_b:run"]);
  });

  it("records a failed migration and keeps going with continueOnError", async () => {
    writeMigration("migration_a", 1);
    writeMigration("migration_b", 2, { run: 'throw new Error("boom");' });
    writeMigration("migration_c", 3);

    await runMigrations({
      environmentId,
      apiKey: "dummy-api-key",
      migrationsFolder: folder,
      logLevel: "none",
      continueOnError: true,
      all: true,
    });

    // The failing migration ran, and the later one still executed.
    expect(readExecutionLog()).toEqual(["migration_a:run", "migration_b:run", "migration_c:run"]);

    const statusByName = new Map(readStatus()[environmentId]?.map((s) => [s.name, s.success]));
    expect(statusByName.get("migration_a.js")).toBe(true);
    expect(statusByName.get("migration_b.js")).toBe(false);
    expect(statusByName.get("migration_c.js")).toBe(true);
  });
});
