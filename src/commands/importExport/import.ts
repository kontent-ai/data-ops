import chalk from "chalk";
import StreamZip from "node-stream-zip";

import { logError, logInfo, LogOptions } from "../../log.js";
import { assetFoldersEntity } from "../../modules/importExport/importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "../../modules/importExport/importExportEntities/entities/assets.js";
import { collectionsEntity } from "../../modules/importExport/importExportEntities/entities/collections.js";
import { contentItemsEntity } from "../../modules/importExport/importExportEntities/entities/contentItems.js";
import {
  contentTypesEntity,
  updateItemAndTypeReferencesInTypesImportEntity,
} from "../../modules/importExport/importExportEntities/entities/contentTypes.js";
import {
  contentTypesSnippetsEntity,
  updateItemAndTypeReferencesInSnippetsImportEntity,
} from "../../modules/importExport/importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "../../modules/importExport/importExportEntities/entities/languages.js";
import { languageVariantsEntity } from "../../modules/importExport/importExportEntities/entities/languageVariants.js";
import { previewUrlsEntity } from "../../modules/importExport/importExportEntities/entities/previewUrls.js";
import { spacesEntity } from "../../modules/importExport/importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "../../modules/importExport/importExportEntities/entities/taxonomies.js";
import { webhooksEntity } from "../../modules/importExport/importExportEntities/entities/webhooks.js";
import { workflowsEntity } from "../../modules/importExport/importExportEntities/entities/workflows.js";
import {
  EntityImportDefinition,
  ImportContext,
} from "../../modules/importExport/importExportEntities/entityDefinition.js";
import { RegisterCommand } from "../../types/yargs.js";
import { createClient } from "../../utils/client.js";
import { simplifyErrors } from "../../utils/error.js";
import { serially } from "../../utils/requests.js";

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
  webhooksEntity,
];

const entityChoices = entityDefinitions.filter(e => !e.isDependentOn).map(e => e.name);

const commandName = "import";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
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
    handler: args => importEntities(args).catch(simplifyErrors),
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
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName,
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
    logInfo(params, "standard", `Importing: ${chalk.yellow(def.displayName)}`);

    try {
      context = await root.entryData(`${def.name}.json`)
        .then(b => b.toString("utf8"))
        .then(def.deserializeEntities)
        .then(e => def.importEntities(client, e, context, params, root))
        ?? context;
    } catch (err) {
      logError(
        params,
        `Failed to import entity ${chalk.red(def.displayName)}. `,
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
  oldAssetCodenamesByIds: new Map(),
  contentTypeSnippetContextByOldIds: new Map(),
  contentItemContextByOldIds: new Map(),
  oldContentItemCodenamesByIds: new Map(),
  contentTypeContextByOldIds: new Map(),
  workflowIdsByOldIds: new Map(),
  workflowStepsIdsWithTransitionsByOldIds: new Map(),
  spaceIdsByOldIds: new Map(),
});
