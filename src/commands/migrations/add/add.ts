import { logError, LogOptions } from "../../../log.js";
import { addMigration } from "../../../modules/migrations/add.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "add";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "add",
    builder: yargs =>
      yargs
        .option("name", {
          alias: "n",
          describe: "Name of the migration.",
          demandOption: "You need to provide name of the migration.",
          type: "string",
        })
        .option("migrationsFolder", {
          alias: "m",
          type: "string",
          describe: "Path to folder where should migration be stored.",
        })
        .option("type", {
          alias: "t",
          describe: "Type of the script. Allowed values 'ts' or 'js'. Default ts.",
          type: "string",
          default: "ts",
          choices: ["js", "ts"],
        })
        .option("timestamp", {
          alias: "d",
          describe: "Adds the the current DateTime as order. Also the migration name starts with date.",
          type: "boolean",
          default: false,
        }),
    handler: args => addMigrationCli(args).catch(simplifyErrors),
  });

type AddMigrationCliParams =
  & Readonly<{
    name: string;
    migrationsFolder?: string;
    timestamp: boolean;
    type: string;
  }>
  & LogOptions;

const addMigrationCli = async (params: AddMigrationCliParams) => {
  try {
    await addMigration(params);
  } catch (e) {
    logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
  }
};
