import * as fsPromises from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import {
  type MigrationOperation,
  type MigrationStatus,
  type Status,
  type StatusPlugin,
  statusPluginSchema,
  statusSchema,
} from "../models/status.js";
import type { WithErr } from "./errUtils.js";

const defaultStatusFilename = "status.json";

export const loadStatus = async (getStatus: () => Promise<Status>): Promise<WithErr<Status>> =>
  getStatus()
    .then((r) => ({ value: r }))
    .catch((err) => ({ err }));

export const writeStatus = async (
  storeStatus: (status: Status) => Promise<void>,
  status: Status,
): Promise<WithErr<null>> =>
  storeStatus(status)
    .then(() => ({ value: null }))
    .catch((err) => ({ err }));

export const createDefaultReadStatus = (folderPath: string) => async (): Promise<Status> => {
  const statusPath = path.join(folderPath, defaultStatusFilename);

  if (!(await fsPromises.stat(statusPath).catch(() => false))) {
    return {};
  }
  const environmentsMigrationStatuses = JSON.parse(await fsPromises.readFile(statusPath, "utf-8"));

  return statusSchema.parse(environmentsMigrationStatuses);
};

export const createDefaultWriteStatus = (folderPath: string) => async (data: Status) => {
  const statusPath = path.join(folderPath, defaultStatusFilename);

  await fsPromises.writeFile(statusPath, JSON.stringify(data, null, 2), { flag: "w" });
};

export const loadStatusPlugin = async (pluginsPath: string): Promise<WithErr<StatusPlugin>> => {
  if (!(await fsPromises.stat(pluginsPath).catch(() => false))) {
    return { err: `Provided plugins path ${pluginsPath} does not exist.` };
  }

  const pluginModule = await import(pathToFileURL(pluginsPath).href);

  return { value: statusPluginSchema.parse(pluginModule) };
};

export const createMigrationStatus = (
  name: string,
  success: boolean,
  order: number | Date,
  lastOperation: MigrationOperation,
): MigrationStatus => ({ name, time: new Date(), success, order, lastOperation });

export const updateEnvironmentStatus = (
  environmentStatuses: ReadonlyArray<MigrationStatus>,
  statuses: ReadonlyArray<MigrationStatus>,
): Array<MigrationStatus> => [
  ...environmentStatuses.map(
    (oldStatus) => statuses.find((newStatus) => oldStatus.name === newStatus.name) ?? oldStatus,
  ),
  ...statuses.filter(
    (newStatus) => !environmentStatuses.find((oldStatus) => newStatus.name === oldStatus.name),
  ),
];
