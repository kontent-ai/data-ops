import { DeliveryClient, IContentItem, IContentItemElements, Responses } from "@kontent-ai/delivery-sdk";

import { MigrationToolkitParams } from "../../commands/syncContent/run/run.js";
import { notNullOrUndefined } from "../../utils/typeguards.js";
import { Replace } from "../../utils/types.js";
import { createDeliveryUrlParameters } from "./utils/deliveryHelpers.js";

export type MigrateOptionsParams = Pick<
  MigrationToolkitParams,
  "byTypesCodenames" | "items" | "filter" | "last" | "depth" | "language" | "limit"
>;

const deliveryApiItemsLimit = 2000;

export const getItemsCodenames = async (
  client: DeliveryClient,
  params: MigrateOptionsParams,
) => {
  if (params.items && !params.depth) {
    return params.items;
  }

  if (params.filter) {
    return client
      .items()
      .withCustomUrl(params.filter)
      .toAllPromise()
      .then(res => res.data.responses.flatMap(r => [...extractItemsCodenamesFromResponse(r.data)]));
  }

  const pageSize = getPageSize(params);
  const numberOfPages = params.last ? Math.ceil(params.last / pageSize) : deliveryApiItemsLimit;

  const parameters = getDeliveryUrlParams({ ...params, limit: pageSize });

  return await client
    .items()
    .withParameters(parameters)
    .toAllPromise({
      pages: numberOfPages,
    })
    .then(res => res.data.responses.flatMap(r => [...extractItemsCodenamesFromResponse(r.data)]));
};

export const getDeliveryUrlParams = (params: Replace<MigrateOptionsParams, { limit: number }>) => {
  const defaultParams = { ...params, depth: params.depth ?? 0 };
  if (params.last) {
    return createDeliveryUrlParameters({ ...defaultParams, order: ["system.last_modified", "desc"] });
  }

  if (params.items) {
    return createDeliveryUrlParameters({ ...defaultParams, inFilter: ["system.codename", params.items] });
  }

  if (params.byTypesCodenames) {
    return createDeliveryUrlParameters({ ...defaultParams, inFilter: ["system.type", params.byTypesCodenames] });
  }

  return createDeliveryUrlParameters(defaultParams);
};

export const extractItemsCodenamesFromResponse = (
  data: Responses.IListContentItemsResponse<IContentItem<IContentItemElements>>,
): ReadonlySet<string> =>
  new Set([
    ...Object.entries(data.linkedItems)
      .map(([codename, item]) => item.system.workflow ? codename : undefined) // filter out components.
      .filter(notNullOrUndefined),
    ...data.items.map(i => i.system.codename),
  ]);

const getPageSize = (params: MigrateOptionsParams) => {
  if (params.last && params.last > deliveryApiItemsLimit) {
    return 100;
  }

  if (params.last) {
    return params.last;
  }

  return !params.limit || params.limit > deliveryApiItemsLimit ? deliveryApiItemsLimit : params.limit;
};
