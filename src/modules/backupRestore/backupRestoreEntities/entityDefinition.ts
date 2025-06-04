import type { ManagementClient } from "@kontent-ai/management-sdk";
import type archiver from "archiver";
import type { StreamZipAsync } from "node-stream-zip";

import type { LogOptions } from "../../../log.js";

export type EntityDefinition<T> = EntityBackupDefinition<T> &
  EntityRestoreDefinition<T> &
  EntityCleanDefinition<T>;

// biome-ignore lint/suspicious/noExplicitAny: As the argument is in both covariant and contravariant position, it cannot be typed as unknown and as we want to allow all possible types, any is the only option
export type AnyEntityDefinition = EntityDefinition<any>;

export type EntityBackupDefinition<T> = Readonly<{
  name: string;
  displayName: string;
  fetchEntities: (client: ManagementClient) => Promise<T>;
  serializeEntities: (entities: T) => string;
  addOtherFiles?: (
    loadedEntities: T,
    archive: archiver.Archiver,
    secureAssetDeliveryKey: string | undefined,
    logOptions: LogOptions,
  ) => Promise<void>;
}>;

// biome-ignore lint/suspicious/noExplicitAny: As the argument is in both covariant and contravariant position, it cannot be typed as unknown and as we want to allow all possible types, any is the only option
export type AnyEntityBackupDefinition = EntityBackupDefinition<any>;

export type RestoreOptions = {
  excludeInactiveLanguages?: boolean;
};

type EntityRestoreParams<T> = {
  entities: T;
  context: RestoreContext;
  logOptions: LogOptions;
  zip: StreamZipAsync;
  options?: RestoreOptions;
};

export type EntityRestoreDefinition<T> = Readonly<{
  name: string;
  displayName: string;
  deserializeEntities: (serialized: string) => T;
  importEntities: (
    client: ManagementClient,
    params: EntityRestoreParams<T>,
  ) => Promise<undefined | RestoreContext>;
}>;

// biome-ignore lint/suspicious/noExplicitAny: As the argument is in both covariant and contravariant position, it cannot be typed as unknown and as we want to allow all possible types, any is the only option
export type AnyEntityRestoreDefinition = EntityRestoreDefinition<any>;

export type EntityCleanDefinition<T> = Readonly<{
  name: string;
  cleanEntities: (client: ManagementClient, entities: T, logOptions: LogOptions) => Promise<void>;
}>;

// biome-ignore lint/suspicious/noExplicitAny: As the argument is in both covariant and contravariant position, it cannot be typed as unknown and as we want to allow all possible types, any is the only option
export type AnyEntityCleanDefinition = EntityCleanDefinition<any>;

export type DependentRestoreAction<T> = Readonly<{
  dependentOnEntities: ReadonlyArray<AnyEntityDefinition>;
  action: (client: ManagementClient, entities: T, context: RestoreContext) => Promise<void>;
}>;

export type RestoreContext = Readonly<{
  collectionIdsByOldIds: ReadonlyMap<string, string>;
  languageIdsByOldIds: ReadonlyMap<string, string>;
  taxonomyGroupIdsByOldIds: IdsMap;
  taxonomyTermIdsByOldIds: IdsMap;
  assetFolderIdsByOldIds: IdsMap;
  assetIdsByOldIds: IdsMap;
  oldAssetCodenamesByIds: CodenamesMap;
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
  oldContentItemCodenamesByIds: CodenamesMap;
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

type CodenamesMap = ReadonlyMap<string, string>;
type IdsMap = ReadonlyMap<string, string>;
