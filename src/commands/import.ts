import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import StreamZip from "node-stream-zip";

import { logError, logInfo, LogOptions } from "../log.js";
import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { contentItemsEntity } from "./importExportEntities/entities/contentItems.js";
import {
  contentTypesEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
} from "./importExportEntities/entities/contentTypes.js";
import {
  contentTypesSnippetsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
} from "./importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { languageVariantsEntity } from "./importExportEntities/entities/languageVariants.js";
import { previewUrlsEntity } from "./importExportEntities/entities/previewUrls.js";
import { spacesEntity } from "./importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { workflowsEntity } from "./importExportEntities/entities/workflows.js";
import { EntityImportDefinition, ImportContext } from "./importExportEntities/entityDefinition.js";

// The entities will be imported in the order specified here.
// Keep in mind that there are dependencies between entities so the order is important.
const entityDefinitions: ReadonlyArray<EntityImportDefinition<any>> = [
  collectionsEntity,
  languagesEntity,
  taxonomiesEntity,
  assetFoldersEntity,
  assetsEntity,
  contentTypesSnippetsEntity,
  contentTypesEntity,
  contentItemsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
  workflowsEntity,
  spacesEntity,
  previewUrlsEntity,
  languageVariantsEntity,
];

const entityChoices = entityDefinitions.filter(e => !e.isDependentOn).map(e => e.name);

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: "import",
    describe: "Imports data into the specified Kontent.ai project.",
    builder: yargs =>
      yargs
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file with exported data to import.",
          demandOption: "You need to provide the filename of the zip file to import.",
          alias: "f",
        })
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to import into",
          demandOption: "You need to provide the id of the Kontent.ai environment to import into.",
          alias: "e",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("include", {
          type: "array",
          describe:
            "Only import the specified entities. (Keep in mind that some entities depend on others and may fail if their dependencies are not included.)",
          alias: "i",
          choices: entityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe:
            "Exclude the specified entities from the import. (Keep in mind that some entities depend on others and may fail if their dependencies are excluded.)",
          alias: "x",
          choices: entityChoices,
          conflicts: "include",
        }),
    handler: args => importEntities(args),
  });

type ImportEntitiesParams =
  & Readonly<{
    environmentId: string;
    fileName: string;
    apiKey: string;
    include?: ReadonlyArray<string>;
    exclude?: ReadonlyArray<string>;
  }>
  & LogOptions;

const importEntities = async (params: ImportEntitiesParams) => {
  const root = new StreamZip.async({ file: params.fileName });
  const client = new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });

  const shouldImport = (name: string) =>
    (!params.include || params.include.includes(name)) && !params.exclude?.includes(name);

  const definitionsToImport = entityDefinitions
    .filter(e => shouldImport(e.name) || (e.isDependentOn && shouldImport(e.isDependentOn)));

  logInfo(
    params,
    "standard",
    `Importing entities from ${chalk.blue(params.fileName)} into environment id ${params.environmentId}\n`,
  );

  let context = createInitialContext();

  await serially(definitionsToImport.map(def => async () => {
    logInfo(params, "standard", `Importing: ${chalk.yellow(def.name)}`);

    try {
      context = await root.entryData(`${def.name}.json`)
        .then(b => b.toString("utf8"))
        .then(def.deserializeEntities)
        .then(e => def.importEntities(client, e, context, params, root))
        ?? context;
    } catch (err) {
      logError(
        params,
        `Failed to import entity ${chalk.red(def.name)}. `,
        JSON.stringify(err, Object.getOwnPropertyNames(err)),
        "\nStopping import...",
      );
      process.exit(1);
    }
  }));

  logInfo(params, "standard", chalk.green("All entities were successfully imported."));
};

const createInitialContext = (): ImportContext => ({
  collectionIdsByOldIds: new Map(),
  languageIdsByOldIds: new Map(),
  taxonomyGroupIdsByOldIds: new Map(),
  taxonomyTermIdsByOldIds: new Map(),
  assetFolderIdsByOldIds: new Map(),
  assetIdsByOldIds: new Map(),
  contentTypeSnippetContextByOldIds: new Map(),
  contentItemContextByOldIds: new Map(),
  contentTypeContextByOldIds: new Map(),
  workflowIdsByOldIds: new Map(),
  workflowStepsIdsWithTransitionsByOldIds: new Map(),
  spaceIdsByOldIds: new Map(),
});
