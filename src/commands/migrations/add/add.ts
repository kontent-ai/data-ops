import { type LogOptions, logError } from "../../../log.js";
import { type AddMigrationParams, addMigration } from "../../../modules/migrations/add.js";
import type { MigrationModuleType } from "../../../modules/migrations/models/migration.js";
import type { RegisterCommand } from "../../../types/yargs.js";
import { simplifyErrors } from "../../../utils/error.js";

const commandName = "add";

export const register: RegisterCommand = (yargs) =>
  yargs.command({
    command: commandName,
    describe: "add",
    builder: (yargs) =>
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
          describe:
            "Specifies the path to the folder where the migration should be stored. Defaults to the current working directory.",
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
          describe:
            "Sets the current DateTime in the order property and prefixes the migration name with it.",
          type: "boolean",
          conflicts: ["order"],
        })
        .option("order", {
          alias: "o",
          describe: "Sets the order property to the provided value.",
          type: "number",
          conflicts: ["timestamp"],
        })
        .option("padWithLeadingZeros", {
          describe:
            "Specifies the number of leading zeros for the order number in the migration file name.",
          type: "number",
          conflicts: ["timestamp"],
          implies: "order",
        }),
    handler: (args) => addMigrationCli(args).catch(simplifyErrors),
  });

type AddMigrationCliParams = Readonly<{
  name: string;
  migrationsFolder: string | undefined;
  timestamp: boolean | undefined;
  order: number | undefined;
  padWithLeadingZeros: number | undefined;
  type: string;
}> &
  LogOptions;

const addMigrationCli = async (params: AddMigrationCliParams) => {
  try {
    await addMigration(resolveParams(params));
  } catch (e) {
    logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
    process.exit(1);
  }
};

const resolveParams = (args: AddMigrationCliParams): AddMigrationParams => {
  if (args.type !== "ts" && args.type !== "js") {
    throw new Error(
      `Invalid type '${args.type}'. Allowed values are 'ts' (TypeScript) or 'js' (JavaScript).`,
    );
  }

  const orderParams = {
    timestamp: args.timestamp,
    order: args.order,
    padWithLeadingZeros: args.padWithLeadingZeros,
  } as
    | { timestamp: true }
    | { timestamp: false | undefined; order: number }
    | { timestamp: false | undefined; order: number; padWithLeadingZeros: number | undefined };

  return {
    ...args,
    type: args.type as MigrationModuleType,
    ...orderParams,
  };
};
