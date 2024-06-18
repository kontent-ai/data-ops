import { LogOptions } from "../../../log.js";
import { RegisterCommand } from "../../../types/yargs.js";

const commandName = "add";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "add",
    builder: yargs =>
      yargs
        .option("name", {
          alias: "n",
          describe: "Name of the migration",
          demandOption: "You need to provide name of the migration",
          type: "string",
        })
        .option("folder", {
          alias: "f",
          type: "string",
          describe: "Path to folder where should migration be stored.",
        })
        .option("type", {
          alias: "t",
          describe: "Type of the scirpt. Allowed values 'ts' or 'js'. Default ts.",
          type: "string",
          default: "js",
          choices: ["js", "ts"],
        })
        .option("timestamp", {
          alias: "d",
          describe: "Adds the the current DateTime as order. Also the migration name starts with date.",
          type: "boolean",
          default: false,
        }),
  });

export type AddMigrationParams =
  & Readonly<{
    name: string;
    folder?: string;
    timestamp: boolean;
    type: string;
  }>
  & LogOptions;
