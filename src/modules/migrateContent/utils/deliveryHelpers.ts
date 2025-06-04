import { Filters, Parameters } from "@kontent-ai/delivery-sdk";

type DeliveryParamsOptions = Readonly<{
  language?: string;
  depth?: number;
  limit?: number;
  order?: Readonly<[string, "asc" | "desc"]>;
  inFilter?: Readonly<[string, ReadonlyArray<string>]>;
  customFilter?: string;
}>;

export const createDeliveryUrlParameters = (options: DeliveryParamsOptions) => [
  ...(options.depth !== undefined ? [new Parameters.DepthParameter(options.depth)] : []),
  ...(options.language ? [new Parameters.LanguageParameter(options.language)] : []),
  ...(options.limit ? [new Parameters.LimitParameter(options.limit)] : []),
  ...(options.order ? [new Parameters.OrderParameter(options.order[0], options.order[1])] : []),
  ...(options.inFilter
    ? [new Filters.InFilter(options.inFilter[0], options.inFilter[1] as string[])]
    : []),
  ...(options.customFilter ? [new Parameters.CustomParameter(options.customFilter)] : []),
];
