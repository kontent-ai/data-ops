import chalk from "chalk";
import * as fs from "fs/promises";

import { logInfo, LogOptions } from "../log.js";
import { diff, TargetReference } from "../modules/sync/diff.js";
import { fetchModel, transformSyncModel } from "../modules/sync/generateSyncModel.js";
import {
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  FileContentModel,
  TaxonomySyncModel,
} from "../modules/sync/types/fileContentModel.js";
import { RegisterCommand } from "../types/yargs.js";
import { throwError } from "../utils/error.js";

export const register: RegisterCommand = yargs =>
  yargs.command(
    {
      command: "diff",
      describe: "compares two Kontent.ai content models",
      builder: yargs =>
        yargs
          .option("environmentId", {
            type: "string",
            describe: "Id of the target Kontent.ai environment that should be diffed",
            demandOption: "You need to provide the environmentId of the Kontent.ai to be synced",
            alias: "e",
          })
          .option("apiKey", {
            type: "string",
            describe: "Management API key of target Kontent.ai project",
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
            describe: "Id of Kontent.ai environmnent containing source contet model",
            conflicts: "folderName",
          implies: ["sourceApiKey"],
          })
          .option("sourceApiKey", {
            type: "string",
            describe: "Management API key of Kontent.ai environmnent containing source contet model",
            conflicts: "folderName",
          implies: ["sourceEnvironmentId"],
          }),
      handler: args => diffAsync(args),
    },
  );

export type SyncParams =
  & Readonly<{
    environmentId: string;
    apiKey: string;
    folderName?: string;
    sourceEnvironmentId?: string;
    sourceApiKey?: string;
  }>
  & LogOptions;

export const diffAsync = async (params: SyncParams) => {
  logInfo(
    params,
    "standard",
    `Diff content model between source environment ${
      chalk.blue(params.folderName ? `in ${params.folderName}` : params.environmentId)
    } and target environment ${chalk.blue(params.environmentId)}\n`,
  );

  const sourceModel = params.folderName
    ? await readFolder(params.folderName)
    : transformSyncModel(
      await fetchModel({
        environmentId: params.sourceEnvironmentId ?? throwError("sourceEnvironmentId should not be undefined"),
        apiKey: params.sourceApiKey ?? throwError("sourceApiKey should not be undefined"),
      }),
      params,
    );

  const targetModel = await fetchModel({ apiKey: params.apiKey, environmentId: params.environmentId });
  const assetsReferences = targetModel.assets.reduce((prev, current) => {
    prev.set(current.codename, { id: current.id, codename: current.codename });

    return prev;
  }, new Map<string, TargetReference>());
  const itemReferences = targetModel.items.reduce((prev, current) => {
    prev.set(current.codename, { id: current.id, codename: current.codename });

    return prev;
  }, new Map<string, TargetReference>());
  const transformedTargetModel = transformSyncModel(targetModel, params);

  const diffModel = diff({
    targetAssetsReferencedFromSourceByCodenames: assetsReferences,
    targetItemsReferencedFromSourceByCodenames: itemReferences,
    targetEnvModel: transformedTargetModel,
    sourceEnvModel: sourceModel,
  });

  diffModel as never;

  // printDiff(diffModel, params);
};

const readFolder = async (folderName: string): Promise<FileContentModel> => {
  const contentTypes = JSON.parse(
    await fs.readFile(`${folderName}/contentTypes.json`, "utf8"),
  ) as unknown as ReadonlyArray<
    ContentTypeSyncModel
  >;
  const snippets = JSON.parse(await fs.readFile(`${folderName}/snippets.json`, "utf8")) as unknown as ReadonlyArray<
    ContentTypeSnippetsSyncModel
  >;
  const taxonomyGroups = JSON.parse(
    await fs.readFile(`${folderName}/taxonomies.json`, "utf8"),
  ) as unknown as ReadonlyArray<
    TaxonomySyncModel
  >;

  return {
    contentTypes,
    contentTypeSnippets: snippets,
    taxonomyGroups: taxonomyGroups,
  };
};
