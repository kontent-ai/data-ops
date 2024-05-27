import { ContentTypeSnippetsSyncModel, ContentTypeSyncModel, TaxonomySyncModel } from "./syncModel.js";

export type FileContentModel = Readonly<{
  taxonomyGroups: ReadonlyArray<TaxonomySyncModel>;
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetsSyncModel>;
  contentTypes: ReadonlyArray<ContentTypeSyncModel>;
}>;
