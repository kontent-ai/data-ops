import { ManagementClient } from "@kontent-ai/management-sdk";
import chalk from "chalk";
import * as fsPromises from "fs/promises";
import JSZip from "jszip";

import packageFile from "../../package.json" assert { type: "json" };
import { RegisterCommand } from "../types/yargs.js";
import { serially } from "../utils/requests.js";
import { assetFoldersEntity } from "./importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "./importExportEntities/entities/assets.js";
import { collectionsEntity } from "./importExportEntities/entities/collections.js";
import { contentItemsExportEntity } from "./importExportEntities/entities/contentItems.js";
import { contentTypesEntity } from "./importExportEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "./importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./importExportEntities/entities/languages.js";
import { languageVariantsEntity } from "./importExportEntities/entities/languageVariants.js";
import { previewUrlsEntity } from "./importExportEntities/entities/previewUrls.js";
import { rolesExportEntity } from "./importExportEntities/entities/roles.js";
import { spacesEntity } from "./importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "./importExportEntities/entities/taxonomies.js";
import { workflowsEntity } from "./importExportEntities/entities/workflows.js";
import { EntityExportDefinition } from "./importExportEntities/entityDefinition.js";

const zip = new JSZip();

const {
  version,
} = packageFile;

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: "export",
    describe: "Exports data from the specified Kontent.ai project.",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          demandOption: "You need to provide the id of the Kontent.ai environment.",
        })
        .option("fileName", {
          type: "string",
          description: "Name of the zip file environment will be exported into.",
        })
        .option("apiKey", {
          type: "string",
          demandOption: "You need to provide the Management API key for given Kontent.ai environment",
        }),
    handler: args => exportEntities(args),
  });

const entityDefinitions: ReadonlyArray<EntityExportDefinition<any>> = [
  collectionsEntity,
  spacesEntity,
  taxonomiesEntity,
  languagesEntity,
  previewUrlsEntity,
  rolesExportEntity,
  workflowsEntity,
  contentTypesSnippetsEntity,
  contentTypesEntity,
  contentItemsExportEntity,
  languageVariantsEntity,
  assetFoldersEntity,
  assetsEntity,
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

  console.log(`\nExporting entities from environment with id ${chalk.bold.yellow(params.environmentId)}\n`);

  await serially(entityDefinitions.map(def => async () => {
    console.log(`Exporting: ${chalk.bold.yellow(def.name)}`);

    try {
      const entities = await def.fetchEntities(client);
      await def.addOtherFiles?.(entities, zip);
      const result = def.serializeEntities(entities);

      zip.file(`${def.name}.json`, result);
    } catch (err) {
      console.error(`Failed to export entity ${chalk.red(def.name)} due to error ${JSON.stringify(err)}. Stopping export...`);
      process.exit(1);
    }
  }));

  exportMetadata(params.environmentId);

  const fileName = params.fileName ?? `${new Date().toISOString()}-export-${params.environmentId}.zip`;

  await zip.generateAsync({ type: "nodebuffer" })
    .then(content => fsPromises.writeFile(fileName, content));

  console.log(`\nAll entities from environment ${chalk.yellow(params.environmentId)} were successfully exported into ${chalk.blue(fileName)}.`);
};

const exportMetadata = async (environmentId: string) => {
  const metadata = {
    version: version,
    timestamp: new Date(),
    environmentId,
  };

  zip.file("metadata.json", JSON.stringify(metadata));
};
