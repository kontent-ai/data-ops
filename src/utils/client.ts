import { HttpService, IRetryStrategyOptions, retryHelper } from "@kontent-ai/core-sdk";
import { createDeliveryClient, DeliveryClient } from "@kontent-ai/delivery-sdk";
import { ManagementClient } from "@kontent-ai/management-sdk";
import { isAxiosError } from "axios";

import packageJson from "../../package.json" with { type: "json" };

type Params = Readonly<{
  environmentId: string;
  apiKey: string;
  commandName: string;
}>;

type DeliveryParams = Readonly<{
  environmentId: string;
  previewApiKey?: string;
  usePreviewMode?: boolean;
  commandName: string;
}>;

const sourceTrackingHeaderName = "X-KC-SOURCE";

const retryStrategy: IRetryStrategyOptions = {
  ...retryHelper.defaultRetryStrategy,
  canRetryError: (error: any) =>
    retryHelper.defaultRetryStrategy.canRetryError(error)
    || (isAxiosError(error) && !!error.response?.status.toString().startsWith("5")),
};

export const createClient = ({ environmentId, apiKey, commandName }: Params): ManagementClient =>
  // eslint-disable-next-line no-restricted-syntax
  new ManagementClient({
    environmentId,
    apiKey,
    retryStrategy,
    headers: [{ header: sourceTrackingHeaderName, value: `${packageJson.name};${packageJson.version};${commandName}` }],
    httpService: defaultHttpService,
  });

export const createClientDelivery = (
  { environmentId, previewApiKey, usePreviewMode, commandName }: DeliveryParams,
): DeliveryClient =>
  createDeliveryClient({
    environmentId: environmentId,
    previewApiKey: previewApiKey,
    defaultQueryConfig: {
      usePreviewMode: usePreviewMode ?? false,
      customHeaders: [{
        header: sourceTrackingHeaderName,
        value: `${packageJson.name};${packageJson.version};${commandName}`,
      }],
    },
    httpService: defaultHttpService,
  });

const defaultHttpService = new HttpService({
  logErrorsToConsole: false,
});
