import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { MigrationStatus, Status } from "../../../src/modules/migrations/models/status.ts";
import {
  createTempMigrationsFolder,
  environmentId,
  readExecutionLog,
  removeTempMigrationsFolder,
  run,
  type TempMigrationsFolder,
  writeMigration,
} from "./utils/migrationTestUtils.ts";

let tmp: TempMigrationsFolder;

// The plugin and its store live in a subfolder: `loadMigrationFiles` scans only the
// top level of the migrations folder for `.js` files, so nesting the plugin keeps it
// from being picked up as a migration while it stays under the folder's ESM
// package.json (so the `.js` plugin loads as an ES module).
const pluginDir = (folder: string): string => path.join(folder, "plugins");

// A custom (non-"status.json") store name so we can prove the plugin — not the
// built-in file sink — is the one being used.
const storePath = (folder: string): string => path.join(pluginDir(folder), "custom-status.json");

const pluginPath = (folder: string): string => path.join(pluginDir(folder), "plugin.js");

/**
 * Writes a custom status plugin into a subfolder. It reads/writes the whole `Status`
 * object to a custom JSON file, so the test can assert the plugin's own side effects
 * instead of the default `status.json`. The store path is embedded via
 * `JSON.stringify`, mirroring how `writeMigration` embeds its log path.
 */
const writeStatusPlugin = ({ folder }: TempMigrationsFolder): void => {
  fs.mkdirSync(pluginDir(folder), { recursive: true });
  const content = `import { readFileSync, writeFileSync, existsSync } from "node:fs";
const STORE = ${JSON.stringify(storePath(folder))};
export const readStatus = async () =>
  existsSync(STORE) ? JSON.parse(readFileSync(STORE, "utf8")) : {};
export const saveStatus = async (data) => {
  writeFileSync(STORE, JSON.stringify(data));
};
`;
  fs.writeFileSync(pluginPath(folder), content);
};

const readStore = (folder: string): Status =>
  JSON.parse(fs.readFileSync(storePath(folder), "utf8")) as Status;

beforeEach(() => {
  tmp = createTempMigrationsFolder();
});

afterEach(() => {
  removeTempMigrationsFolder(tmp.folder);
});

describe("migrations run with a custom status plugin", () => {
  it("stores status through the plugin instead of the default status.json", async () => {
    writeStatusPlugin(tmp);
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2);

    await run(tmp, { all: true }, { statusPlugins: pluginPath(tmp.folder) });

    // The plugin's own sink holds the recorded status...
    const environmentStatus = readStore(tmp.folder)[environmentId] ?? [];
    expect(
      environmentStatus.map((s) => ({ name: s.name, success: s.success, op: s.lastOperation })),
    ).toEqual([
      { name: "migration_a.js", success: true, op: "run" },
      { name: "migration_b.js", success: true, op: "run" },
    ]);

    // ...and the default file sink was never touched.
    expect(fs.existsSync(path.join(tmp.folder, "status.json"))).toBe(false);
  });

  it("reads existing status through the plugin and skips already-run migrations", async () => {
    writeStatusPlugin(tmp);
    writeMigration(tmp, "migration_a", 1);
    writeMigration(tmp, "migration_b", 2);

    // Seed the plugin's store so migration_a is already recorded as a successful run.
    const seeded: MigrationStatus = {
      name: "migration_a.js",
      success: true,
      order: 1,
      time: new Date(),
      lastOperation: "run",
    };
    fs.writeFileSync(storePath(tmp.folder), JSON.stringify({ [environmentId]: [seeded] }));

    await run(tmp, { all: true }, { statusPlugins: pluginPath(tmp.folder) });

    // migration_a is skipped because the plugin supplied its status; only migration_b runs.
    expect(readExecutionLog(tmp.logPath)).toEqual(["migration_b:run"]);
  });
});
