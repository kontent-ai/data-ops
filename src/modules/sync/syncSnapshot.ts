import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { SyncEntityName } from "./constants/entities.js";
import { fetchModel, filterModel, saveSyncModel, transformSyncModel } from "./generateSyncModel.js";
import { SyncEntities } from "./syncRun.js";

export type SyncSnapshotParams = Readonly<
  & {
    environmentId: string;
    apiKey: string;
    entities: SyncEntities;
    folderName?: string;
    kontentUrl?: string;
  }
  & LogOptions
>;

export const syncSnapshot = async (params: SyncSnapshotParams) => {
  await syncSnapshotInternal(
    params,
    createClient({
      environmentId: params.environmentId,
      apiKey: params.apiKey,
      commandName: "sync-snapshot-API",
      baseUrl: params.kontentUrl,
    }),
  );
};

export const syncSnapshotInternal = async (params: SyncSnapshotParams, client: ManagementClient) => {
  logInfo(params, "standard", "Fetching the model from ", chalk.yellow(params.environmentId), ".");
  const environmentModel = await logOnError(
    chalk.red("Failed to fetch the model."),
    () => fetchModel(client, new Set(Object.keys(params.entities) as ReadonlyArray<SyncEntityName>)),
  );

  logInfo(params, "standard", "Transforming the model.");
  const syncModel = transformSyncModel(environmentModel, params);

  const filteredModel = filterModel(syncModel, params.entities);

  const folderName = await logOnError(
    chalk.red("Failed to save the model into the file."),
    () =>
      saveSyncModel({
        syncModel: filteredModel,
        environmentId: params.environmentId,
        folderName: params.folderName,
        entities: new Set(Object.keys(params.entities)) as ReadonlySet<SyncEntityName>,
      }),
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
