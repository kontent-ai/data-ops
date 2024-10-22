import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { Replace } from "../../utils/types.js";
import { syncEntityChoices, syncEntityDependencies, SyncEntityName } from "./constants/entities.js";
import { diff } from "./diff.js";
import { diffHtmlTemplate } from "./utils/diffTemplateHtml.js";
import {
  fetchSourceSyncModel,
  getSourceItemAndAssetCodenames,
  getSourceSyncModelFromFolder,
  getTargetContentModel,
} from "./utils/getContentModel.js";
import { resolveHtmlTemplate } from "./utils/htmlRenderers.js";

export type SyncDiffParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
    entities?: ReadonlyArray<SyncEntityName>;
  }
  & (
    | { folderName: string }
    | { folderName?: undefined; sourceEnvironmentId: string; sourceApiKey: string }
  )
  & LogOptions
>;

export type SyncDiffParamsIntenal = Replace<SyncDiffParams, { entities: ReadonlyArray<SyncEntityName> }>;

/**
 * Compares two environments and generates an HTML representation of the differences.
 * The output includes differences using patch operations for better clarity of what has
 * been added, removed, or modified between the two environments.
 *
 * @returns {Promise<string>} HTML string containing the visual representation of the diff between the two environments.
 */
export const syncDiff = async (params: SyncDiffParams) => {
  const resolvedParams = { ...params, entities: params.entities ?? syncEntityChoices };
  const diffModel = await syncDiffInternal(resolvedParams, "diff-API");

  return resolveHtmlTemplate(diffHtmlTemplate, { ...diffModel, ...resolvedParams });
};

export const syncDiffInternal = async (params: SyncDiffParamsIntenal, commandName: string) => {
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
