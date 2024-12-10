import { ManagementClient } from "@kontent-ai/management-sdk";

export const getEnvironmentInformation = (client: ManagementClient) =>
  client
    .environmentInformation()
    .toPromise()
    .then(res => res.data.project);
