import { createDeliveryClient } from "@kontent-ai/delivery-sdk";
import { extractAsync, importAsync, migrateAsync } from "@kontent-ai/migration-toolkit";

import { logInfo, LogOptions } from "../../log.js";
import { getItemsCodenames } from "./syncContent.js";

export type SyncContentRunParams =
  & Readonly<{
    targetEnvironmentId: string;
    targetApiKey: string;
    skipFailedItems?: boolean;
  }>
  & (
    | Readonly<
      & {
        sourceEnvironmentId: string;
        sourceApiKey: string;
        sourceDeliveryPreviewKey?: string;
      }
      & SyncContentFilterParams
    >
    | Readonly<{ filename: string }>
  )
  & LogOptions;

export type SyncContentFilterParams =
  & { depth?: number; limit?: number; language: string }
  & (
    | Readonly<{ items: ReadonlyArray<string> }>
    | Readonly<{ last: number }>
    | Readonly<{ byTypesCodenames: ReadonlyArray<string> }>
    | Readonly<{ filter: string }>
  );

export const syncContentRun = async (params: SyncContentRunParams) => {
  if ("filename" in params) {
    const data = await extractAsync({ filename: params.filename });

    await importAsync({
      data: data,
      environmentId: params.targetEnvironmentId,
      apiKey: params.targetApiKey,
    });

    return;
  }

  const deliveryClient = createDeliveryClient({
    environmentId: params.sourceEnvironmentId,
    previewApiKey: params.sourceDeliveryPreviewKey,
    defaultQueryConfig: {
      usePreviewMode: true,
    },
  });

  const itemsCodenames = await getItemsCodenames(deliveryClient, params);

  if (!itemsCodenames.length) {
    logInfo(params, "standard", `No items to migrate`);
    return;
  }

  logInfo(
    params,
    "standard",
    `Syncing ${itemsCodenames.length} items from ${params.sourceEnvironmentId} to ${params.targetEnvironmentId} ${
      itemsCodenames.length < 100 ? `with codenames:\n${itemsCodenames.join("\n")}` : ""
    }`,
  );

  await migrateAsync({
    targetEnvironment: { apiKey: params.targetApiKey, environmentId: params.targetEnvironmentId },
    sourceEnvironment: {
      environmentId: params.sourceEnvironmentId,
      apiKey: params.sourceApiKey,
      items: itemsCodenames.map(i => ({ itemCodename: i, languageCodename: params.language })),
    },
  });

  logInfo(params, "standard", `All items sucessfuly migrated`);
};
