import * as fs from "fs";
import * as path from "path";

import {
  MigrationStatus,
  Operation,
  Status,
  StatusPlugin,
  statusPluginSchema,
  statusSchema,
} from "../models/status.js";
import { WithErr } from "./errUtils.js";

const defaultStatusFilename = "status.json";

export const loadStatus = async (getStatus: () => Promise<Status>): Promise<WithErr<Status>> =>
  getStatus().then(r => ({ value: r })).catch((err) => ({ err }));

export const writeStatus = async (
  storeStatus: (status: Status) => Promise<void>,
  status: Status,
): Promise<WithErr<null>> => storeStatus(status).then(() => ({ value: null })).catch((err) => ({ err }));

export const createDefaultReadStatus = (folderPath: string) => async (): Promise<Status> => {
  const statusPath = path.join(folderPath, defaultStatusFilename);

  if (!fs.existsSync(statusPath)) {
    return {};
  }
  const environmentsMigrationStatuses = JSON.parse(fs.readFileSync(statusPath).toString());

  return statusSchema.parse(environmentsMigrationStatuses);
};

export const createDefaultWriteStatus = (folderPath: string) => async (data: Status) => {
  const statusPath = path.join(folderPath, defaultStatusFilename);

  fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), { flag: "w" });
};

export const loadStatusPlugin = async (path: string): Promise<WithErr<StatusPlugin>> => {
  if (!fs.existsSync(path)) {
    return { err: `Provided plugins path ${path} does not exists` };
  }

  const pluginModule = await import(path);

  return { value: statusPluginSchema.parse(pluginModule) };
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
): Array<MigrationStatus> => [
  ...environmentStatuses.map(oldStatus => statuses.find(newStatus => oldStatus.name == newStatus.name) ?? oldStatus),
  ...statuses.filter(newStatus => !environmentStatuses.find(oldStatus => newStatus.name === oldStatus.name)),
];
