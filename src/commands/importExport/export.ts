import { finished } from "node:stream/promises";

import archiver from "archiver";
import chalk from "chalk";
import * as fs from "fs";

import packageFile from "../../../package.json" with { type: "json" };
import { logError, logInfo, LogOptions } from "../../log.js";
import { assetFoldersEntity } from "../../modules/importExport/importExportEntities/entities/assetFolders.js";
import { assetsEntity } from "../../modules/importExport/importExportEntities/entities/assets.js";
import { collectionsEntity } from "../../modules/importExport/importExportEntities/entities/collections.js";
import { contentItemsEntity } from "../../modules/importExport/importExportEntities/entities/contentItems.js";
import { contentTypesEntity } from "../../modules/importExport/importExportEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "../../modules/importExport/importExportEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "../../modules/importExport/importExportEntities/entities/languages.js";
import { languageVariantsEntity } from "../../modules/importExport/importExportEntities/entities/languageVariants.js";
import { previewUrlsEntity } from "../../modules/importExport/importExportEntities/entities/previewUrls.js";
import { rolesExportEntity } from "../../modules/importExport/importExportEntities/entities/roles.js";
import { spacesEntity } from "../../modules/importExport/importExportEntities/entities/spaces.js";
import { taxonomiesEntity } from "../../modules/importExport/importExportEntities/entities/taxonomies.js";
import { webhooksEntity } from "../../modules/importExport/importExportEntities/entities/webhooks.js";
import { workflowsEntity } from "../../modules/importExport/importExportEntities/entities/workflows.js";
import { EntityExportDefinition } from "../../modules/importExport/importExportEntities/entityDefinition.js";
import { RegisterCommand } from "../../types/yargs.js";
import { createClient } from "../../utils/client.js";
import { simplifyErrors } from "../../utils/error.js";
import { serializeDateForFileName } from "../../utils/files.js";
import { serially } from "../../utils/requests.js";

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
  webhooksEntity,
];

const entityChoices = entityDefinitions.map(e => e.name);

const commandName = "export";

export const register: RegisterCommand = yargs =>
  yargs.command({
    command: commandName,
    describe: "Exports data from the specified Kontent.ai project into a .zip file.",
    builder: yargs =>
      yargs
        .option("environmentId", {
          type: "string",
          describe: "Id of the Kontent.ai environment to export.",
          demandOption: "You need to provide an id of the Kontent.ai environment.",
          alias: "e",
        })
        .option("fileName", {
          type: "string",
          describe: "Name of the zip file the environment will be exported to.",
          alias: "f",
        })
        .option("apiKey", {
          type: "string",
          describe: "Kontent.ai Management API key",
          demandOption: "You need to provide a Management API key for the given Kontent.ai environment.",
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
    handler: args => exportEntities(args).catch(simplifyErrors),
  });

type ExportEntitiesParams =
  & Readonly<{
    environmentId: string;
    fileName: string | undefined;
    apiKey: string;
    include?: ReadonlyArray<string>;
    exclude?: ReadonlyArray<string>;
  }>
  & LogOptions;

const exportEntities = async (params: ExportEntitiesParams): Promise<void> => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName,
  });

  const definitionsToExport = entityDefinitions
    .filter(e => (!params.include || params.include.includes(e.name)) && !params.exclude?.includes(e.name));

  logInfo(
    params,
    "standard",
    `\nExporting entities from environment id ${chalk.bold.yellow(params.environmentId)}\n`,
  );

  const now = new Date();
  const fileName = params.fileName
    ?? `${serializeDateForFileName(now)}-export-${params.environmentId}.zip`;

  const outputStream = fs.createWriteStream(fileName);
  const archive = archiver("zip");
  archive.pipe(outputStream);

  await serially(definitionsToExport.map(def => async () => {
    logInfo(params, "standard", `Exporting: ${chalk.bold.yellow(def.displayName)}`);

    try {
      const entities = await def.fetchEntities(client);
      await def.addOtherFiles?.(entities, archive, params);
      const result = def.serializeEntities(entities);

      archive.append(result, { name: `${def.name}.json` });
    } catch (err) {
      logError(
        params,
        `Failed to export an entity ${chalk.red(def.displayName)} due to error ${
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        }. Stopping export...`,
      );
      process.exit(1);
    }
  }));

  exportMetadata(archive, params.environmentId);

  await archive.finalize();
  await finished(outputStream);

  logInfo(
    params,
    "standard",
    `\nEntities from environment ${chalk.yellow(params.environmentId)} were ${
      chalk.green("successfully exported")
    } into ${chalk.blue(fileName)}.`,
  );
};

const exportMetadata = async (archive: archiver.Archiver, environmentId: string) => {
  const metadata = {
    version: version,
    timestamp: new Date(),
    environmentId,
  };

  archive.append(JSON.stringify(metadata), { name: "metadata.json" });
};
