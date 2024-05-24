import { HttpService } from "@kontent-ai/core-sdk";
import { ManagementClient } from "@kontent-ai/management-sdk";

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
    httpService: new HttpService({
      logErrorsToConsole: false,
      axiosRequestConfig: {
        headers: { [sourceTrackingHeaderName]: `${packageJson.name};${packageJson.version};${commandName}` },
      },
    }),
  });
