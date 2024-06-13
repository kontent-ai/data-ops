import { Filters, Parameters } from "@kontent-ai/delivery-sdk";

export type DeliveryParamsOptions = {
  language?: string;
  depth?: number;
  limit?: number;
  order?: [string, "asc" | "desc"];
  inFilter?: [string, ReadonlyArray<string>];
};

export const createDeliveryUrlParameters = (options: DeliveryParamsOptions) => [
  ...options.depth !== undefined ? [new Parameters.DepthParameter(options.depth)] : [],
  ...options.language ? [new Parameters.LanguageParameter(options.language)] : [],
  ...options.limit ? [new Parameters.LimitParameter(options.limit)] : [],
  ...options.order ? [new Parameters.OrderParameter(options.order[0], options.order[1])] : [],
  ...options.inFilter ? [new Filters.InFilter(options.inFilter[0], options.inFilter[1] as string[])] : [],
];
