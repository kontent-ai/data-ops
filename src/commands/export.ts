import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fsPromises from "fs/promises";
import JSZip from "jszip";

import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { collectionsExportEntity } from "./export/entities/collections.js";
import { languagesExportEntity } from "./export/entities/languages.js";
import { previewUrlsExportEntity } from "./export/entities/previewUrls.js";
import { spacesExportEntity } from "./export/entities/spaces.js";
import { taxonomiesExportEntity } from "./export/entities/taxonomies.js";
import { EntityDefinition } from "./export/entityDefinition.js";

const zip = new JSZip();

export const register: RegisterCommand = yargs => yargs.command({
  command: "export <environmentId>",
  describe: "Exports data from the specified Kontent.ai project.",
  builder: yargs => yargs
    .positional("environmentId", {
      type: "string",
      description: "Id of the Kontent.ai environment to export",
      demandOption: "You need to provide the id of the Kontent.ai environment to export.",
    })
    .option("fileName", {
      type: "string",
      description: "Name of the exported file",
    })
    .option("apiKey", {
      type: "string",
      description: "Kontent.ai Management API key",
      demandOption: "Management API key is necessary for export to work."
    }),
  handler: args => exportEntities(args),
});

const entityDefinitions: ReadonlyArray<EntityDefinition<any>> = [
  collectionsExportEntity,
  spacesExportEntity,
  taxonomiesExportEntity,
  languagesExportEntity,
  previewUrlsExportEntity
];

type ExportEntitiesParams = Readonly<{
  environmentId: string;
  fileName: string | undefined;
  apiKey: string;
}>;

const exportEntities = async (params: ExportEntitiesParams): Promise<void> => {
  const client = new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });

  console.log("Exporting entities...");

  await serially(entityDefinitions.map(def => async () => {
    console.log(`Exporting ${def.name}...`);
    try {
      const result = await createExportEntity(client, def);
      console.log(`${def.name} exported.`);
      zip.file(`${def.name}.json`, result);
    }
    catch (err) {
      console.error(`Could not export the project with environment id ${params.environmentId} due to ${err}`);
      process.exit(1);
    }
  }));

  const fileName = params.fileName ?? `${new Date().toISOString()}-export-${params.environmentId}.zip`;

  await zip.generateAsync({ type: "nodebuffer" })
    .then(content => fsPromises.writeFile(fileName, content));

  console.log(`All entities exported into ${fileName}.`);
};

const createExportEntity = (client: ManagementClient, definition: EntityDefinition<unknown>) => definition.fetchEntities(client)
  .then(definition.serializeEntities);
