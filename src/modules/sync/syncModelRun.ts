import { ManagementClient } from "@kontent-ai/management-sdk";

import { logError, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { diff } from "./diff.js";
import { fetchModel, transformSyncModel } from "./generateSyncModel.js";
import { sync } from "./sync.js";
import { DiffModel } from "./types/diffModel.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "./utils/getContentModel.js";
import { validateDiffedModel, validateSyncModelFolder } from "./validation.js";

export type SyncModelRunParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
  }
  & (
    | { folderName: string }
    | { sourceEnvironmentId: string; sourceApiKey: string }
  )
  & LogOptions
>;

export const syncModelRun = async (params: SyncModelRunParams) => {
  const commandName = "sync-model-run-API";
  const targetEnvironmentClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
  });

  const diffModel = await getDiffModel(params, targetEnvironmentClient, commandName);

  await validateTargetEnvironment(diffModel, targetEnvironmentClient);

  await sync(
    targetEnvironmentClient,
    diffModel,
    params,
  );
};

export const getDiffModel = async (
  params: SyncModelRunParams,
  targetClient: ManagementClient,
  commandName: string,
) => {
  if ("folderName" in params) {
    const folderErrors = await validateSyncModelFolder(params.folderName);
    if (folderErrors.length) {
      return Promise.reject(folderErrors);
    }
  }

  const sourceModel = "folderName" in params
    ? await readContentModelFromFolder(params.folderName).catch(e => {
      if (e instanceof AggregateError) {
        logError(params, `Parsing model validation errors:\n${e.errors.map(e => e.message).join("\n")}`);
        process.exit(1);
      }
      logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
      process.exit(1);
    })
    : transformSyncModel(
      await fetchModel(createClient({
        environmentId: params.sourceEnvironmentId,
        apiKey: params.sourceApiKey,
        commandName,
      })),
      params,
    );

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetClient,
    allCodenames,
    params,
  );

  return diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });
};

export const validateTargetEnvironment = async (
  diffModel: DiffModel,
  targetClient: ManagementClient,
) => {
  const diffErrors = await validateDiffedModel(targetClient, diffModel);

  if (diffErrors.length) {
    return Promise.reject(diffErrors);
  }
};
