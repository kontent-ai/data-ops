import { ManagementClient } from "@kontent-ai/management-sdk";
import JSZip from "jszip";

export type EntityDefinition<T> = EntityExportDefinition<T> & EntityImportDefinition<T>;

export type EntityExportDefinition<T> = Readonly<{
  name: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (loadedEntities: T, zip: JSZip) => Promise<void>;
}>;

export type EntityImportDefinition<T> = Readonly<{
  name: string;
  deserializeEntities: (serialized: string) => T;
  importEntities: (
    client: ManagementClient,
    entities: T,
    context: ImportContext,
    zip: JSZip,
  ) => Promise<void | ImportContext>;
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
  contentTypeSnippetContextByOldIds: ReadonlyMap<
    string,
    Readonly<{
      selfId: string;
      elementIdsByOldIds: IdsMap;
      elementTypeByOldIds: ReadonlyMap<string, string>;
      multiChoiceOptionIdsByOldIdsByOldElementId: ReadonlyMap<string, IdsMap>;
    }>
  >;
  contentTypeContextByOldIds: ReadonlyMap<
    string,
    Readonly<{
      selfId: string;
      /**
       * This does have snippet elements inlined.
       */
      elementIdsByOldIds: IdsMap;
      /**
       * This does have snippet elements inlined.
       */
      elementTypeByOldIds: ReadonlyMap<string, string>;
      /**
       * This does have snippet elements inlined.
       */
      multiChoiceOptionIdsByOldIdsByOldElementId: ReadonlyMap<string, IdsMap>;
    }>
  >;
  contentItemContextByOldIds: ReadonlyMap<string, Readonly<{ selfId: string; oldTypeId: string }>>;
  workflowIdsByOldIds: ReadonlyMap<
    string,
    Readonly<{
      selfId: string;
      oldPublishedStepId: string;
      oldScheduledStepId: string;
      oldArchivedStepId: string;
      anyStepIdLeadingToPublishedStep: string;
    }>
  >;
  worfklowStepsIdsWithTransitionsByOldIds: ReadonlyMap<
    string,
    Readonly<{ selfId: string; oldTransitionIds: ReadonlyArray<string> }>
  >;
  contentTypeIdsWithElementsByOldIds: ReadonlyMap<string, Readonly<{ selfId: string; elementIdsByOldIds: IdsMap }>>;
  spaceIdsByOldIds: IdsMap;
}>;

type IdsMap = ReadonlyMap<string, string>;
