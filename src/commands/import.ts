import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fsPromises from "fs/promises";
import JSZip from "jszip";

import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { contentItemsExportEntity } from "./importExportEntities/entities/contentItems.js";
import { contentTypesEntity } from "./importExportEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "./importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { DependentImportAction, EntityDefinition, ImportContext, validateEntityDefinitions } from "./importExportEntities/entityDefinition.js";

export const register: RegisterCommand = yargs => yargs.command({
  command: "import <fileName> <environmentId>",
  describe: "Imports data into the specified Kontent.ai project.",
  builder: yargs => yargs
    .positional("fileName", {
      type: "string",
      describe: "The name of the zip file with exported data to import.",
      demandOption: "You need to provide the export file name.",
    })
    .positional("environmentId", {
      type: "string",
      describe: "Id of the Kontent.ai environment to export",
      demandOption: "You need to provide the id of the Kontent.ai environment to import into.",
    })
    .option("apiKey", {
      type: "string",
      description: "Kontent.ai Management API key",
      demandOption: "Management API key is necessary for import to work."
    }),
  handler: args => importEntities(args),
});

// The entities will be imported in the order specified here.
// Keep in mind that there are dependencies between entities so the order is important.
const entityDefinitions: ReadonlyArray<EntityDefinition<any>> = [
  collectionsEntity,
  languagesEntity,
  taxonomiesEntity,
  assetFoldersEntity,
  assetsEntity,
  contentTypesSnippetsEntity,
  contentTypesEntity,
  contentItemsExportEntity,
];

const entityDefinitionValidationErrors = validateEntityDefinitions(entityDefinitions);
if (entityDefinitionValidationErrors.length) {
  throw new Error(`Invalid entityDefinitions for import command. Found errors:\n${entityDefinitionValidationErrors.join("; ")}`);
}

type ImportEntitiesParams = Readonly<{
  environmentId: string;
  fileName: string;
  apiKey: string;
}>;

const importEntities = async (params: ImportEntitiesParams) => {
  const root = await fsPromises.readFile(params.fileName).then(JSZip.loadAsync);
  const client = new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });


  console.log("Importing entities...");

  let context = createInitialContext();
  let waitingDependentActions: ReadonlyArray<WaitingDependentActions<unknown>> = [];

  await serially(entityDefinitions.map(def => async () => {
    console.log(`Importing ${def.name}...`);

    try {
      context = await root.file(`${def.name}.json`)
        ?.async("string")
        .then(def.deserializeEntities)
        .then(fileEntities => {
          if (def.dependentImportActions?.length) {
            waitingDependentActions = [...waitingDependentActions, ...def.dependentImportActions.map(action => ({ action, fileEntities }))];
          }
          return fileEntities;
        })
        .then(e => def.importEntities(client, e, context, root))
        ?? context;

      console.log(`${def.name} imported`);
    }
    catch (err) {
      console.error(`Failed to import entity ${def.name}.`, err, "\nStopping import...");
      process.exit(1);
    }

    try {
      waitingDependentActions = waitingDependentActions.map(a => ({
        ...a,
        action: {
          ...a.action,
          dependentOnEntities: a.action.dependentOnEntities.filter(e => e.name !== def.name),
        },
      }));

      const postActions = waitingDependentActions
        .filter(a => !a.action.dependentOnEntities.length)
        .map(a => () => a.action.action(client, a.fileEntities, context));

      await serially(postActions);

      waitingDependentActions = waitingDependentActions.filter(a => a.action.dependentOnEntities.length);
    }
    catch (err) {
      console.error(`Failed to execute a ${def.name} post-import action.`, err, "\nStopping import...");
      process.exit(2);
    }
  }));

  console.log(`All entities were successfully imported into environment ${params.environmentId}.`);
};

const createInitialContext = (): ImportContext => ({
  collectionIdsByOldIds: new Map(),
  languageIdsByOldIds: new Map(),
  taxonomyGroupIdsByOldIds: new Map(),
  taxonomyTermIdsByOldIds: new Map(),
  assetFolderIdsByOldIds: new Map(),
  assetIdsByOldIds: new Map(),
  contentTypeSnippetIdsWithElementsByOldIds: new Map(),
  contentItemIdsByOldIds: new Map(),
  contentTypeIdsWithElementsByOldIds: new Map(),
});

type WaitingDependentActions<T> = Readonly<{
  action: DependentImportAction<T>;
  fileEntities: T;
}>;
