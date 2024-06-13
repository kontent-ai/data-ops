import chalk from "chalk";

import { logInfo, LogOptions } from "../../../log.js";
import { generateDiff } from "../../../modules/sync/advancedDiff.js";
import { diff } from "../../../modules/sync/diff.js";
import { fetchModel, transformSyncModel } from "../../../modules/sync/generateSyncModel.js";
import { printDiff } from "../../../modules/sync/printDiff.js";
import {
  getSourceItemAndAssetCodenames,
  getTargetContentModel,
  readContentModelFromFolder,
} from "../../../modules/sync/utils/getContentModel.js";
import { RegisterCommand } from "../../../types/yargs.js";
import { createClient } from "../../../utils/client.js";
import { simplifyErrors, throwError } from "../../../utils/error.js";

const commandName = "diff";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Compares content models from two Kontent.ai environments",
    builder: yargs =>
      yargs
        .option("targetEnvironmentId", {
          type: "string",
          describe: "Id of the target Kontent.ai environment that should be diffed",
          demandOption: "You need to provide the environmentId of your Kontent.ai environment",
          alias: "t",
        })
        .option("targetApiKey", {
          type: "string",
          describe: "Management API key of target Kontent.ai environment",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "tk",
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
          alias: "s",
        })
        .option("sourceApiKey", {
          type: "string",
          describe: "Management API key of Kontent.ai environmnent containing source content model",
          conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
          alias: "sk",
        })
        .option("advanced", {
          type: "boolean",
          describe: "Generate a detailed diff to an HTML file.",
          alias: "a",
          implies: ["outPath"],
        })
        .option("outPath", {
          type: "string",
          describe: "Path to the directory or file the diff will be generated into.",
          alias: "o",
          implies: ["advanced"],
        })
        .option("noOpen", {
          type: "boolean",
          describe: "Don't open the diff file automatically upon creation.",
          alias: "n",
          implies: ["advanced"],
        }),
    handler: args => diffAsync(args).catch(simplifyErrors),
  });

export type DiffParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
    advanced?: boolean;
    outPath?: string;
    noOpen?: boolean;
  }>
  & LogOptions;

export const diffAsync = async (params: DiffParams) => {
  logInfo(
    params,
    "standard",
    `Diff content model between source environment ${
      chalk.blue(params.folderName ? `in ${params.folderName}` : params.sourceEnvironmentId)
    } and target environment ${chalk.blue(params.targetEnvironmentId)}\n`,
  );

  const sourceModel = params.folderName
    ? await readContentModelFromFolder(params.folderName)
    : transformSyncModel(
      await fetchModel(
        createClient({
          environmentId: params.sourceEnvironmentId ?? throwError("sourceEnvironmentId should not be undefined"),
          apiKey: params.sourceApiKey ?? throwError("sourceApiKey should not be undefined"),
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

  return params.advanced
    ? generateDiff({ ...diffModel, ...params })
    : printDiff(diffModel, params);
};
