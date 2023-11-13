import { ManagementClient } from "@kontent-ai/management-sdk";

export type EntityDefinition<T> = Readonly<{
  name: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
}>;
