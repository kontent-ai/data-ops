import * as fs from "fs/promises";

import { contentTypesFileName, contentTypeSnippetsFileName, taxonomiesFileName } from "../constants/filename.js";
import {
  ContentTypeSnippetsSyncModel,
  ContentTypeSyncModel,
  FileContentModel,
  TaxonomySyncModel,
} from "../types/fileContentModel.js";

export const readContentModelFromFolder = async (folderName: string): Promise<FileContentModel> => {
  // in future we should use typeguard to check whether the content is valid
  const contentTypes = JSON.parse(
    await fs.readFile(`${folderName}/${contentTypesFileName}`, "utf8"),
  ) as unknown as ReadonlyArray<
    ContentTypeSyncModel
  >;
  const snippets = JSON.parse(
    await fs.readFile(`${folderName}/${contentTypeSnippetsFileName}`, "utf8"),
  ) as unknown as ReadonlyArray<
    ContentTypeSnippetsSyncModel
  >;
  const taxonomyGroups = JSON.parse(
    await fs.readFile(`${folderName}/${taxonomiesFileName}`, "utf8"),
  ) as unknown as ReadonlyArray<
    TaxonomySyncModel
  >;

  return {
    contentTypes,
    contentTypeSnippets: snippets,
    taxonomyGroups: taxonomyGroups,
  };
};
