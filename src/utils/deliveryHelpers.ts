import {
  type DeliveryClient,
  Filters,
  type IContentItem,
  Parameters,
  type Responses,
} from "@kontent-ai/delivery-sdk";
import { match, P } from "ts-pattern";

export const deliveryApiItemsLimit = 2000;

type DeliveryParamsOptions = Readonly<{
  language?: string;
  depth?: number;
  limit?: number;
  order?: Readonly<[string, "asc" | "desc"]>;
  inFilter?: Readonly<[string, ReadonlyArray<string>]>;
  customFilter?: string;
}>;

const createDeliveryUrlParameters = (options: DeliveryParamsOptions) => [
  ...(options.depth !== undefined ? [new Parameters.DepthParameter(options.depth)] : []),
  ...(options.language ? [new Parameters.LanguageParameter(options.language)] : []),
  ...(options.limit ? [new Parameters.LimitParameter(options.limit)] : []),
  ...(options.order ? [new Parameters.OrderParameter(options.order[0], options.order[1])] : []),
  ...(options.inFilter
    ? [new Filters.InFilter(options.inFilter[0], options.inFilter[1] as string[])]
    : []),
  ...(options.customFilter ? [new Parameters.CustomParameter(options.customFilter)] : []),
];

export type DeliveryFilterParams = Readonly<{
  language: string;
  depth?: number;
  limit?: number;
}> &
  (
    | { items: ReadonlyArray<string> }
    | { last: number }
    | { byTypesCodenames: ReadonlyArray<string> }
    | { filter: string }
    | { collection: string }
  );

const getDeliveryUrlParams = (params: DeliveryFilterParams) => {
  const defaultParams = {
    language: params.language,
    depth: params.depth ?? 0,
    limit: params.limit,
  };

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
    .with({ collection: P.nonNullable }, ({ collection }) =>
      createDeliveryUrlParameters({
        ...defaultParams,
        inFilter: ["system.collection", [collection]],
      }),
    )
    .otherwise(() => createDeliveryUrlParameters(defaultParams));
};

const getPageSize = (params: { last: number } | { limit?: number }): number => {
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

export const fetchItems = async (
  client: DeliveryClient,
  params: DeliveryFilterParams,
): Promise<ReadonlyArray<Responses.IListContentItemsResponse<IContentItem>>> => {
  const pageSize = getPageSize(params);
  const numberOfPages =
    "last" in params ? Math.ceil(params.last / pageSize) : deliveryApiItemsLimit;
  const parameters = getDeliveryUrlParams({ ...params, limit: pageSize });

  const response = await client
    .items()
    .withParameters(parameters)
    .toAllPromise({ pages: numberOfPages });

  return response.data.responses.map((r) => r.data);
};
