import { ManagementClient } from "@kontent-ai/management-sdk";

type DiffOptions = Readonly<{
  filname: string;
}>;

export const diff = (client: ManagementClient, config: DiffOptions) => {
  // TODO
  client as never;
  config as never;
};
