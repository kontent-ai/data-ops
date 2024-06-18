import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fs from "fs";
import path from "path";

import { RunMigrationFilterParams, RunMigrationsParams } from "../../../commands/migrations/run/runParams.js";
import { logError, logInfo, LogOptions } from "../../../log.js";
import { seriallyReduce } from "../../../utils/requests.js";
import { MakeObjectPropsUnionType } from "../../../utils/types.js";
import { isMigrationModule, Migration, MigrationOrder, Range } from "../models/migration.js";
import { MigrationStatus, Operation } from "../models/status.js";
import { WithErr } from "./errUtils.js";
import { orderComparator } from "./orderUtils.js";
import { parseRange } from "./rangeUtils.js";
import { createMigrationStatus } from "./statusUtils.js";

export const formatDateForFileName = (date: Date) =>
  `${date.getUTCFullYear()}-`
  + `${("0" + (date.getUTCMonth() + 1)).slice(-2)}-`
  + `${("0" + date.getUTCDate()).slice(-2)}-`
  + `${("0" + date.getUTCHours()).slice(-2)}-`
  + `${("0" + date.getUTCMinutes()).slice(-2)}-`
  + `${("0" + date.getUTCSeconds()).slice(-2)}-`;

export const getMigrationName = (name: string, type: "js" | "ts", prefix?: string) => `${prefix ?? ""}${name}.${type}`;

export const generateTypescriptMigration = (orderDate?: Date): string =>
  `import { MigrationModule } from "@kontent-ai/data-ops";

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

type FilterParams = MakeObjectPropsUnionType<Pick<RunMigrationsParams, "name" | "all"> & { range?: Range }>;

export const getMigrationFilterParams = (
  params: RunMigrationFilterParams,
): WithErr<FilterParams> => {
  if (params.next) {
    return { value: { all: true } }; // when next param is selected, filtering happens after the migrations skip.
  }
  if (params.range) {
    const parsedRange = parseRange(params.range as string);
    if ("err" in parsedRange) {
      return parsedRange;
    }

    return { value: { range: parsedRange.value } };
  }
  if (params.name) {
    return { value: { name: params.name } };
  }
  if (params.all) {
    return { value: { all: params.all } };
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
      return operation === "rollback" ? true : false;
    }

    return migrationStatus.lastOperation === operation && migrationStatus.success;
  });

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

export const loadMigrationFiles = async (folderPath: string): Promise<WithErr<Migration[]>> =>
  Promise.all(
    fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(file => file.isFile() && file.name.endsWith("js"))
      .map(async file => {
        const migrationPath = path.join(folderPath, file.name);
        const module = (await import(migrationPath)).default;

        if (isMigrationModule(module)) {
          return { name: file.name, module };
        } else {
          throw Error(`Migration ${file.name} is not a valid MigrationModule`);
        }
      }),
  ).then(res => ({ value: res })).catch((error) => ({ err: error }));

export type ExecuteMigrationOptions = {
  operation: Operation;
  continueOnError: boolean;
};

export const executeMigrations = async (
  migrations: ReadonlyArray<Migration>,
  client: ManagementClient,
  options: ExecuteMigrationOptions,
  logOptions: LogOptions,
) =>
  seriallyReduce<Readonly<{ status: ReadonlyArray<MigrationStatus>; error: boolean }>>(
    migrations.map(migration => async (prev) => {
      if (prev.error && !options.continueOnError) {
        return prev;
      }
      const execute = options.operation === "run" ? migration.module.run : migration.module.rollback;

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
