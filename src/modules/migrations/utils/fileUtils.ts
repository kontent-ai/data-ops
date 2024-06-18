import fs from "fs";

import { MigrationModule } from "../models/migration.js";

export const loadMigrationFiles = (folderPath: string, fileExtension: string) => {
  try {
    return fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(file => file.isFile() && file.name.endsWith(fileExtension))
      .map(file => ({ name: file.name, module: loadModule(file.name) }));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const loadModule = async (migrationPath: string) =>
  await import(migrationPath)
    .then(async (module) => module.default as MigrationModule);

export const getMigrationPath = (migrationFilename: string, folderPath: string) =>
  folderPath.endsWith("/") ? folderPath + migrationFilename : `${folderPath}/${migrationFilename}`;

export const createFolder = (folderPath: string) => {
  try {
    fs.mkdirSync(folderPath, { recursive: true });
  } catch (e) {
    return { error: `Couldn't save the migration. ${e instanceof Error ? e.message : "Unknown error occurred."}` };
  }

  return folderPath;
};

export const saveMigrationFile = (
  migrationPath: string,
  migrationData: string,
) => {
  try {
    fs.writeFileSync(migrationPath, migrationData);
  } catch (e) {
    return { error: `Couldn't save the migration. ${e instanceof Error ? e.message : "Unknown error occurred."}` };
  }

  return migrationPath;
};
