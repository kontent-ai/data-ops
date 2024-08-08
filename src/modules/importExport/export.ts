import { finished } from "node:stream/promises";

import { ManagementClient } from "@kontent-ai/management-sdk";
import archiver from "archiver";
import chalk from "chalk";
import * as fs from "fs";

import packageFile from "../../../package.json" with { type: "json" };
import { logInfo, LogOptions } from "../../log.js";
import { createClient } from "../../utils/client.js";
import { serializeDateForFileName } from "../../utils/files.js";
import { serially } from "../../utils/requests.js";
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
import { webhooksEntity } from "./importExportEntities/entities/webhooks.js";
import { webSpotlightEntity } from "./importExportEntities/entities/webSpotlight.js";
import { workflowsEntity } from "./importExportEntities/entities/workflows.js";
import { EntityDefinition, EntityExportDefinition } from "./importExportEntities/entityDefinition.js";
import { IncludeExclude, includeExcludePredicate } from "./utils/includeExclude.js";

const {
  version,
} = packageFile;

export const exportEntityDefinitions = [
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
  webSpotlightEntity,
] as const satisfies ReadonlyArray<EntityExportDefinition<any>>;

export const exportEntityChoices = exportEntityDefinitions.map(e => e.name);

export type ExportEntityChoices = typeof exportEntityChoices[number];

export type ExportEnvironmentParams =
  & Readonly<{
    environmentId: string;
    fileName?: string;
    apiKey: string;
  }>
  & IncludeExclude<ExportEntityChoices>
  & LogOptions;

export const exportEnvironment = async (params: ExportEnvironmentParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: "export-API",
  });

  await exportEnvironmentInternal(client, params);
};

export const exportEnvironmentInternal = async (
  client: ManagementClient,
  params: ExportEnvironmentParams,
): Promise<void> => {
  const definitionsToExport = exportEntityDefinitions.filter(includeExcludePredicate(params));

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
      await (def as EntityDefinition<unknown>).addOtherFiles?.(entities, archive, params);
      const result = def.serializeEntities(entities);

      archive.append(result, { name: `${def.name}.json` });
    } catch (err) {
      throw new Error(
        `Failed to export an entity ${def.displayName} due to error ${
          JSON.stringify(err, Object.getOwnPropertyNames(err))
        }`,
      );
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
