import { LogOptions } from "../../../log.js";
import { RegisterCommand } from "../../../types/yargs.js";

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
          type: "string",
          conflicts: migrationSelectionOptions.filter(o => o !== "all"),
        })
        .option("next", {
          alias: "x",
          describe:
            "Specifies the number of how many next migrations (not already executed) should be executed. Conflicts with --range --all and --next options.",
          type: "string",
          conflicts: migrationSelectionOptions.filter(o => o !== "next"),
        })
        .option("rollback", {
          alias: "r",
          describe: "Execute specified rollback function instead of run",
          type: "string",
        })
        .option("statusPlugins", {
          alias: "s",
          describe: "Path to a script that defines how to store and read status",
          type: "string",
        })
        .option("tsconfig", {
          describe: "Path to a tsconfig used when building .ts scripts",
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
        }),
    handler: () => {},
  });

export type RunMigrationParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folder: string;
    name?: string;
    range?: string;
    all?: boolean;
    next?: number;
    rollback?: boolean;
    statusPlugins?: string;
    tsconfig?: string;
    continueOnError?: boolean;
    force?: boolean;
  }>
  & LogOptions;
