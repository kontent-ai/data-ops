import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { LogOptions } from "../../../../src/log.ts";
import type { Status } from "../../../../src/modules/migrations/models/status.ts";
import {
  type RunMigrationFilterParams,
  runMigrations,
} from "../../../../src/modules/migrations/run.ts";

export const environmentId = "00000000-0000-0000-0000-000000000000";

export type TempMigrationsFolder = Readonly<{ folder: string; logPath: string }>;

/**
 * Creates an isolated temp folder for a single test. Each test gets its own folder
 * so dynamically-imported migration/plugin modules never collide in Node's module
 * cache between tests. The folder is made a self-contained ESM package so `.js` mock
 * migrations/plugins load as ES modules, exactly like a real user's project.
 */
export const createTempMigrationsFolder = (): TempMigrationsFolder => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "dataops-migrations-"));
  fs.writeFileSync(path.join(folder, "package.json"), JSON.stringify({ type: "module" }));

  return { folder, logPath: path.join(folder, "execution.log") };
};

export const removeTempMigrationsFolder = (folder: string): void =>
  fs.rmSync(folder, { recursive: true, force: true });

type CustomCode = Readonly<{ run?: string; rollback?: string }>;

/**
 * Writes a mock migration file. By default each operation only records that it ran
 * (and with which operation) by appending to a shared log file, so the flow stays
 * offline and never touches the injected management client. Extra statements can be
 * injected into the `run`/`rollback` bodies via `customCode`, e.g. to make an
 * operation throw.
 */
export const writeMigration = (
  { folder, logPath }: TempMigrationsFolder,
  name: string,
  order: number,
  customCode: CustomCode = {},
): void => {
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

// Optional params other than the mutually-exclusive migration filter. Kept separate
// from `filter` so spreading never widens the exclusive filter keys (all/name/...).
type RunExtraParams = Readonly<{
  rollback?: boolean;
  statusPlugins?: string;
  continueOnError?: boolean;
  force?: boolean;
  kontentUrl?: string;
}> &
  LogOptions;

export const run = async (
  { folder }: TempMigrationsFolder,
  filter: RunMigrationFilterParams,
  extraParams: RunExtraParams = {},
): Promise<void> =>
  runMigrations({
    environmentId,
    apiKey: "dummy-api-key",
    migrationsFolder: folder,
    rollback: false,
    logLevel: "none",
    ...filter,
    ...extraParams,
  });

export const readExecutionLog = (logPath: string): ReadonlyArray<string> =>
  fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean) : [];

/** Clears the execution log so a subsequent run/rollback can be asserted in isolation. */
export const resetLog = (logPath: string): void => fs.writeFileSync(logPath, "");

export const readStatus = (folder: string): Status =>
  JSON.parse(fs.readFileSync(path.join(folder, "status.json"), "utf8")) as Status;
