import { ManagementClient } from "@kontent-ai/management-sdk";

type DiffConfig = DiffOptions;

type DiffOptions = {
  filname: string;
};

export const diff = (client: ManagementClient, config: DiffConfig) => {
  // TODO
  client as never;
  config as never;
};
