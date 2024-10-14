import { extractAsync, importAsync, migrateAsync } from "@kontent-ai/migration-toolkit";

import { logInfo, LogOptions } from "../../log.js";
import { createClientDelivery } from "../../utils/client.js";
import { getItemsCodenames } from "./migrateContent.js";

export type MigrateContentRunParams = Readonly<
  & {
    targetEnvironmentId: string;
    targetApiKey: string;
    skipFailedItems?: boolean;
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
  await migrateContentRunIntenal(params, "migrate-content-run-API");
};

export const migrateContentRunIntenal = async (params: MigrateContentRunParams, commandName: string) => {
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
    `Migrating ${itemsCodenames.length} items from ${params.sourceEnvironmentId} to ${params.targetEnvironmentId} ${
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
