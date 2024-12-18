import { extractAsync, importAsync, migrateAsync } from "@kontent-ai/migration-toolkit";

import { logInfo, LogOptions } from "../../log.js";
import { createClientDelivery, createManagementApiUrl } from "../../utils/client.js";
import { apply } from "../../utils/function.js";
import { getItemsCodenames } from "./migrateContent.js";

export type MigrateContentRunParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
    skipFailedItems?: boolean;
    kontentUrl?: string;
  }
  & (
    | {
      sourceEnvironmentId: string;
      sourceApiKey: string;
    }
      & MigrateContentFilterParams
    | { filename: string }
  )
  & LogOptions
>;

export type MigrateContentFilterParams = Readonly<
  & (
    | { items: ReadonlyArray<string> }
    | (
      & (
        | { items: ReadonlyArray<string>; depth: number; limit?: number }
        | (
          | { last: number }
          | { byTypesCodenames: ReadonlyArray<string> }
          | { filter: string }
        )
          & { depth?: number; limit?: number }
      )
      & { sourceDeliveryPreviewKey: string }
    )
  )
  & { language: string }
>;

export const migrateContentRun = async (params: MigrateContentRunParams) => {
  await migrateContentRunInternal(params, "migrate-content-run-API");
};

export const migrateContentRunInternal = async (
  params: MigrateContentRunParams,
  commandName: string,
  withItemCodenames: (itemsCodenames: ReadonlyArray<string>) => Promise<void> = () => Promise.resolve(),
) => {
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
        baseUrl: params.kontentUrl,
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
    `Migrating ${itemsCodenames.length} items from ${params.sourceEnvironmentId} to ${params.targetEnvironmentId} ${
      itemsCodenames.length < 100 ? `with codenames:\n${itemsCodenames.join("\n")}` : ""
    }`,
  );

  await withItemCodenames(itemsCodenames);

  await migrateAsync({
    targetEnvironment: {
      apiKey: params.targetApiKey,
      environmentId: params.targetEnvironmentId,
      baseUrl: apply(createManagementApiUrl, params.kontentUrl),
    },
    sourceEnvironment: {
      environmentId: params.sourceEnvironmentId,
      apiKey: params.sourceApiKey,
      items: itemsCodenames.map(i => ({ itemCodename: i, languageCodename: params.language })),
      baseUrl: apply(createManagementApiUrl, params.kontentUrl),
    },
  });

  logInfo(params, "standard", `All items successfully migrated`);
};
