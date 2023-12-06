import { ManagementClient } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

export type EntityDefinition<T> = Readonly<{
  name: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (loadedEntities: T, zip: JSZip) => Promise<void>;
  deserializeEntities: (serialized: string) => T;
  importEntities: (client: ManagementClient, entities: T, context: ImportContext, zip: JSZip) => Promise<void | ImportContext>;
}>;

export type ImportContext = Readonly<{
  collectionIdsByOldIds: ReadonlyMap<string, string>;
  languageIdsByOldIds: ReadonlyMap<string, string>;
  taxonomyGroupIdsByOldIds: IdsMap;
  taxonomyTermIdsByOldIds: IdsMap;
}>;

type IdsMap = ReadonlyMap<string, string>;
