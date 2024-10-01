import chalk from "chalk";

import { logError, logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { syncEntityChoices } from "./constants/entities.js";
import { diff } from "./diff.js";
import { fetchModel, transformSyncModel } from "./generateSyncModel.js";
import { createAdvancedDiffFile, printDiff } from "./printDiff.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "./utils/getContentModel.js";

export type DiffEnvironmentsParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
  }
  & (
    | { folderName: string }
    | { folderName?: undefined; sourceEnvironmentId: string; sourceApiKey: string }
  )
  & (
    {
      advanced: true;
      outPath?: string;
      noOpen?: boolean;
    } | { advanced?: false }
  )
  & LogOptions
>;

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

  const sourceModel = "folderName" in params && params.folderName !== undefined
    ? await readContentModelFromFolder(params.folderName).catch(e => {
      if (e instanceof AggregateError) {
        logError(params, `Parsing model validation errors:\n${e.errors.map(e => e.message).join("\n")}`);
        process.exit(1);
      }
      logError(params, JSON.stringify(e, Object.getOwnPropertyNames(e)));
      process.exit(1);
    })
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
    : printDiff(diffModel, new Set(syncEntityChoices), params);
};
