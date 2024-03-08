import { ContentTypeContracts } from "@kontent-ai/management-sdk";

import { ContentTypeSyncModel } from "../types/fileContentModel.js";

export const transformContentTypeModel = (
  contentTypes: ReadonlyArray<ContentTypeContracts.IContentTypeContract>,
) => {
  // TODO
  contentTypes as never;

  return [] as ContentTypeSyncModel[];
};
