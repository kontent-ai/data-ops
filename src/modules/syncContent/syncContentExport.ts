import { exportAsync, getDefaultLogger, storeAsync } from "@kontent-ai/migration-toolkit";

import { LogOptions } from "../../log.js";
import { createClientDelivery } from "../../utils/client.js";
import { getItemsCodenames } from "./syncContent.js";
import { SyncContentFilterParams } from "./syncContentRun.js";

export type SyncContentExportParams =
  & Readonly<{
    sourceEnvironmentId: string;
    sourceApiKey: string;
    language: string;
    filename?: string;
  }>
  & SyncContentFilterParams
  & LogOptions;

export const syncContentExport = async (params: SyncContentExportParams) => {
  await syncContentExportInternal(params, "sync-content-export-API");
};

export const syncContentExportInternal = async (params: SyncContentExportParams, commandName: string) => {
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
