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
import { formatEnvironmentInformation } from "../shared/cli.js";
import { getEnvironmentInformation } from "../shared/mapiUtils.js";
import { assetFoldersEntity } from "./backupRestoreEntities/entities/assetFolders.js";
import { assetsEntity } from "./backupRestoreEntities/entities/assets.js";
import { collectionsEntity } from "./backupRestoreEntities/entities/collections.js";
import { contentItemsEntity } from "./backupRestoreEntities/entities/contentItems.js";
import { contentTypesEntity } from "./backupRestoreEntities/entities/contentTypes.js";
import { contentTypesSnippetsEntity } from "./backupRestoreEntities/entities/contentTypesSnippets.js";
import { languagesEntity } from "./backupRestoreEntities/entities/languages.js";
import { languageVariantsEntity } from "./backupRestoreEntities/entities/languageVariants.js";
import { previewUrlsEntity } from "./backupRestoreEntities/entities/previewUrls.js";
import { rolesExportEntity } from "./backupRestoreEntities/entities/roles.js";
import { spacesEntity } from "./backupRestoreEntities/entities/spaces.js";
import { taxonomiesEntity } from "./backupRestoreEntities/entities/taxonomies.js";
import { webhooksEntity } from "./backupRestoreEntities/entities/webhooks.js";
import { webSpotlightEntity } from "./backupRestoreEntities/entities/webSpotlight.js";
import { workflowsEntity } from "./backupRestoreEntities/entities/workflows.js";
import { EntityBackupDefinition, EntityDefinition } from "./backupRestoreEntities/entityDefinition.js";
import { IncludeExclude, includeExcludePredicate } from "./utils/includeExclude.js";

const {
  version,
} = packageFile;

export const backupEntityDefinitions = [
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
] as const satisfies ReadonlyArray<EntityBackupDefinition<any>>;

export const backupEntityChoices = backupEntityDefinitions.map(e => e.name);

export type BackupEntityChoices = typeof backupEntityChoices[number];

export type BackupEnvironmentParams = Readonly<
  & {
    environmentId: string;
    fileName?: string;
    apiKey: string;
    secureAssetDeliveryKey?: string;
    kontentUrl?: string;
  }
  & IncludeExclude<BackupEntityChoices>
  & LogOptions
>;

export const backupEnvironment = async (params: BackupEnvironmentParams) => {
  const client = createClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    commandName: "environment-backup-API",
    baseUrl: params.kontentUrl,
  });

  await backupEnvironmentInternal(client, params);
};

export const backupEnvironmentInternal = async (
  client: ManagementClient,
  params: BackupEnvironmentParams,
): Promise<void> => {
  const definitionsToBackup = backupEntityDefinitions.filter(includeExcludePredicate(params));

  const environmentInfo = await getEnvironmentInformation(client);

  logInfo(
    params,
    "standard",
    `\nExporting entities from environment ${formatEnvironmentInformation(environmentInfo)}\n`,
  );

  const now = new Date();
  const fileName = params.fileName
    ?? `${serializeDateForFileName(now)}-backup-${params.environmentId}.zip`;

  const outputStream = fs.createWriteStream(fileName);
  const archive = archiver("zip");
  archive.pipe(outputStream);

  await serially(definitionsToBackup.map(def => async () => {
    logInfo(params, "standard", `Exporting: ${chalk.bold.yellow(def.displayName)}`);

    try {
      const entities = await def.fetchEntities(client);
      await (def as EntityDefinition<unknown>).addOtherFiles?.(
        entities,
        archive,
        params.secureAssetDeliveryKey,
        params,
      );
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
      chalk.green("successfully backuped")
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
