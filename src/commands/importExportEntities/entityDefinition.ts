import { ManagementClient } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

export type EntityDefinition<T> =  EntityExportDefinition<T> & EntityImportDefinition<T>;

export type EntityExportDefinition<T> = Readonly<{
  name: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (loadedEntities: T, zip: JSZip) => Promise<void>;
}>;

export type EntityImportDefinition<T> = Readonly<{
  name: string;
  deserializeEntities: (serialized: string) => T;
  importEntities: (client: ManagementClient, entities: T, context: ImportContext, zip: JSZip) => Promise<void | ImportContext>;
}>;

export type DependentImportAction<T> = Readonly<{
  dependentOnEntities: ReadonlyArray<EntityDefinition<any>>;
  action: (client: ManagementClient, entities: T, context: ImportContext) => Promise<void>;
}>;

export type ImportContext = Readonly<{
  collectionIdsByOldIds: ReadonlyMap<string, string>;
  languageIdsByOldIds: ReadonlyMap<string, string>;
  taxonomyGroupIdsByOldIds: IdsMap;
  taxonomyTermIdsByOldIds: IdsMap;
  assetFolderIdsByOldIds: IdsMap;
  assetIdsByOldIds: IdsMap;
  contentTypeSnippetIdsWithElementsByOldIds: ReadonlyMap<string, Readonly<{ selfId: string; elementIdsByOldIds: IdsMap }>>;
  contentTypeIdsWithElementsByOldIds: ReadonlyMap<string, Readonly<{ selfId: string; elementIdsByOldIds: IdsMap }>>;
  contentItemIdsByOldIds: IdsMap;
}>;

type IdsMap = ReadonlyMap<string, string>;
