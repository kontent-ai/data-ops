import { ContentTypeSnippetContracts } from "@kontent-ai/management-sdk";

import { ContentTypeSnippetsSyncModel } from "../types/fileContentModel.js";

export const transformContentTypeSnippetsModel = (
  contentTypeSnippets: ReadonlyArray<ContentTypeSnippetContracts.IContentTypeSnippetContract>,
) => {
  // TODO
  contentTypeSnippets as never;

  return [] as ContentTypeSnippetsSyncModel[];
};
