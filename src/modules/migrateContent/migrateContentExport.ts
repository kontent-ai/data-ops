import { exportAsync, getDefaultLogger, storeAsync } from "@kontent-ai/migration-toolkit";

import { LogOptions } from "../../log.js";
import { createClientDelivery } from "../../utils/client.js";
import { getItemsCodenames } from "./migrateContent.js";
import { MigrateContentFilterParams } from "./migrateContentRun.js";

export type MigrateContentExportParams = Readonly<
  & {
    sourceEnvironmentId: string;
    sourceApiKey: string;
    filename?: string;
  }
  & MigrateContentFilterParams
  & LogOptions
>;

export const migrateContentExport = async (params: MigrateContentExportParams) => {
  await migrateContentExportInternal(params, "migrate-content-export-API");
};

export const migrateContentExportInternal = async (params: MigrateContentExportParams, commandName: string) => {
  const itemsCodenames = "items" in params && !("depth" in params)
    ? params.items
    : await getItemsCodenames(
      createClientDelivery({
        environmentId: params.sourceEnvironmentId,
        previewApiKey: params.sourceDeliveryPreviewKey,
        usePreviewMode: true,
        commandName,
      }),
      params,
    );

  const data = await exportAsync({
    environmentId: params.sourceEnvironmentId,
    apiKey: params.sourceApiKey,
    exportItems: itemsCodenames.map(i => ({ itemCodename: i, languageCodename: params.language })),
    logger: getDefaultLogger(),
  });

  await storeAsync({
    data,
    filename: params.filename,
  });
};
