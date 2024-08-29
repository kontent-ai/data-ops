import {
  AssetFolderSyncModel,
  CollectionSyncModel,
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
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
}>;
