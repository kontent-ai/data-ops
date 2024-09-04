import {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  LanguageSyncModel,
  SpaceSyncModel,
  TaxonomySyncModel,
  WebSpotlightSyncModel,
} from "./syncModel.js";

export type FileContentModel = Readonly<{
  taxonomyGroups: ReadonlyArray<TaxonomySyncModel>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsSyncModel>;
  contentTypes: ReadonlyArray<ContentTypeSyncModel>;
  webSpotlight: WebSpotlightSyncModel;
  assetFolders: ReadonlyArray<AssetFolderSyncModel>;
  collections: ReadonlyArray<CollectionSyncModel>;
  spaces: ReadonlyArray<SpaceSyncModel>;
  languages: ReadonlyArray<LanguageSyncModel>;
}>;
