import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";

import { logError, LogOptions } from "../log.js";
import { diff } from "../modules/sync/diff.js";
import { fetchModel, transformSyncModel } from "../modules/sync/generateSyncModel.js";
import { printDiff } from "../modules/sync/printDiff.js";
import { sync } from "../modules/sync/sync.js";
import { requestConfirmation } from "../modules/sync/utils/consoleHelpers.js";
import { getRequiredCodenames } from "../modules/sync/utils/contentTypeHelpers.js";
import { fetchRequiredAssetsByCodename, fetchRequiredContentItemsByCodename } from "../modules/sync/utils/fetchers.js";
import { readContentModelFromFolder } from "../modules/sync/utils/getContentModel.js";
import { validateContentFolder, validateContentModel } from "../modules/sync/validation.js";
import { RegisterCommand } from "../types/yargs.js";
import { throwError } from "../utils/error.js";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: "sync",
    describe: "Synchronize content model between two Kontent.ai environments",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment.",
          demandOption: "You need to provide the environmentId of your Kontent.ai environment",
          alias: "e",
        })
        .option("apiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("folderName", {
          type: "string",
          describe: "Name of the folder containing source content model",
          alias: "f",
          conflicts: ["sourceApiKey", "sourceEnvironmentId"],
        })
        .option("sourceEnvironmentId", {
          type: "string",
          describe: "Id of Kontent.ai environmnent containing source content model",
          conflicts: "folderName",
          implies: ["sourceApiKey"],
        })
        .option("sourceApiKey", {
          type: "string",
          describe: "Management API key of Kontent.ai environmnent containing source content model",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
        })
        .option("skipWarning", {
          type: "boolean",
          describe: "Skip warning message.",
          alias: "s",
        }),
    handler: args => syncContentModel(args),
  });

export type SyncParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
    skipWarning?: boolean;
  }>
  & LogOptions;

export const syncContentModel = async (params: SyncParams) => {
  if (params.folderName) {
    const folderErrors = await validateContentFolder(params.folderName);
    if (folderErrors.length) {
      folderErrors.forEach(e => logError(params, "standard", e));
      process.exit(1);
    }
  }

  const sourceModel = params.folderName
    ? await readContentModelFromFolder(params.folderName)
    : transformSyncModel(
      await fetchModel(
        new ManagementClient({
          environmentId: params.sourceEnvironmentId ?? throwError("sourceEnvironmentId should not be undefined"),
          apiKey: params.sourceApiKey ?? throwError("sourceApiKey should not be undefined"),
        }),
      ),
      params,
    );

  const allCodenames = [...sourceModel.contentTypes, ...sourceModel.contentTypeSnippets].reduce<
    { assetCodenames: Set<string>; itemCodenames: Set<string> }
  >(
    (previous, type) => {
      const ids = getRequiredCodenames(type.elements);

      return {
        assetCodenames: new Set([...previous.assetCodenames, ...ids.assetCodenames]),
        itemCodenames: new Set([...previous.itemCodenames, ...ids.itemCodenames]),
      };
    },
    { assetCodenames: new Set(), itemCodenames: new Set() },
  );

  const targetEnvironmentClient = new ManagementClient({ apiKey: params.apiKey, environmentId: params.environmentId });

  const targetModel = await fetchModel(targetEnvironmentClient);
  const targetAssetsBySourceCodenames = await fetchRequiredAssetsByCodename(
    targetEnvironmentClient,
    Array.from(allCodenames.assetCodenames),
  );
  const targetItemsBySourceCodenames = await fetchRequiredContentItemsByCodename(
    targetEnvironmentClient,
    Array.from(allCodenames.itemCodenames),
  );

  const assetsReferences = new Map(
    targetAssetsBySourceCodenames.map(i => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const itemReferences = new Map(
    targetItemsBySourceCodenames.map(i => [i.codename, { id: i.id, codename: i.codename }]),
  );
  const transformedTargetModel = transformSyncModel(targetModel, params);

  const modelErrors = await validateContentModel(sourceModel, transformedTargetModel);
  if (modelErrors.length) {
    modelErrors.forEach(e => logError(params, "standard", e));
    process.exit(1);
  }

  const diffModel = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });

  printDiff(diffModel, params);

  const warningMessage = chalk.yellow(
    `⚠ Running this operation may result in irreversible changes to the content in environment ${params.environmentId}.\n\nOK to proceed y/n? (suppress this message with -s parameter)\n`,
  );

  const confirmed = !params.skipWarning ? await requestConfirmation(warningMessage) : true;

  if (!confirmed) {
    logError(params, chalk.red("Operation aborted."));
    process.exit(1);
  }

  await sync(new ManagementClient({ environmentId: params.environmentId, apiKey: params.apiKey }), diffModel);
};
