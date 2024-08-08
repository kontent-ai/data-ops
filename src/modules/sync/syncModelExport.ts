import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { fetchModel, saveSyncModel, transformSyncModel } from "./generateSyncModel.js";

export type SyncModelExportParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folderName?: string;
  }>
  & LogOptions;

export const syncModelExport = async (params: SyncModelExportParams) => {
  await syncModelExportInternal(
    params,
    createClient({ environmentId: params.environmentId, apiKey: params.apiKey, commandName: "sync-model-export-API" }),
  );
};

export const syncModelExportInternal = async (params: SyncModelExportParams, client: ManagementClient) => {
  logInfo(params, "standard", "Fetching the model from ", chalk.yellow(params.environmentId), ".");
  const environmentModel = await logOnError(
    chalk.red("Failed to fetch the model."),
    () => fetchModel(client),
  );

  logInfo(params, "standard", "Transforming the model.");
  const syncModel = transformSyncModel(environmentModel, params);

  const folderName = await logOnError(
    chalk.red("Failed to save the model into the file."),
    () => saveSyncModel({ syncModel, environmentId: params.environmentId, folderName: params.folderName }),
  );

  logInfo(params, "standard", `Model is successfully saved into a folder ${chalk.green(folderName)}.`);
};

const logOnError = async <T>(errorMessage: string, action: () => Promise<T>): Promise<T> => {
  try {
    return action();
  } catch (e) {
    throw new Error(`${errorMessage}: ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
  }
};
