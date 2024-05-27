import { HttpService, IHttpService, IRetryStrategyOptions, retryHelper } from "@kontent-ai/core-sdk";
import { ManagementClient } from "@kontent-ai/management-sdk";
import { CancelToken, isAxiosError } from "axios";

import packageJson from "../../package.json" with { type: "json" };

type Params = Readonly<{
  environmentId: string;
  apiKey: string;
  commandName: string;
}>;

const sourceTrackingHeaderName = "X-KC-SOURCE";

export const createClient = ({ environmentId, apiKey, commandName }: Params): ManagementClient =>
  new ManagementClient({
    environmentId,
    apiKey,
    httpService: createHttpService(commandName),
  });

const createHttpService = (commandName: string): IHttpService<CancelToken> => {
  const originalHttpService = new HttpService({
    logErrorsToConsole: false,
    axiosRequestConfig: {
      headers: { [sourceTrackingHeaderName]: `${packageJson.name};${packageJson.version};${commandName}` },
    },
  });

  const retryStrategy: IRetryStrategyOptions = {
    ...retryHelper.defaultRetryStrategy,
    canRetryError: (error: any) =>
      retryHelper.defaultRetryStrategy.canRetryError(error)
      || (isAxiosError(error) && !!error.response?.status.toString().startsWith("5")),
  };

  return {
    getAsync: (call, config) => originalHttpService.getAsync(call, { ...config, retryStrategy }),
    postAsync: (call, config) => originalHttpService.postAsync(call, { ...config, retryStrategy }),
    putAsync: (call, config) => originalHttpService.putAsync(call, { ...config, retryStrategy }),
    patchAsync: (call, config) => originalHttpService.patchAsync(call, { ...config, retryStrategy }),
    deleteAsync: (call, config) => originalHttpService.deleteAsync(call, { ...config, retryStrategy }),
    createCancelToken: originalHttpService.createCancelToken,
  };
};
