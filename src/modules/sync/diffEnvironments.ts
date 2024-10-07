import chalk from "chalk";
import { resolve } from "path";

import { logError, logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { diff } from "./diff.js";
import { fetchModel, transformSyncModel } from "./generateSyncModel.js";
import { readHtmlFile } from "./utils/fileUtils.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "./utils/getContentModel.js";
import { resolveHtmlTemplate } from "./utils/htmlRenderers.js";

export type DiffEnvironmentsParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
  }
  & (
    | { folderName: string }
    | { folderName?: undefined; sourceEnvironmentId: string; sourceApiKey: string }
  )
  & LogOptions
>;

/**
 * Compares two environments and generates an HTML representation of the differences.
 * The output includes differences using patch operations for better clarity of what has
 * been added, removed, or modified between the two environments.
 *
 * @returns {Promise<string>} HTML string containing the visual representation of the diff between the two environments.
 */
export const diffEnvironments = async (params: DiffEnvironmentsParams) => {
  const diffModel = await diffEnvironmentsInternal(params, "diff-API");
  const templateString = readHtmlFile(resolve(import.meta.dirname, "./utils/diffTemplate.html"));

  return resolveHtmlTemplate(templateString, { ...diffModel, ...params });
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

  return diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });
};
