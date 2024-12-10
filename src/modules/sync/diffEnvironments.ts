import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { Replace } from "../../utils/types.js";
import { formatEnvironmentInformation } from "../shared/cli.js";
import { getEnvironmentInformation } from "../shared/mapiUtils.js";
import { syncEntityChoices, syncEntityDependencies, SyncEntityName } from "./constants/entities.js";
import { diff } from "./diff.js";
import { DiffModel } from "./types/diffModel.js";
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
    kontentUrl?: string;
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
  const targetEnvironmentClient = createClient({
    apiKey: params.targetApiKey,
    environmentId: params.targetEnvironmentId,
    commandName,
    baseUrl: params.kontentUrl,
  });

  return "folderName" in params && params.folderName !== undefined
    ? diffSourceFolder(params.folderName, targetEnvironmentClient, params.entities, params)
    : diffSourceRemote(
      createClient({
        environmentId: params.sourceEnvironmentId,
        apiKey: params.sourceApiKey,
        commandName,
        baseUrl: params.kontentUrl,
      }),
      targetEnvironmentClient,
      params.entities,
      params,
    );
};

const diffSourceFolder = async (
  folderName: string,
  targetEnvironmentClient: ManagementClient,
  entities: ReadonlyArray<SyncEntityName>,
  logOptions: LogOptions,
): Promise<DiffModel> => {
  const formattedTargetEnvInfo = formatEnvironmentInformation(await getEnvironmentInformation(targetEnvironmentClient));

  logInfo(
    logOptions,
    "standard",
    `Diff content model between source environment ${
      chalk.blue(folderName)
    } and target environment ${formattedTargetEnvInfo}\n`,
  );

  const fetchDependencies = new Set(
    entities.flatMap(e => syncEntityDependencies[e as SyncEntityName]),
  );

  const sourceModel = await getSourceSyncModelFromFolder(folderName, new Set(entities) as ReadonlySet<SyncEntityName>)
    .catch(e => {
      if (e instanceof AggregateError) {
        throw new Error(`Parsing model validation errors:\n${e.errors.map(e => e.message).join("\n")}`);
      }
      throw new Error(JSON.stringify(e, Object.getOwnPropertyNames(e)));
    });

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetEnvironmentClient,
    allCodenames,
    logOptions,
    fetchDependencies,
  );

  return diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });
};

const diffSourceRemote = async (
  sourceEnviromentClient: ManagementClient,
  targetEnvironmentClient: ManagementClient,
  entities: ReadonlyArray<SyncEntityName>,
  logOptions: LogOptions,
): Promise<DiffModel> => {
  const formattedSourceEnvInfo = formatEnvironmentInformation(await getEnvironmentInformation(sourceEnviromentClient));
  const formattedTargetEnvInfo = formatEnvironmentInformation(await getEnvironmentInformation(targetEnvironmentClient));

  logInfo(
    logOptions,
    "standard",
    `Diff:
Source environment: ${formattedSourceEnvInfo}
Target environment: ${formattedTargetEnvInfo}\n`,
  );

  const fetchDependencies = new Set(
    entities.flatMap(e => syncEntityDependencies[e as SyncEntityName]),
  );

  const sourceModel = await fetchSourceSyncModel(sourceEnviromentClient, fetchDependencies, logOptions);

  const allCodenames = getSourceItemAndAssetCodenames(sourceModel);

  const { assetsReferences, itemReferences, transformedTargetModel } = await getTargetContentModel(
    targetEnvironmentClient,
    allCodenames,
    logOptions,
    fetchDependencies,
  );

  return diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });
};
