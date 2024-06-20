import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fs from "fs";
import path from "path";

import { RunMigrationFilterParams, RunMigrationParams } from "../../../commands/migrations/run/runParams.js";
import { logError, logInfo, LogOptions } from "../../../log.js";
import { MakeUnion } from "../../../utils/types.js";
import { isMigrationModule, Migration, Range } from "../models/migration.js";
import { MigrationOrder, MigrationStatus, Operation } from "../models/status.js";
import { ErrorLike, isErr } from "../types/err.js";
import { orderComparator } from "./orderUtils.js";
import { parseRange } from "./rangeUtils.js";
import { createMigrationStatus, getLastMigrationFromStatus } from "./statusUtils.js";

export const formatDateForFileName = (date: Date) =>
  `${date.getUTCFullYear()}-`
  + `${("0" + (date.getUTCMonth() + 1)).slice(-2)}-`
  + `${("0" + date.getUTCDate()).slice(-2)}-`
  + `${("0" + date.getUTCHours()).slice(-2)}-`
  + `${("0" + date.getUTCMinutes()).slice(-2)}-`
  + `${("0" + date.getUTCSeconds()).slice(-2)}-`;

export const getMigrationName = (name: string, type: "js" | "ts", prefix?: string) => `${prefix ?? ""}${name}.${type}`;

export const generateTypescriptMigration = (orderDate?: Date): string =>
  `import {MigrationModule} from "@kontent-ai/data-ops";

const migration: MigrationModule = {
  order: ${orderDate ? `new Date('${orderDate.toISOString()}')` : "1"},
  run: async apiClient => {},
  rollback: async apiClient => {},
};

export default migration;
`;

export const generateJavascriptMigration = (orderDate?: Date | null): string =>
  `const migration = {
  order: ${orderDate ? `new Date('${orderDate.toISOString()}')` : "1"},
  run: async apiClient => {},
  rollback: asyncapiClient => {},
};

module.exports = migration;
`;

type FilterParams = MakeUnion<
  Pick<RunMigrationParams, "name" | "all"> & {
    next?: { n: number; lastOrder: MigrationOrder };
    range?: Range;
  }
>;

export const getMigrationFilterParams = (
  environmentStatus: ReadonlyArray<MigrationStatus>,
  operation: Operation,
  params: RunMigrationFilterParams,
): ErrorLike<FilterParams> => {
  if (params.next) {
    const status = getLastMigrationFromStatus(environmentStatus, operation);

    return { next: { n: params.next, lastOrder: status?.order ?? 0 } };
  }
  if (params.range) {
    const parsedRange = parseRange(params.range as string);
    if (isErr(parsedRange)) {
      return parsedRange;
    }

    return { range: parsedRange };
  }
  if (params.name) {
    return { name: params.name };
  }
  if (params.all) {
    return { all: params.all };
  }

  return { err: "Exactly one parameter (all, name, next, range) must be set" };
};

export const filterMigrations = (
  migrations: ReadonlyArray<Migration>,
  params: FilterParams,
) => {
  const param = params;

  return [
    ..."all" in param ? migrations : [],
    ..."name" in param ? migrations.filter(m => m.name === param.name) : [],
    ..."next" in param
      ? migrations.filter(m => orderComparator(m.module.order, param.next.lastOrder as MigrationOrder) > 0).slice(
        0,
        param.next.n,
      )
      : [],
    ..."range" in param
      ? migrations.filter(m =>
        orderComparator(m.module.order, param.range.from) >= 0 && orderComparator(m.module.order, param.range.to) <= 0
      )
      : [],
  ];
};

export const getMigrationsToSkip = (
  environmentStatus: ReadonlyArray<MigrationStatus>,
  migrations: ReadonlyArray<Migration>,
  operation: Operation,
): ReadonlyArray<Migration> =>
  migrations.filter(m => {
    const migrationStatus = environmentStatus.find(s => s.name === m.name);
    if (!migrationStatus) {
      return false;
    }

    return migrationStatus.lastOperation === operation && migrationStatus.success;
  });

export const getLastMigrationOrder = (
  migrations: ReadonlyArray<Migration>,
  enviromentStatuses: ReadonlyArray<MigrationStatus>,
  operation: Operation,
) => {
  const lastMigration = getLastMigrationFromStatus(enviromentStatuses, operation);

  return lastMigration ? migrations.find(m => m.name === lastMigration.name) : null;
};

export const getMigrationsWithDuplicateOrders = (
  migrations: ReadonlyArray<Migration>,
): ReadonlyMap<MigrationOrder, ReadonlyArray<Migration>> =>
  new Map<MigrationOrder, ReadonlyArray<Migration>>(
    [
      ...migrations.reduce((prev, migration) => {
        prev.set(migration.module.order, [...prev.get(migration.module.order) ?? [], migration]);

        return prev;
      }, new Map<MigrationOrder, Migration[]>()).entries(),
    ]
      .filter(([, migrations]) => migrations.length > 1),
  );

export const loadMigrationFiles = async (
  folderPath: string,
  fileExtension: string,
): Promise<ErrorLike<Migration[]>> =>
  Promise.all(
    fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(file => file.isFile() && file.name.endsWith(fileExtension))
      .map(async file => {
        const migrationPath = path.join(folderPath, file.name);
        const module = (await import(migrationPath)).default;

        if (isMigrationModule(module)) {
          return { name: file.name, module };
        } else {
          throw Error(`Migration ${file.name} is not a valid MigrationModule`);
        }
      }),
  ).catch((error) => ({ err: JSON.stringify(error) }));

export type ExecuteMigrationOptions = {
  operation: Operation;
  continueOnError: boolean;
};

export const executeMigrations = async (
  migrations: ReadonlyArray<Migration>,
  client: ManagementClient,
  options: ExecuteMigrationOptions,
  logOptions: LogOptions,
) => {
  const status: Array<MigrationStatus> = [];

  for (const migration of migrations) {
    const execute = options.operation === "run" ? migration.module.run : migration.module.rollback;

    if (!execute) {
      logError(logOptions, "standard", `Migration ${migration.name} does not provide rollback function.`);

      if (!options.continueOnError) {
        return { status, error: true };
      }
      continue;
    }

    try {
      logInfo(
        logOptions,
        "standard",
        `Executing ${options.operation === "run" ? "run" : "rollback"} function of ${
          chalk.yellow(migration.name)
        } migration`,
      );

      status.push(createMigrationStatus(migration.name, true, migration.module.order, options.operation));
      await execute(client);
    } catch (e) {
      logError(logOptions, "standard", JSON.stringify(e));
      status.push(createMigrationStatus(migration.name, false, migration.module.order, options.operation));

      if (!options.continueOnError) {
        return { status, error: true };
      }
    }
  }

  return { status, error: false };
};
