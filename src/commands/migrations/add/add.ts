import chalk from "chalk";
import { existsSync } from "fs";
import * as path from "path";

import { logError, logInfo, LogOptions } from "../../../log.js";
import { handleErr } from "../../../modules/migrations/utils/errUtils.js";
import { createFolder, saveFile } from "../../../modules/migrations/utils/fileUtils.js";
import {
  formatDateForFileName,
  generateJavascriptMigration,
  generateTypescriptMigration,
  getMigrationName,
} from "../../../modules/migrations/utils/migrationUtils.js";
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
          describe: "Type of the scirpt. Allowed values 'ts' or 'js'. Default ts.",
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
    handler: args => addMigration(args).catch(simplifyErrors),
  });

export type AddMigrationParams =
  & Readonly<{
    name: string;
    folder?: string;
    timestamp: boolean;
    type: string;
  }>
  & LogOptions;

const addMigration = async (params: AddMigrationParams) => {
  const folderPath = params.folder ?? process.cwd();

  if (!existsSync(folderPath)) {
    logInfo(params, "standard", `Creating folder ${folderPath}.`);

    const resultFolderPath = handleErr(createFolder(folderPath), params);

    logInfo(params, "standard", `Folder ${chalk.blue(resultFolderPath)} has been created successfully.`);
  }

  const currentDate = new Date();

  const migrationName = getMigrationName(
    params.name,
    params.type as "js" | "ts",
    params.timestamp ? formatDateForFileName(currentDate) : undefined,
  );
  const migrationData = params.type === "ts"
    ? generateTypescriptMigration(params.timestamp ? currentDate : undefined)
    : generateJavascriptMigration(params.timestamp ? currentDate : undefined);

  const migrationPath = path.join(folderPath, migrationName);

  logInfo(params, "standard", `Creating migration ${chalk.blue(migrationName)}`);
  const saveMigrationPath = handleErr(saveFile(migrationPath, migrationData), params);

  logInfo(
    params,
    "standard",
    `Migration ${chalk.blue(saveMigrationPath)} has been created sucessfully in ${chalk.blue(folderPath)}`,
  );
};
