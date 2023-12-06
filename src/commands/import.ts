import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fsPromises from "fs/promises";
import JSZip from "jszip";

import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { EntityDefinition, ImportContext } from "./importExportEntities/entityDefinition.js";

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
];

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

  await serially(entityDefinitions.map(def => async () => {
    console.log(`Importing ${def.name}...`);

    try {
      context = await root.file(`${def.name}.json`)
        ?.async("string")
        .then(def.deserializeEntities)
        .then(e => def.importEntities(client, e, context, root))
        ?? context;

      console.log(`${def.name} imported`);
    }
    catch (err) {
      console.error(`Failed to import entity ${def.name} due to error ${JSON.stringify(err)}. Stopping import...`);
      process.exit(1);
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
});
