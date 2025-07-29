import { HttpService, type IRetryStrategyOptions, retryHelper } from "@kontent-ai/core-sdk";
import { createDeliveryClient, type DeliveryClient } from "@kontent-ai/delivery-sdk";
import { ManagementClient } from "@kontent-ai/management-sdk";
import { isAxiosError } from "axios";

import packageJson from "../../package.json" with { type: "json" };
import { apply } from "./function.js";

type Params = Readonly<{
  environmentId: string;
  apiKey: string;
  commandName: string;
  baseUrl: string | undefined;
}>;

type DeliveryParams = Readonly<{
  environmentId: string;
  previewApiKey?: string;
  usePreviewMode?: boolean;
  commandName: string;
  baseUrl: string | undefined;
}>;

const sourceTrackingHeaderName = "X-KC-SOURCE";

const retryStrategy: IRetryStrategyOptions = {
  ...retryHelper.defaultRetryStrategy,
  canRetryError: (error: unknown) =>
    retryHelper.defaultRetryStrategy.canRetryError(error) ||
    (isAxiosError(error) && !!error.response?.status.toString().startsWith("5")),
};

export const createClient = (params: Params): ManagementClient =>
  // eslint-disable-next-line no-restricted-syntax
  new ManagementClient({
    environmentId: params.environmentId,
    apiKey: params.apiKey,
    retryStrategy,
    headers: [
      {
        header: sourceTrackingHeaderName,
        value: `${packageJson.name};${packageJson.version};${params.commandName}`,
      },
    ],
    httpService: defaultHttpService,
    baseUrl: resolveUrlParam(params.baseUrl, createManagementApiUrl),
  });

export const createClientDelivery = (params: DeliveryParams): DeliveryClient =>
  createDeliveryClient({
    environmentId: params.environmentId,
    previewApiKey: params.previewApiKey,
    defaultQueryConfig: {
      usePreviewMode: params.usePreviewMode ?? false,
      customHeaders: [
        {
          header: sourceTrackingHeaderName,
          value: `${packageJson.name};${packageJson.version};${params.commandName}`,
        },
      ],
    },
    httpService: defaultHttpService,
    proxy: {
      baseUrl: resolveUrlParam(params.baseUrl, (url) => `https://deliver.${url}`),
      basePreviewUrl: resolveUrlParam(params.baseUrl, (url) => `https://preview-deliver.${url}`),
    },
  });

const defaultHttpService = new HttpService({
  logErrorsToConsole: false,
});

const resolveUrlParam = (
  url: string | undefined,
  resolver: (url: string) => string,
): string | undefined => apply((u) => resolver(u.replace(/^https:\/\//, "")), url);

export const createManagementApiUrl = (baseUrl: string): string => `https://manage.${baseUrl}/v2`;
