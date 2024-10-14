import chalk from "chalk";
import { resolve } from "path";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { syncEntityDependencies, SyncEntityName } from "./constants/entities.js";
import { diff } from "./diff.js";
import { readHtmlFile } from "./utils/fileUtils.js";
import {
  fetchSourceSyncModel,
  getSourceItemAndAssetCodenames,
  getSourceSyncModelFromFolder,
  getTargetContentModel,
} from "./utils/getContentModel.js";
import { resolveHtmlTemplate } from "./utils/htmlRenderers.js";

export type DiffEnvironmentsParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
    entities: ReadonlyArray<SyncEntityName>;
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

  const fetchDependencies = new Set(
    params.entities.flatMap(e => syncEntityDependencies[e as SyncEntityName]),
  );

  const sourceModel = "folderName" in params && params.folderName !== undefined
    ? await getSourceSyncModelFromFolder(
      params.folderName,
      new Set(params.entities) as ReadonlySet<SyncEntityName>,
    ).catch(e => {
      if (e instanceof AggregateError) {
        throw new Error(`Parsing model validation errors:\n${e.errors.map(e => e.message).join("\n")}`);
      }
      throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    })
    : await fetchSourceSyncModel(
      createClient({
        environmentId: params.sourceEnvironmentId,
        apiKey: params.sourceApiKey,
        commandName,
      }),
      fetchDependencies,
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
    fetchDependencies,
  );

  return diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });
};
