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
import { ErrorLike } from "../types/err.js";
import { createOrderComparator } from "./orderUtils.js";

const defaultStatusName = "status.json";

export const loadStatus = async (getStatus: () => Promise<Status>): Promise<ErrorLike<Status>> =>
  getStatus().catch((e) => ({ err: JSON.stringify(e) }));

export const writeStatus = async (
  storeStatus: (status: Status) => Promise<void>,
  status: Status,
): Promise<ErrorLike<void>> => storeStatus(status).catch((e) => ({ err: JSON.stringify(e) }));

export const createDefaultReadStatus = (folderPath: string) => async (): Promise<Status> => {
  const statusPath = path.join(folderPath, defaultStatusName);

  if (!fs.existsSync(statusPath)) {
    return {};
  }
  const environmentsMigrationStatuses = JSON.parse(fs.readFileSync(statusPath).toString());

  return statusSchema.parse(environmentsMigrationStatuses);
};

export const createDefaultSaveStatus = (folderPath: string) => async (data: Status) => {
  const statusPath = path.join(folderPath, defaultStatusName);

  fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), { flag: "w" });
};

export const loadStatusPlugin = async (path: string): Promise<ErrorLike<StatusPlugin>> => {
  if (!fs.existsSync(path)) {
    return { err: `Provided plugins path ${path} does not exists` };
  }

  const pluginModule = await import(path);

  return statusPluginSchema.parse(pluginModule);
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
  ...statuses.filter(newStatus => !environmentStatuses.find(oldStatus => newStatus === oldStatus)),
];

export const getLastMigrationFromStatus = (
  environmentStatus: ReadonlyArray<MigrationStatus>,
  operation: Operation,
) => {
  const statusComparator = createOrderComparator<MigrationStatus>("asc", entity => entity.order);

  const sortedStatus = environmentStatus.toSorted(statusComparator);
  const filteredStatuses = sortedStatus.filter(s => s.lastOperation === operation);

  return filteredStatuses[filteredStatuses.length - 1] ?? null;
};
