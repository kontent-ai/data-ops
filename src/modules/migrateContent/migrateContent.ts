import type {
  DeliveryClient,
  IContentItem,
  IContentItemElements,
  Responses,
} from "@kontent-ai/delivery-sdk";
import { P, match } from "ts-pattern";

import { notNullOrUndefined } from "../../utils/typeguards.js";
import type { SuperiorOmit } from "../../utils/types.js";
import type { MigrateContentFilterParams } from "./migrateContentRun.js";
import { createDeliveryUrlParameters } from "./utils/deliveryHelpers.js";

const deliveryApiItemsLimit = 2000;

type SyncContentFilterDeliveryOnlyParams =
  | SuperiorOmit<
      Exclude<MigrateContentFilterParams, { items: ReadonlyArray<string> }>,
      "sourceDeliveryPreviewKey"
    >
  | Readonly<{ items: ReadonlyArray<string>; depth: number; limit?: number; language: string }>;
// { items: ReadonlyArray<string>; depth: number; limit?: number } is assignable to { items: ReadonlyArray<string> }
// therefore it was also removed by Exclude

export const getItemsCodenames = async (
  client: DeliveryClient,
  params: SyncContentFilterDeliveryOnlyParams,
) => {
  const pageSize = getPageSize(params);
  const numberOfPages =
    "last" in params ? Math.ceil(params.last / pageSize) : deliveryApiItemsLimit;

  const parameters = getDeliveryUrlParams({ ...params, limit: pageSize });

  return client
    .items()
    .withParameters(parameters)
    .toAllPromise({ pages: numberOfPages })
    .then((res) =>
      res.data.responses.flatMap((r) => [...extractItemsCodenamesFromResponse(r.data)]),
    );
};

export const getDeliveryUrlParams = (params: SyncContentFilterDeliveryOnlyParams) => {
  const defaultParams = { ...params, depth: params.depth ?? 0 };

  return match(params)
    .with({ last: P.nonNullable }, () =>
      createDeliveryUrlParameters({ ...defaultParams, order: ["system.last_modified", "desc"] }),
    )
    .with({ items: P.nonNullable }, ({ items }) =>
      createDeliveryUrlParameters({ ...defaultParams, inFilter: ["system.codename", items] }),
    )
    .with({ byTypesCodenames: P.nonNullable }, ({ byTypesCodenames }) =>
      createDeliveryUrlParameters({
        ...defaultParams,
        inFilter: ["system.type", byTypesCodenames],
      }),
    )
    .with({ filter: P.nonNullable }, ({ filter }) =>
      createDeliveryUrlParameters({ ...defaultParams, customFilter: filter }),
    )
    .otherwise(() => createDeliveryUrlParameters(defaultParams));
};

export const extractItemsCodenamesFromResponse = (
  data: Responses.IListContentItemsResponse<IContentItem<IContentItemElements>>,
): ReadonlySet<string> =>
  new Set([
    ...Object.entries(data.linkedItems)
      .map(([codename, item]) => (item?.system.workflow ? codename : undefined)) // filter out components.
      .filter(notNullOrUndefined),
    ...data.items.map((i) => i.system.codename),
  ]);

const getPageSize = (params: { last: number } | { limit?: number }) => {
  if ("last" in params && params.last > deliveryApiItemsLimit) {
    return 100;
  }

  if ("last" in params) {
    return params.last;
  }

  return !params.limit || params.limit > deliveryApiItemsLimit
    ? deliveryApiItemsLimit
    : params.limit;
};
