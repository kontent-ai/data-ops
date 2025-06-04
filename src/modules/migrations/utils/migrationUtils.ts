import * as fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import { P, match } from "ts-pattern";

import { type LogOptions, logError, logInfo } from "../../../log.js";
import { DateLevel, serializeDateForFileName } from "../../../utils/files.js";
import { seriallyReduce } from "../../../utils/requests.js";
import {
  type Migration,
  type MigrationModuleType,
  type MigrationOrder,
  isMigrationModule,
} from "../models/migration.js";
import type { MigrationOperation, MigrationStatus } from "../models/status.js";
import type { RunMigrationFilterParams } from "../run.js";
import type { WithErr } from "./errUtils.js";
import { orderComparator } from "./orderUtils.js";
import { createMigrationStatus } from "./statusUtils.js";

export const getMigrationName = (
  name: string,
  type: MigrationModuleType,
  prefix: Date | string | undefined,
) =>
  `${prefix instanceof Date ? `${serializeDateForFileName(prefix, DateLevel.Second)}-` : (prefix ?? "")}${name}.${type}`;

export const generateTypescriptMigration = (order: Date | number | undefined): string =>
  `import { MigrationModule } from "@kontent-ai/data-ops";

const migration: MigrationModule = {
  order: ${order === undefined ? "1" : createOrderPropertyValue(order)},
  run: async apiClient => {},
  rollback: async apiClient => {},
};

export default migration;
`;

export const generateJavascriptMigration = (order: Date | number | undefined): string =>
  `const migration = {
  order: ${order === undefined ? "1" : createOrderPropertyValue(order)},
  run: async apiClient => {},
  rollback: asyncapiClient => {},
};

module.exports = migration;
`;

const createOrderPropertyValue = (order: Date | number) =>
  typeof order === "number" ? order.toString() : `new Date('${order.toISOString()}')`;

export const filterMigrations = (
  migrations: ReadonlyArray<Migration>,
  params: RunMigrationFilterParams,
) =>
  match(params)
    .with(P.union({ all: P.nonNullable }, { next: P.nonNullable }), () => migrations)
    .with({ name: P.nonNullable }, ({ name }) => migrations.filter((m) => m.name === name))
    .with({ range: P.nonNullable }, ({ range }) =>
      migrations.filter(
        (m) =>
          orderComparator(m.module.order, range.from) >= 0 &&
          orderComparator(m.module.order, range.to) <= 0,
      ),
    )
    .exhaustive();

export const getMigrationsToSkip = (
  environmentStatus: ReadonlyArray<MigrationStatus>,
  migrations: ReadonlyArray<Migration>,
  operation: MigrationOperation,
): ReadonlyArray<Migration> =>
  migrations.filter((m) => {
    const migrationStatus = environmentStatus.find((s) => s.name === m.name);
    if (!migrationStatus) {
      return operation === "rollback";
    }

    return migrationStatus.lastOperation === operation && migrationStatus.success;
  });

export const getMigrationsWithDuplicateOrders = (
  migrations: ReadonlyArray<Migration>,
): ReadonlyMap<MigrationOrder, ReadonlyArray<Migration>> =>
  new Map<MigrationOrder, ReadonlyArray<Migration>>(
    [
      ...migrations
        .reduce((prev, migration) => {
          prev.set(migration.module.order, [
            ...(prev.get(migration.module.order) ?? []),
            migration,
          ]);

          return prev;
        }, new Map<MigrationOrder, Migration[]>())
        .entries(),
    ].filter(([, migrations]) => migrations.length > 1),
  );

export const loadMigrationFiles = async (folderPath: string): Promise<WithErr<Migration[]>> =>
  Promise.all(
    fs
      .readdirSync(folderPath, { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith("js"))
      .map(async (file) => {
        const migrationPath = path.join(folderPath, file.name);
        const module = (await import(pathToFileURL(migrationPath).href)).default;

        if (isMigrationModule(module)) {
          return { name: file.name, module };
        }
        throw new Error(`Migration ${file.name} is not a valid MigrationModule`);
      }),
  )
    .then((res) => ({ value: res }))
    .catch((error) => ({ err: error }));

export type ExecuteMigrationOptions = {
  operation: MigrationOperation;
  continueOnError: boolean;
};

export const executeMigrations = async (
  migrations: ReadonlyArray<Migration>,
  client: ManagementClient,
  options: ExecuteMigrationOptions,
  logOptions: LogOptions,
) =>
  seriallyReduce<Readonly<{ status: ReadonlyArray<MigrationStatus>; error: boolean }>>(
    migrations.map((migration) => async (prev) => {
      if (prev.error && !options.continueOnError) {
        return prev;
      }
      const execute =
        options.operation === "run" ? migration.module.run : migration.module.rollback;

      if (!execute) {
        logError(logOptions, `Migration ${migration.name} does not provide rollback function.`);

        return { ...prev, error: true };
      }

      try {
        logInfo(
          logOptions,
          "standard",
          `Executing ${options.operation === "run" ? "run" : "rollback"} migration of ${chalk.yellow(migration.name)}`,
        );

        await execute(client);

        return {
          ...prev,
          status: [
            ...prev.status,
            createMigrationStatus(migration.name, true, migration.module.order, options.operation),
          ],
        };
      } catch (e) {
        logError(
          logOptions,
          `Error occured in ${migration.name}: ${e instanceof Error ? e.message : JSON.stringify(e)}`,
        );

        return {
          status: [
            ...prev.status,
            createMigrationStatus(migration.name, false, migration.module.order, options.operation),
          ],
          error: true,
        };
      }
    }),
    { status: [], error: false },
  );
