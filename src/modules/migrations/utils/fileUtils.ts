import fs from "fs";

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
