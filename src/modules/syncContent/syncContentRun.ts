import { extractAsync, importAsync, migrateAsync } from "@kontent-ai/migration-toolkit";

import { logInfo, LogOptions } from "../../log.js";
import { createClientDelivery } from "../../utils/client.js";
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
        language: string;
      }
      & SyncContentFilterParams
    >
    | Readonly<{ filename: string }>
  )
  & LogOptions;

export type SyncContentFilterParams =
  | Readonly<{ items: ReadonlyArray<string> }>
  | (
    & (
      | Readonly<{ items: ReadonlyArray<string>; depth: number; limit?: number }>
      | (
        | Readonly<{ last: number }>
        | Readonly<{ byTypesCodenames: ReadonlyArray<string> }>
        | Readonly<{ filter: string }>
      )
        & Readonly<{ depth?: number; limit?: number }>
    )
    & { sourceDeliveryPreviewKey: string }
  );

export const syncContentRun = async (params: SyncContentRunParams) => {
  await syncContentRunIntenal(params, "sync-content-run-API");
};

export const syncContentRunIntenal = async (params: SyncContentRunParams, commandName: string) => {
  if ("filename" in params) {
    const data = await extractAsync({ filename: params.filename });

    await importAsync({
      data: data,
      environmentId: params.targetEnvironmentId,
      apiKey: params.targetApiKey,
    });

    return;
  }

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
