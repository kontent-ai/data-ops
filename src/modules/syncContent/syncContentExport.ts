import { createDeliveryClient } from "@kontent-ai/delivery-sdk";
import { exportAsync, getDefaultLogger, storeAsync } from "@kontent-ai/migration-toolkit";

import { LogOptions } from "../../log.js";
import { getItemsCodenames } from "./syncContent.js";

export type SyncContentExportParams =
  & Readonly<{
    sourceEnvironmentId: string;
    sourceApiKey: string;
    sourceDeliveryPreviewKey?: string;
    language: string;
    filename?: string;
    depth?: number;
    limit?: number;
  }>
  & (
    | Readonly<{ items: ReadonlyArray<string> }>
    | Readonly<{ last: number }>
    | Readonly<{ byTypesCodenames: ReadonlyArray<string> }>
    | Readonly<{ filter: string }>
  )
  & LogOptions;

export const syncContentExport = async (params: SyncContentExportParams) => {
  const deliveryClient = createDeliveryClient({
    environmentId: params.sourceEnvironmentId,
    previewApiKey: params.sourceDeliveryPreviewKey,
    defaultQueryConfig: { usePreviewMode: true },
  });

  const itemsCodenames = await getItemsCodenames(deliveryClient, params);

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
