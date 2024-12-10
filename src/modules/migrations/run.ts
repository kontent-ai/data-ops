import chalk from "chalk";
import * as path from "path";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { apply } from "../../utils/function.js";
import { AnyOnePropertyOf } from "../../utils/types.js";
import { formatEnvironmentInformation } from "../shared/cli.js";
import { getEnvironmentInformation } from "../shared/mapiUtils.js";
import { Migration, MigrationOrder } from "./models/migration.js";
import { MigrationOperation, MigrationStatus, SaveStatus, Status, StatusPlugin } from "./models/status.js";
import { handleErr, WithErr } from "./utils/errUtils.js";
import {
  executeMigrations,
  filterMigrations,
  getMigrationsToSkip,
  getMigrationsWithDuplicateOrders,
  loadMigrationFiles,
} from "./utils/migrationUtils.js";
import { createOrderComparator } from "./utils/orderUtils.js";
import {
  createDefaultReadStatus,
  createDefaultWriteStatus,
  loadStatus,
  loadStatusPlugin,
  updateEnvironmentStatus,
  writeStatus,
} from "./utils/statusUtils.js";

export type RunMigrationsParams = Readonly<
  & {
    environmentId: string;
    apiKey: string;
    migrationsFolder: string;
    rollback?: boolean;
    statusPlugins?: string;
    continueOnError?: boolean;
    force?: boolean;
    kontentUrl?: string;
  }
  & RunMigrationFilterParams
  & LogOptions
>;

export type RunMigrationFilterParams = AnyOnePropertyOf<
  { name: string; range: { from: MigrationOrder; to: MigrationOrder }; all: boolean; next: number }
>;

export const runMigrations = async (params: RunMigrationsParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: "migrations-run-API",
    baseUrl: params.kontentUrl,
  });

  logInfo(
    params,
    "standard",
    `Migrating to the environmnent ${formatEnvironmentInformation(await getEnvironmentInformation(client))}\n`,
  );

  await withMigrationsToRun(params, async migrations => {
    const operation = params.rollback ? "rollback" : "run";

    const migrationsStatus = await executeMigrations(migrations, client, {
      operation,
      continueOnError: params.continueOnError ?? false,
    }, params);

    if (migrationsStatus.error) {
      return Promise.reject(migrationsStatus.status);
    }

    logInfo(params, "standard", "Sucessfully migrated.\n");

    return migrationsStatus.status;
  });
};

export const withMigrationsToRun = async (
  params: RunMigrationsParams,
  callback: (migrations: ReadonlyArray<Migration>) => Promise<ReadonlyArray<MigrationStatus>>,
) => {
  const operation = params.rollback ? "rollback" : "run";

  const absoluteDirectoryPath = path.resolve(params.migrationsFolder);
  const absoluteStatusPath = apply(p => path.resolve(p), params.statusPlugins);

  const { readStatus, saveStatus } = handleErr(
    await loadStatusFunctions(absoluteStatusPath, absoluteDirectoryPath),
    params,
  );

  const status = handleErr(await loadStatus(readStatus), params);
  const environmentStatus = status[params.environmentId] ?? [];

  const migrations = handleErr(await loadMigrationFiles(absoluteDirectoryPath), params);
  const migrationsToRun = filterMigrationsToRun(migrations, environmentStatus, operation, params);

  if (!migrationsToRun) {
    return;
  }

  const newStatus = await callback(migrationsToRun).catch(status => status as ReadonlyArray<MigrationStatus>);

  await updateStatus(status, environmentStatus, newStatus, saveStatus, params);
};

const loadStatusFunctions = async (
  pluginsPath: string | undefined,
  migrationsFolder: string,
): Promise<WithErr<StatusPlugin>> =>
  pluginsPath
    ? await loadStatusPlugin(pluginsPath)
    : Promise.resolve({
      value: {
        readStatus: createDefaultReadStatus(migrationsFolder),
        saveStatus: createDefaultWriteStatus(migrationsFolder),
      },
    });

const filterMigrationsToRun = (
  migrations: ReadonlyArray<Migration>,
  environmentStatus: ReadonlyArray<MigrationStatus>,
  operation: MigrationOperation,
  params: RunMigrationsParams,
) => {
  const filteredMigrations = filterMigrations(migrations, params);
  const skippedMigrations = params.force ? [] : getMigrationsToSkip(environmentStatus, filteredMigrations, operation);

  if (skippedMigrations.length) {
    logInfo(
      params,
      "standard",
      `Skipping ${skippedMigrations.length} migrations:\n${
        skippedMigrations.map(m => chalk.blue(m.name)).join("\n")
      }\n`,
    );
  }

  const migrationComparator = createOrderComparator<Migration>(
    operation === "run" ? "asc" : "desc",
    e => e.module.order,
  );

  const migrationsWithoutSkipped = filteredMigrations.filter(m => !skippedMigrations.includes(m)).toSorted(
    migrationComparator,
  );
  const migrationsToRun = "next" in params ? migrationsWithoutSkipped.slice(0, params.next) : migrationsWithoutSkipped;

  const migrationsDuplicates = getMigrationsWithDuplicateOrders(migrationsToRun);

  if (migrationsDuplicates.size) {
    throw new Error(`Found multiple migrations having the same order: \n${
      [...migrationsDuplicates.entries()]
        .map(([order, migrations]) => `Order ${order}: ${migrations.map(m => m.name).join(", ")}`)
    }`);
  }

  if (migrationsToRun.length === 0) {
    logInfo(params, "standard", "No migrations to run.");
    return;
  }

  logInfo(
    params,
    "standard",
    `${operation === "run" ? "Running" : "Rolling back"} ${migrationsToRun.length} migrations:\n${
      migrationsToRun.map(m => chalk.blue(m.name)).join("\n")
    }\n`,
  );

  return migrationsToRun;
};

const updateStatus = async (
  status: Status,
  environmentStatus: ReadonlyArray<MigrationStatus>,
  newEnvironmentStatus: ReadonlyArray<MigrationStatus>,
  saveStatus: SaveStatus,
  params: RunMigrationsParams,
) => {
  const newStatus = {
    ...status,
    [params.environmentId]: updateEnvironmentStatus(environmentStatus, newEnvironmentStatus),
  };

  logInfo(params, "standard", "Storing status...");
  handleErr(await writeStatus(saveStatus, newStatus), params, `Could not store status.`);
  logInfo(
    params,
    "standard",
    `Status sucessfully stored${
      !params.statusPlugins ? ` in ${chalk.green(path.resolve(params.migrationsFolder, "status.json"))}` : ""
    }.`,
  );
};
