import { createDeliveryClient } from "@kontent-ai/delivery-sdk";
import { config as dotenvConfig } from "dotenv";
import { describe, expect, it } from "vitest";

import { getItemsCodenames } from "../../../../src/modules/migrateContent/migrateContent.ts";

dotenvConfig();

const { SYNC_SOURCE_TEST_ENVIRONMENT_ID } = process.env;

if (!SYNC_SOURCE_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_SOURCE_TEST_ENVIRONMENT_ID environment variable is not defined.");
}

describe("getItemsCodenames", () => {
  it.concurrent("should return correct items codenames using byTypesCodenames", async () => {
    const client = createDeliveryClient({ environmentId: SYNC_SOURCE_TEST_ENVIRONMENT_ID });

    const byTypesCodenames = ["no_change_base_type"];
    const language = "default";

    const result = await getItemsCodenames(client, { byTypesCodenames, language });

    expect(result).toStrictEqual(["sync_draft_item_1", "sync_item_1", "sync_item_2"]);
  });

  it.concurrent("should return correct items codenames using custom filter by type codename", async () => {
    const client = createDeliveryClient({ environmentId: SYNC_SOURCE_TEST_ENVIRONMENT_ID });

    const filter = "system.type=no_change_base_type";
    const language = "default";

    const result = await getItemsCodenames(client, { filter, language });

    expect(result).toStrictEqual(["sync_draft_item_1", "sync_item_1", "sync_item_2"]);
  });

  it.concurrent("should return correct items codenames with custom items codename", async () => {
    const client = createDeliveryClient({ environmentId: SYNC_SOURCE_TEST_ENVIRONMENT_ID });

    const filter = "system.codename[in]=sync_item_1,sync_item_2";
    const language = "default";

    const result = await getItemsCodenames(client, { filter, language });

    expect(result).toStrictEqual(["sync_item_1", "sync_item_2"]);
  });
});
