import type {
  DeliveryClient,
  IContentItem,
  IContentItemElements,
  Responses,
} from "@kontent-ai/delivery-sdk";
import { fetchItems } from "../../utils/deliveryHelpers.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import type { SuperiorOmit } from "../../utils/types.js";
import type { MigrateContentFilterParams } from "./migrateContentRun.js";

type SyncContentFilterDeliveryOnlyParams =
  | SuperiorOmit<
      Exclude<MigrateContentFilterParams, { items: ReadonlyArray<string> }>,
      "sourceDeliveryPreviewKey"
    >
  | Readonly<{ items: ReadonlyArray<string>; depth: number; limit?: number; language: string }>;

export const getItemsCodenames = async (
  client: DeliveryClient,
  params: SyncContentFilterDeliveryOnlyParams,
): Promise<ReadonlyArray<string>> => {
  const responses = await fetchItems(client, params);
  return responses.flatMap((data) => [...extractItemsCodenamesFromResponse(data)]);
};

const extractItemsCodenamesFromResponse = (
  data: Responses.IListContentItemsResponse<IContentItem<IContentItemElements>>,
): ReadonlySet<string> =>
  new Set([
    ...Object.entries(data.linkedItems)
      .map(([codename, item]) => (item?.system.workflow ? codename : undefined)) // filter out components.
      .filter(notNullOrUndefined),
    ...data.items.map((i) => i.system.codename),
  ]);
