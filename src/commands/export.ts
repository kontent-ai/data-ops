import { ManagementClient } from "@kontent-ai/management-sdk";
import * as fsPromises from "fs/promises";

import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { collectionExportEntity } from "./export/entities/collections.js";
import { EntityDefinition } from "./export/entityDefinition.js";

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
  collectionExportEntity,
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
    const result = await createExportEntity(client, params.fileName ?? `./export-${params.environmentId}.json`)(def);
    console.log(`${def.name} exported.`);
    return result;
  }));

  console.log("All entities exported.");
};

const createExportEntity = (client: ManagementClient, fileName: string) =>
  (definition: EntityDefinition<unknown>) => definition.fetchEntities(client)
      .then(definition.serializeEntities)
      .then(content => fsPromises.writeFile(`./${fileName}`, content, "utf8"));
