import * as fs from "fs";
import * as path from "path";

import { throwError } from "../../../utils/error.js";
import { isStatus, isStatusPlugin, MigrationStatus, Operation, Status, StatusPlugin } from "../models/status.js";

const defaultStatusName = "status.json";
// const defaultPluginsName = "plugins.json";

export const defaultLoadStatus = (folderPath: string) => {
  const statusPath = path.join(folderPath, defaultStatusName);

  if (!fs.existsSync(statusPath)) {
    return {};
  }

  try {
    const environmentsMigrationStatuses = JSON.parse(fs.readFileSync(statusPath).toString());

    return isStatus(environmentsMigrationStatuses)
      ? environmentsMigrationStatuses
      : throwError("Status file is in incorrect format.");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
};

export const defaultSaveStatus = (folderPath: string, data: Status) => {
  const statusPath = path.join(folderPath, defaultStatusName);

  fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), { flag: "w" });
};

export const loadStatusPlugin = async (path: string): Promise<StatusPlugin> => {
  const pluginModule = await import(path);

  return isStatusPlugin(pluginModule)
    ? pluginModule
    : throwError("Invalid plugin: does not implement saveStatus or readStatus functions");
};

export const createMigrationStatus = (
  name: string,
  success: boolean,
  order: number | Date,
  lastOperation: Operation,
): MigrationStatus => ({ name, time: new Date(), success, order, lastOperation });

export const updateEnvironmentStatus = (
  environmentStatuses: ReadonlyArray<MigrationStatus>,
  statuses: ReadonlyArray<MigrationStatus>,
) => [
  ...environmentStatuses.map(oldStatus => statuses.find(newStatus => oldStatus.name == newStatus.name) ?? oldStatus),
  ...statuses.filter(newStatus => !environmentStatuses.find(oldStatus => newStatus === oldStatus)),
];
