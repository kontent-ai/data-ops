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
          type: "string",
          describe: "Specifies the name of the migration.",
          demandOption: "You need to provide name of the migration.",
        })
        .option("migrationsFolder", {
          alias: "m",
          type: "string",
          describe: "Specifies the path to the folder where the migration should be stored.",
        })
        .option("type", {
          alias: "t",
          type: "string",
          describe:
            "Specifies the script type. Allowed values are 'ts' (TypeScript) or 'js' (JavaScript). Default is 'ts'.",
          default: "ts",
          choices: ["js", "ts"],
        })
        .option("timestamp", {
          alias: "d",
          describe: "Sets the current DateTime in the order property and prefixes the migration name with it.",
          type: "boolean",
          default: false,
        }),
    handler: args => addMigrationCli(args).catch(simplifyErrors),
  });

type AddMigrationCliParams =
  & Readonly<{
    name: string;
    migrationsFolder: string | undefined;
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
