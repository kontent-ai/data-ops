import { exportAsync, getDefaultLogger, storeAsync } from "@kontent-ai/migration-toolkit";

import type { LogOptions } from "../../log.js";
import { createClientDelivery, createManagementApiUrl } from "../../utils/client.js";
import { apply } from "../../utils/function.js";
import { getItemsCodenames } from "./migrateContent.js";
import type { MigrateContentFilterParams } from "./migrateContentRun.js";

export type MigrateContentSnapshotParams = Readonly<
  {
    sourceEnvironmentId: string;
    sourceApiKey: string;
    filename?: string;
    kontentUrl?: string;
  } & MigrateContentFilterParams &
    LogOptions
>;

export const migrateContentSnapshot = async (params: MigrateContentSnapshotParams) => {
  await migrateContentSnapshotInternal(params, "migrate-content-snapshot-API");
};

export const migrateContentSnapshotInternal = async (
  params: MigrateContentSnapshotParams,
  commandName: string,
) => {
  const itemsCodenames =
    "items" in params && !("depth" in params)
      ? params.items
      : await getItemsCodenames(
          createClientDelivery({
            environmentId: params.sourceEnvironmentId,
            previewApiKey: params.sourceDeliveryPreviewKey,
            usePreviewMode: true,
            commandName,
            baseUrl: params.kontentUrl,
          }),
          params,
        );

  const data = await exportAsync({
    environmentId: params.sourceEnvironmentId,
    apiKey: params.sourceApiKey,
    exportItems: itemsCodenames.map((i) => ({
      itemCodename: i,
      languageCodename: params.language,
    })),
    logger: getDefaultLogger(),
    baseUrl: apply(createManagementApiUrl, params.kontentUrl),
  });

  await storeAsync({
    data,
    filename: params.filename,
  });
};
