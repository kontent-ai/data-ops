import { ManagementClient } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

export type EntityDefinition<T> = Readonly<{
  name: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (loadedEntities: T, zip: JSZip) => Promise<void>;
}>;
