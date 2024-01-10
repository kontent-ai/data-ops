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
import { contentItemsEntity } from "./importExportEntities/entities/contentItems.js";
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
  contentItemsEntity,
  languageVariantsEntity,
  assetFoldersEntity,
  assetsEntity,
];

const entityChoices = entityDefinitions.map(e => e.name);

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: "export",
    describe: "Exports data from the specified Kontent.ai project into a .zip file.",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to export.",
          demandOption: "You need to provide the id of the Kontent.ai environment.",
          alias: "e",
        })
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file where the environment will be exported to.",
          alias: "f",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide the Management API key for the given Kontent.ai environment.",
          alias: "k",
        })
        .option("include", {
          type: "array",
          describe: "Only export specified entities.",
          alias: "i",
          choices: entityChoices,
          conflicts: "exclude",
        })
        .option("exclude", {
          type: "array",
          describe: "Exclude the specified entities from the export.",
          alias: "x",
          choices: entityChoices,
          conflicts: "include",
        }),
    handler: args => exportEntities(args),
  });

type ExportEntitiesParams = Readonly<{
  environmentId: string;
  fileName: string | undefined;
  apiKey: string;
  include?: ReadonlyArray<string>;
  exclude?: ReadonlyArray<string>;
}>;

const exportEntities = async (params: ExportEntitiesParams): Promise<void> => {
  const client = new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
  });

  const definitionsToExport = entityDefinitions
    .filter(e => (!params.include || params.include.includes(e.name)) && !params.exclude?.includes(e.name));

  console.log(`\nExporting entities from environment with id ${chalk.bold.yellow(params.environmentId)}\n`);

  await serially(definitionsToExport.map(def => async () => {
    console.log(`Exporting: ${chalk.bold.yellow(def.name)}`);

    try {
      const entities = await def.fetchEntities(client);
      await def.addOtherFiles?.(entities, zip);
      const result = def.serializeEntities(entities);

      zip.file(`${def.name}.json`, result);
    } catch (err) {
      console.error(
        `Failed to export entity ${chalk.red(def.name)} due to error ${JSON.stringify(err)}. Stopping export...`,
      );
      process.exit(1);
    }
  }));

  exportMetadata(params.environmentId);

  const fileName = params.fileName ?? `${new Date().toISOString()}-export-${params.environmentId}.zip`;

  await zip.generateAsync({ type: "nodebuffer" })
    .then(content => fsPromises.writeFile(fileName, content));

  console.log(
    `\nAll entities from environment ${chalk.yellow(params.environmentId)} were successfully exported into ${
      chalk.blue(fileName)
    }.`,
  );
};

const exportMetadata = async (environmentId: string) => {
  const metadata = {
    version: version,
    timestamp: new Date(),
    environmentId,
  };

  zip.file("metadata.json", JSON.stringify(metadata));
};
