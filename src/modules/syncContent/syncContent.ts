import { DeliveryClient, IContentItem, IContentItemElements, Responses } from "@kontent-ai/delivery-sdk";
import { match, P } from "ts-pattern";

import { notNullOrUndefined } from "../../utils/typeguards.js";
import { Replace } from "../../utils/types.js";
import { SyncContentFilterParams } from "./syncContentRun.js";
import { createDeliveryUrlParameters } from "./utils/deliveryHelpers.js";

const deliveryApiItemsLimit = 2000;

export const getItemsCodenames = async (
  client: DeliveryClient,
  params: SyncContentFilterParams,
) => {
  if ("items" in params && !("depth" in params)) {
    return params.items;
  }

  if ("filter" in params) {
    return client
      .items()
      .withCustomUrl(params.filter)
      .toAllPromise()
      .then(res => res.data.responses.flatMap(r => [...extractItemsCodenamesFromResponse(r.data)]));
  }

  const pageSize = getPageSize(params);
  const numberOfPages = "last" in params ? Math.ceil(params.last / pageSize) : deliveryApiItemsLimit;

  const parameters = getDeliveryUrlParams({ ...params, limit: pageSize });

  return await client
    .items()
    .withParameters(parameters)
    .toAllPromise({
      pages: numberOfPages,
    })
    .then(res => res.data.responses.flatMap(r => [...extractItemsCodenamesFromResponse(r.data)]));
};

export const getDeliveryUrlParams = (params: Replace<SyncContentFilterParams, { limit: number }>) => {
  const defaultParams = { ...params, depth: params.depth ?? 0 };

  return match(params)
    .with(
      { last: P.nonNullable },
      () => createDeliveryUrlParameters({ ...defaultParams, order: ["system.last_modified", "desc"] }),
    )
    .with(
      { items: P.nonNullable },
      ({ items }) => createDeliveryUrlParameters({ ...defaultParams, inFilter: ["system.codename", items] }),
    )
    .with(
      { byTypesCodenames: P.nonNullable },
      ({ byTypesCodenames }) =>
        createDeliveryUrlParameters({ ...defaultParams, inFilter: ["system.type", byTypesCodenames] }),
    )
    .otherwise(() => createDeliveryUrlParameters(defaultParams));
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

const getPageSize = (params: SyncContentFilterParams) => {
  if ("last" in params && params.last > deliveryApiItemsLimit) {
    return 100;
  }

  if ("last" in params) {
    return params.last;
  }

  return !params.limit || params.limit > deliveryApiItemsLimit ? deliveryApiItemsLimit : params.limit;
};
