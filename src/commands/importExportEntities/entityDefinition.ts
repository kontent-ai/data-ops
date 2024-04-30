import { ManagementClient } from "@kontent-ai/management-sdk";
import archiver from "archiver";
import { StreamZipAsync } from "node-stream-zip";

import { LogOptions } from "../../log.js";
import { ExtractSelfId } from "../../utils/types.js";

export type EntityDefinition<T> = EntityExportDefinition<T> & EntityImportDefinition<T> & EntityCleanDefinition<T>;

export type EntityExportDefinition<T> = Readonly<{
  name: string;
  displayName: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (loadedEntities: T, archive: archiver.Archiver, logOptions: LogOptions) => Promise<void>;
}>;

export type EntityImportDefinition<T> = Readonly<{
  name: string;
  displayName: string;
  isDependentOn?: string;
  deserializeEntities: (serialized: string) => T;
  importEntities: (
    client: ManagementClient,
    entities: T,
    context: ImportContext,
    logOptions: LogOptions,
    zip: StreamZipAsync,
  ) => Promise<void | undefined | ImportContext>;
}>;

export type EntityCleanDefinition<T> = Readonly<{
  name: string;
  cleanEntities: (
    client: ManagementClient,
    entities: T,
    logOptions: LogOptions,
  ) => Promise<void>;
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
      oldDraftStepId: string; // TODO: Remove this once proper schedule is supported for export from MAPI
      anyStepIdLeadingToPublishedStep: string;
    }>
  >;
  workflowStepsIdsWithTransitionsByOldIds: ReadonlyMap<
    string,
    Readonly<{ selfId: string; oldTransitionIds: ReadonlyArray<string> }>
  >;
  spaceIdsByOldIds: IdsMap;
}>;

/**
 * Allows extracting a subset of `ImportContext` based on keys specified. Nested values in maps are simplified
 * (replaces object by its `selfId`).
 *
 * @template K - A subset of keys from `ImportContext` (defaults to all keys).
 *
 * @example type SimplifiedContext = ExtractRootEntityMaps<'workflowIdsByOldIds' | 'collectionIdsByOldIds'>;
 */
export type SimplifyContext<K extends keyof ImportContext = keyof ImportContext> = {
  -readonly [P in K]: ExtractSelfId<ImportContext[P]>;
};

type IdsMap = ReadonlyMap<string, string>;
