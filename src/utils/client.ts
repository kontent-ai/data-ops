import { HttpService } from "@kontent-ai/core-sdk";
import { ManagementClient } from "@kontent-ai/management-sdk";

type Params = Readonly<{
  environmentId: string;
  apiKey: string;
}>;

export const createClient = ({ environmentId, apiKey }: Params): ManagementClient =>
  new ManagementClient({ environmentId, apiKey, httpService: new HttpService({ logErrorsToConsole: false }) });
