import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { diff } from "./diff.js";
import { fetchModel, transformSyncModel } from "./generateSyncModel.js";
import { createAdvancedDiffFile, printDiff } from "./printDiff.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "./utils/getContentModel.js";

export type DiffEnvironmentsParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
  }>
  & (
    | Readonly<{ folderName: string }>
    | Readonly<{ sourceEnvironmentId: string; sourceApiKey: string }>
  )
  & (
    Readonly<{
      advanced: true;
      outPath?: string;
      noOpen?: boolean;
    }> | { advanced?: false }
  )
  & LogOptions;

export const diffEnvironments = async (params: DiffEnvironmentsParams) => {
  await diffEnvironmentsInternal(params, "diff-API");
};

export const diffEnvironmentsInternal = async (params: DiffEnvironmentsParams, commandName: string) => {
  logInfo(
    params,
    "standard",
    `Diff content model between source environment ${
      chalk.blue("folderName" in params ? `in ${params.folderName}` : params.sourceEnvironmentId)
    } and target environment ${chalk.blue(params.targetEnvironmentId)}\n`,
  );

  const sourceModel = "folderName" in params
    ? await readContentModelFromFolder(params.folderName)
    : transformSyncModel(
      await fetchModel(
        createClient({
          environmentId: params.sourceEnvironmentId,
          apiKey: params.sourceApiKey,
          commandName,
        }),
      ),
      params,
    );

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const targetEnvironmentClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
  });

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetEnvironmentClient,
    allCodenames,
    params,
  );

  const diffModel = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });

  return "advanced" in params
    ? createAdvancedDiffFile({ ...diffModel, ...params })
    : printDiff(diffModel, params);
};
