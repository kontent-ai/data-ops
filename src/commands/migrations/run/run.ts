import { createManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as path from "path";

import { logError, logInfo, LogOptions } from "../../../log.js";
import { Migration } from "../../../modules/migrations/models/migration.js";
import { ErrorLike, isErr } from "../../../modules/migrations/types/err.js";
import {
  executeMigrations,
  filterMigrations,
  getMigrationFilterParams,
  getMigrationsToSkip,
  loadMigrationFiles,
} from "../../../modules/migrations/utils/migrationUtils.js";
import { createOrderComparator } from "../../../modules/migrations/utils/orderUtils.js";
import {
  createDefaultReadStatus,
  createDefaultSaveStatus,
  loadStatus,
  loadStatusPlugin,
  updateEnvironmentStatus,
  writeStatus,
} from "../../../modules/migrations/utils/statusUtils.js";
import { requestConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { RunMigrationParams } from "./runParams.js";

const commandName = "run";
const migrationSelectionOptions = ["name", "range", "all", "next"] as const;

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "run",
    builder: yargs =>
      yargs
        .option("environmentId", {
          alias: "e",
          describe: "Id of Kontent.ai environment.",
          demandOption: "You need to provide Kontent.ai environment id.",
          type: "string",
        })
        .option("apiKey", {
          alias: "k",
          describe: "Kontent.ai Management API key.",
          demandOption: "You need to provide Kontent.ai Management API key.",
          type: "string",
        })
        .option("folder", {
          alias: "p",
          describe: "Path to a folder containing migrations.",
          demandOption: "You need to provide path for folder containing migrations.",
          type: "string",
        })
        .option("name", {
          alias: "n",
          describe:
            "Specifies the name of the migration to be executed. Conflicts with --range --all and --next options.",
          type: "string",
          conflicts: migrationSelectionOptions.filter(o => o !== "name"),
        })
        .option("range", {
          alias: "r",
          describe:
            "Specifies the range of migrations to be executed. The format is number:number or date:date. Conflicts with --range --all and --next options.",
          type: "string",
          conflicts: migrationSelectionOptions.filter(o => o !== "range"),
        })
        .option("all", {
          alias: "a",
          describe: "Specifies that all migrations should be executed.",
          type: "boolean",
          conflicts: migrationSelectionOptions.filter(o => o !== "all"),
        })
        .option("next", {
          alias: "x",
          describe:
            "Specifies the number of how many next migrations (not already executed) should be executed. Conflicts with --range --all and --next options.",
          type: "number",
          conflicts: migrationSelectionOptions.filter(o => o !== "next"),
        })
        .option("rollback", {
          alias: "b",
          describe: "Execute specified rollback function instead of run",
          type: "boolean",
        })
        .option("statusPlugins", {
          alias: "s",
          describe: "Path to a script that defines how to store and read status",
          type: "string",
        })
        .option("continueOnError", {
          describe: "Defines whether migrations should continue when an error is encoutered",
          type: "boolean",
        })
        .option("force", {
          alias: "f",
          describe: "Runs migrations overriding status policies.",
          type: "boolean",
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip confirmation message.",
        })
        .check((args) => {
          if (!args.all && !args.name && !args.range && !args.next) {
            throw new Error("Exactly one of the params --all --name --next --range must be set.");
          }

          return true;
        }),
    handler: (args) => run(args),
  });

const run = async (params: RunMigrationParams) => {
  const operation = params.rollback ? "rollback" : "run";
  const environmentId = params.environmentId;
  const plugins = params.statusPlugins ? handleError(await loadStatusPlugin(params.statusPlugins), params) : undefined;
  const absoluteDirectoryPath = path.resolve(params.folder);

  const { readStatus, saveStatus } = plugins
    ?? {
      readStatus: createDefaultReadStatus(absoluteDirectoryPath),
      saveStatus: createDefaultSaveStatus(absoluteDirectoryPath),
    };

  const status = handleError(await loadStatus(readStatus), params);
  const environmentStatus = status[environmentId] ?? [];

  const filterParams = handleError(getMigrationFilterParams(environmentStatus, operation, params), params);

  const migrations = handleError(await loadMigrationFiles(absoluteDirectoryPath, "js"), params);
  const filteredMigrations = filterMigrations(migrations, filterParams);
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

  const migrationsToRun = filteredMigrations.filter(m => !skippedMigrations.includes(m)).toSorted(migrationComparator);

  if (migrationsToRun.length === 0) {
    logInfo(params, "standard", "No migrations to run.");
    process.exit(0);
  }

  logInfo(
    params,
    "standard",
    `${operation === "run" ? "Running" : "Rollbacking"} ${migrationsToRun.length} migrations:\n${
      migrationsToRun.map(m => chalk.blue(m.name)).join("\n")
    }\n`,
  );

  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in irreversible changes to your environment ${params.environmentId}.\nOK to proceed y/n? (suppress this message with --skipConfirmation parameter)\n`,
  );

  const confirmed = !params.skipConfirmation ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    process.exit(0);
  }

  const client = createManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });

  const migrationsStatus = await executeMigrations(migrationsToRun, client, {
    operation,
    continueOnError: params.continueOnError ?? false,
  }, params);

  if (!migrationsStatus.error) {
    logInfo(params, "standard", "Sucessfully migrated.");
  }

  const newStatus = { ...status };
  newStatus[environmentId] = updateEnvironmentStatus(environmentStatus, migrationsStatus.status);

  logInfo(params, "standard", "Storing status...");
  handleError(await writeStatus(saveStatus, newStatus), params, `Could not store status.`);
  logInfo(params, "standard", "Status sucessfully stored.");

  if (migrationsStatus.error) {
    process.exit(1);
  }
};

const handleError = <T>(entity: ErrorLike<T>, logOptions: LogOptions, message?: string) => {
  if (isErr(entity)) {
    logError(
      logOptions,
      "standard",
      `${message ?? ""}${entity.err instanceof Error ? entity.err.message : JSON.stringify(entity.err)}`,
    );
    process.exit(1);
  }

  return entity;
};
