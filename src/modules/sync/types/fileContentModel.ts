import type {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  LanguageSyncModel,
  LivePreviewSyncModel,
  SpaceSyncModel,
  TaxonomySyncModel,
  WorkflowSyncModel,
} from "./syncModel.js";

export type FileContentModel = Readonly<{
  taxonomies: ReadonlyArray<TaxonomySyncModel>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsSyncModel>;
  contentTypes: ReadonlyArray<ContentTypeSyncModel>;
  livePreview: LivePreviewSyncModel;
  assetFolders: ReadonlyArray<AssetFolderSyncModel>;
  collections: ReadonlyArray<CollectionSyncModel>;
  spaces: ReadonlyArray<SpaceSyncModel>;
  languages: ReadonlyArray<LanguageSyncModel>;
  workflows: ReadonlyArray<WorkflowSyncModel>;
}>;
