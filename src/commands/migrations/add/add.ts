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
          demandOption: "You need to provide the name for the migration.",
        })
        .option("folder", {
          alias: "f",
          describe: "Path to folder where should migration be stored.",
        })
        .option("type", {
          alias: "t",
          describe: "Type of the scirpt. Allowed values 'ts' or 'js'. Default ts.",
          choices: ["js", "ts"],
        }),
    handler: () => {},
  });

export type AddMigrationParams =
  & Readonly<{
    name: string;
    folder?: string;
    type?: "js" | "ts";
  }>
  & LogOptions;
