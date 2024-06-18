import chalk from "chalk";
import * as path from "path";

import { logError, logInfo } from "../../../log.js";
import { Migration } from "../../../modules/migrations/models/migration.js";
import { handleErr } from "../../../modules/migrations/utils/errUtils.js";
import {
  executeMigrations,
  filterMigrations,
  getMigrationFilterParams,
  getMigrationsToSkip,
  getMigrationsWithDuplicateOrders,
  loadMigrationFiles,
} from "../../../modules/migrations/utils/migrationUtils.js";
import { createOrderComparator } from "../../../modules/migrations/utils/orderUtils.js";
import {
  createDefaultReadStatus,
  createDefaultWriteStatus,
  loadStatus,
  loadStatusPlugin,
  updateEnvironmentStatus,
  writeStatus,
} from "../../../modules/migrations/utils/statusUtils.js";
import { requestConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";
import { RunMigrationsParams } from "./runParams.js";
import { createManagementClient } from "@kontent-ai/management-sdk";

const commandName = "run";
const migrationSelectionOptions = ["name", "range", "all", "next"] as const;
const exampleMessagePrefix = "$0 migrations run -e xxx -k xxx -p xxx";

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
        .option("migrationsFolder", {
          alias: "m",
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
            "Specifies the range of migrations to be executed. The format is number:number or date:date. Conflicts with --all, --name and --next options.",
          type: "string",
          conflicts: migrationSelectionOptions.filter(o => o !== "range"),
        })
        .option("all", {
          alias: "a",
          describe: "Executes all migations.",
          type: "boolean",
          conflicts: migrationSelectionOptions.filter(o => o !== "all"),
        })
        .option("next", {
          alias: "x",
          describe:
            "Specifies the number of how many next migrations (not already executed) should be executed. Conflicts with --all,--name and --range options.",
          type: "number",
          conflicts: migrationSelectionOptions.filter(o => o !== "next"),
        })
        .option("rollback", {
          alias: "b",
          describe: "Executes migrations' rollback script instead of run script.",
          type: "boolean",
        })
        .option("statusPlugins", {
          alias: "s",
          describe: "Path to a script that defines how to store and read status.",
          type: "string",
        })
        .option("continueOnError", {
          describe: "Determines whether migrations should continue when an error is encoutered.",
          type: "boolean",
        })
        .option("force", {
          alias: "f",
          describe: "Runs the specified migrations without checking the status file for previous runs.",
          type: "boolean",
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip the confirmation message.",
        })
        .check((args) => {
          if (!args.all && !args.name && !args.range && !args.next) {
            throw new Error("Exactly one of the params --all --name --next --range must be set.");
          }

          return true;
        })
        .example(`${exampleMessagePrefix} --all (-a)`, "Run all migrations")
        .example(`${exampleMessagePrefix} --name (-n) myMigration.js`, "Run migration with the specified name.")
        .example(`${exampleMessagePrefix} --next (-x) 10`, "Run next 10 migrations.")
        .example(`${exampleMessagePrefix} --range 1:5`, "Run migrations with order between 1 and 5 included.")
        .example(
          `${exampleMessagePrefix} --range 1:T2025`,
          "Run migrations with order between 1 and before year 2025 included.",
        )
        .example(
          `${exampleMessagePrefix} --range T2024-06:T2025-02`,
          "Run migrations with order between the June of 2024 and February 2025",
        )
        .example(`${exampleMessagePrefix} --range :5`, "Run migrations with order up to 5 included.")
        .example(`${exampleMessagePrefix} --range 2:`, "Run all migrations with order from 2 (included)."),
    handler: (args) => runMigrations(args).catch(simplifyErrors),
  });

export const runMigrations = async (params: RunMigrationsParams) => {
  const operation = params.rollback ? "rollback" : "run";
  const environmentId = params.environmentId;
  const plugins = params.statusPlugins ? handleErr(await loadStatusPlugin(params.statusPlugins), params) : undefined;
  const absoluteDirectoryPath = path.resolve(params.migrationsFolder);

  const { readStatus, saveStatus } = plugins
    ?? {
      readStatus: createDefaultReadStatus(absoluteDirectoryPath),
      saveStatus: createDefaultWriteStatus(absoluteDirectoryPath),
    };

  const status = handleErr(await loadStatus(readStatus), params);
  const environmentStatus = status[environmentId] ?? [];

  const filterParams = handleErr(getMigrationFilterParams(params), params);

  const migrations = handleErr(await loadMigrationFiles(absoluteDirectoryPath), params);
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

  const migrationsWithoutSkipped = filteredMigrations.filter(m => !skippedMigrations.includes(m)).toSorted(
    migrationComparator,
  );
  const migrationsToRun = params.next ? migrationsWithoutSkipped.slice(0, params.next) : migrationsWithoutSkipped;

  const migrationsDuplicates = getMigrationsWithDuplicateOrders(migrationsToRun);

  if (migrationsDuplicates.size) {
    logError(
      params,
      `Found multiple migrations having the same order: \n${
        [...migrationsDuplicates.entries()]
          .map(([order, migrations]) => `Order ${order}: ${migrations.map(m => m.name).join(", ")}`)
      }`,
    );
    process.exit(1);
  }

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
    logInfo(params, "standard", "Sucessfully migrated.\n");
  }

  const newStatus = { ...status, [environmentId]: updateEnvironmentStatus(environmentStatus, migrationsStatus.status) };

  logInfo(params, "standard", "Storing status...");
  handleErr(await writeStatus(saveStatus, newStatus), params, `Could not store status.`);
  logInfo(
    params,
    "standard",
    `Status sucessfully stored${
      !params.statusPlugins ? ` in ${chalk.green(path.resolve(params.migrationsFolder, "status.json"))}` : ""
    }.`,
  );

  if (migrationsStatus.error) {
    process.exit(1);
  }
};
