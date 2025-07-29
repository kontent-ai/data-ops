import { match, P } from "ts-pattern";

import { type LogOptions, logError, logInfo } from "../../../log.js";
import { type RunMigrationsParams, withMigrationsToRun } from "../../../modules/migrations/run.js";
import type { WithErr } from "../../../modules/migrations/utils/errUtils.js";
import { executeMigrations } from "../../../modules/migrations/utils/migrationUtils.js";
import { parseRange } from "../../../modules/migrations/utils/rangeUtils.js";
import { checkConfirmation } from "../../../modules/sync/utils/consoleHelpers.js";
import type { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "run";
const migrationSelectionOptions = ["name", "range", "all", "next"] as const;
const exampleMessagePrefix = "$0 migrations run -e xxx -k xxx -p xxx";

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "run",
    builder: (yargs) =>
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
          conflicts: migrationSelectionOptions.filter((o) => o !== "name"),
        })
        .option("range", {
          alias: "r",
          describe:
            "Specifies the range of migrations to be executed. The format is number:number or date:date. Conflicts with --all, --name and --next options.",
          type: "string",
          conflicts: migrationSelectionOptions.filter((o) => o !== "range"),
        })
        .option("all", {
          alias: "a",
          describe: "Executes all migrations.",
          type: "boolean",
          conflicts: migrationSelectionOptions.filter((o) => o !== "all"),
        })
        .option("next", {
          alias: "x",
          describe:
            "Specifies the number of how many next migrations (not already executed) should be executed. Conflicts with --all,--name and --range options.",
          type: "number",
          conflicts: migrationSelectionOptions.filter((o) => o !== "next"),
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
          describe: "Determines whether migrations should continue when an error is encountered.",
          type: "boolean",
        })
        .option("force", {
          alias: "f",
          describe:
            "Runs the specified migrations without checking the status file for previous runs.",
          type: "boolean",
        })
        .option("skipConfirmation", {
          type: "boolean",
          describe: "Skip the confirmation message.",
        })
        .option("kontentUrl", {
          type: "string",
          describe: 'Custom URL for Kontent.ai endpoints. Defaults to "kontent.ai".',
        })
        .check((args) => {
          if (!(args.all || args.name || args.range || args.next)) {
            throw new Error("Exactly one of the params --all --name --next --range must be set.");
          }

          return true;
        })
        .example(`${exampleMessagePrefix} --all (-a)`, "Run all migrations")
        .example(
          `${exampleMessagePrefix} --name (-n) myMigration.js`,
          "Run migration with the specified name.",
        )
        .example(`${exampleMessagePrefix} --next (-x) 10`, "Run next 10 migrations.")
        .example(
          `${exampleMessagePrefix} --range 1:5`,
          "Run migrations with order between 1 and 5 included.",
        )
        .example(
          `${exampleMessagePrefix} --range 1:T2025`,
          "Run migrations with order between 1 and before year 2025 included.",
        )
        .example(
          `${exampleMessagePrefix} --range T2024-06:T2025-02`,
          "Run migrations with order between the June of 2024 and February 2025",
        )
        .example(
          `${exampleMessagePrefix} --range :5`,
          "Run migrations with order up to 5 included.",
        )
        .example(
          `${exampleMessagePrefix} --range 2:`,
          "Run all migrations with order from 2 (included).",
        ),
    handler: (args) => runMigrationsCli(args).catch(simplifyErrors),
  });

type RunMigrationsCliParams = Readonly<{
  environmentId: string;
  apiKey: string;
  migrationsFolder: string;
  name: string | undefined;
  range: string | undefined;
  all: boolean | undefined;
  next: number | undefined;
  rollback: boolean | undefined;
  statusPlugins: string | undefined;
  continueOnError: boolean | undefined;
  force: boolean | undefined;
  skipConfirmation: boolean | undefined;
  kontentUrl: string | undefined;
}> &
  LogOptions;

const runMigrationsCli = async (params: RunMigrationsCliParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: `migrations-${commandName}`,
    baseUrl: params.kontentUrl,
  });

  const resolvedParams = resolveParams(params);

  if ("err" in resolvedParams) {
    logError(params, JSON.stringify(resolvedParams.err));
    process.exit(1);
  }

  await withMigrationsToRun(resolvedParams.value, async (migrations) => {
    const operation = resolvedParams.value.rollback ? "rollback" : "run";

    await checkConfirmation({
      message: `⚠ Running this operation may result in irreversible changes to your environment ${params.environmentId}.\nOK to proceed y/n? (suppress this message with --skipConfirmation parameter)\n`,
      skipConfirmation: params.skipConfirmation,
      logOptions: params,
    });

    const migrationsStatus = await executeMigrations(
      migrations,
      client,
      {
        operation,
        continueOnError: params.continueOnError ?? false,
      },
      params,
    );

    if (migrationsStatus.error) {
      return Promise.reject(migrationsStatus.status);
    }

    logInfo(params, "standard", "Successfully migrated.\n");

    return migrationsStatus.status;
  });
};

const resolveParams = (params: RunMigrationsCliParams): WithErr<RunMigrationsParams> => {
  const emptyParams = { next: undefined, name: undefined, range: undefined, all: undefined };

  return match(params)
    .returnType<WithErr<RunMigrationsParams>>()
    .with({ next: P.nonNullable }, ({ next }) => ({ value: { ...params, ...emptyParams, next } }))
    .with({ range: P.nonNullable }, ({ range }) => {
      const parsedRange = parseRange(range as string);
      if ("err" in parsedRange) {
        return parsedRange;
      }
      return { value: { ...params, ...emptyParams, range: parsedRange.value } };
    })
    .with({ name: P.nonNullable }, ({ name }) => ({ value: { ...params, ...emptyParams, name } }))
    .with({ all: P.nonNullable }, ({ all }) => ({ value: { ...params, ...emptyParams, all } }))
    .otherwise(() => ({ err: "Invalid parameters" }));
};
