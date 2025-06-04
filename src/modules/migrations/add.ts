import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import chalk from "chalk";

import { type LogOptions, logInfo } from "../../log.js";
import { padWithLeadingZeros } from "../../utils/number.js";
import type { MigrationModuleType } from "./models/migration.js";
import { handleErr } from "./utils/errUtils.js";
import { createFolder, saveFile } from "./utils/fileUtils.js";
import {
  generateJavascriptMigration,
  generateTypescriptMigration,
  getMigrationName,
} from "./utils/migrationUtils.js";

export type AddMigrationParams = Readonly<
  {
    name: string;
    migrationsFolder?: string;
    type: MigrationModuleType;
  } & TimestampOrOrderParams &
    LogOptions
>;

export const addMigration = async (params: AddMigrationParams) => {
  const folderPath = params.migrationsFolder ?? process.cwd();

  if (!(await fsPromises.stat(folderPath).catch(() => false))) {
    logInfo(params, "standard", `Creating folder ${folderPath}.`);

    const resultFolderPath = handleErr(createFolder(folderPath), params);

    logInfo(
      params,
      "standard",
      `Folder ${chalk.blue(resultFolderPath)} has been created successfully.`,
    );
  }

  const currentDate = new Date();

  const migrationName = getMigrationName(
    params.name,
    params.type,
    params.timestamp
      ? currentDate
      : params.order === undefined
        ? undefined
        : `${padWithLeadingZeros(params.order, params.padWithLeadingZeros)}-`,
  );
  const migrationData =
    params.type === "ts"
      ? generateTypescriptMigration(params.timestamp ? currentDate : params.order)
      : generateJavascriptMigration(params.timestamp ? currentDate : params.order);

  const migrationPath = path.join(folderPath, migrationName);

  logInfo(params, "standard", `Creating migration ${chalk.blue(migrationName)}`);
  const saveMigrationPath = handleErr(saveFile(migrationPath, migrationData), params);

  logInfo(
    params,
    "standard",
    `Migration ${migrationName} has been created successfully in ${chalk.blue(saveMigrationPath)}`,
  );
};

type TimestampOrOrderParams =
  | Readonly<{ timestamp: true }>
  | Readonly<{ timestamp?: false } & OrderParams>;

type OrderParams =
  | Readonly<{ order: number; padWithLeadingZeros?: number }>
  | Readonly<{ order?: never }>;
